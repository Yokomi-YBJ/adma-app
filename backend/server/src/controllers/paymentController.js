/**
 * ADMA — Contrôleur Paiements
 *
 * Sécurité :
 * - Idempotence : un paiement pending < 5 min n'est pas dupliqué
 * - Rate limiting via middleware sur /initiate
 * - Vérification du montant côté webhook
 * - Anti-polling KPay excessif
 */
import { v4 as uuid } from 'uuid';
import { query } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { initiatePayment, verifyPayment } from '../services/kpayService.js';
import { computePrice } from '../services/pricingService.js';
import { logger } from '../utils/logger.js';

const PLANS = ['premium', 'professional', 'enterprise'];

// Délai pendant lequel un paiement pending bloquer une nouvelle tentative (5 min)
const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000;

// Délai avant de vérifier manuellement auprès de KPay (30s après création)
const MANUAL_VERIFY_AFTER_MS = 30 * 1000;

// ── POST /api/v1/payments/initiate ─────────────────────────────
export const initPayment = asyncHandler(async (req, res) => {
  const { planId, operator, phoneNumber } = req.body;

  if (!PLANS.includes(planId)) {
    throw new AppError('Plan invalide', 400, 'INVALID_PLAN');
  }

  const [provs] = await query(
    'SELECT id, loyalty_months FROM providers WHERE user_id=? AND is_active=TRUE AND deleted_at IS NULL',
    [req.user.id]
  );
  if (!provs.length) throw new AppError('Aucune fiche prestataire', 404, 'NO_PROVIDER');

  const provider = provs[0];

  // ── Idempotence : chercher un paiement pending récent pour le même plan ──
  const idempotencyCutoff = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS);
  const [existing] = await query(
    `SELECT id, kpay_payment_id, status, amount, kpay_external_id
     FROM payments
     WHERE provider_id = ?
       AND plan_intent = ?
       AND status IN ('pending', 'processing')
       AND created_at > ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [provider.id, planId, idempotencyCutoff]
  );

  if (existing.length) {
    logger.info('initPayment: paiement pending existant réutilisé', {
      userId: req.user.id,
      planId,
      existingPaymentId: existing[0].id,
    });

    return res.json({
      success: true,
      data: {
        paymentId:     existing[0].id,
        kpayPaymentId: existing[0].kpay_payment_id,
        status:        existing[0].status,
        amount:        existing[0].amount,
        pricing:       computePrice(planId, provider.loyalty_months || 0),
        reused:        true,
      },
    });
  }

  // ── Nouveau paiement ──────────────────────────────────────────
  const pricing   = computePrice(planId, provider.loyalty_months || 0);
  const amount    = pricing.finalPrice;
  const reference = `ADMA-${uuid().slice(0, 12).toUpperCase()}`;

  const [pay] = await query(
    `INSERT INTO payments
       (provider_id, plan_intent, kpay_external_id, amount, mobile_operator, phone_number, status)
     VALUES (?,?,?,?,?,?,'pending')`,
    [provider.id, planId, reference, amount, operator, phoneNumber]
  );

  try {
    const kres = await initiatePayment({
      amount,
      phone: phoneNumber,
      plan: planId,
      reference,
    });

    await query(
      'UPDATE payments SET kpay_payment_id=?, status=? WHERE id=?',
      [kres.paymentId, kres.status, pay.insertId]
    );

    res.json({
      success: true,
      data: {
        paymentId:     pay.insertId,
        kpayPaymentId: kres.paymentId,
        status:        kres.status,
        amount,
        pricing,
        reused:        false,
      },
    });
  } catch (err) {
    await query('UPDATE payments SET status="failed" WHERE id=?', [pay.insertId]);
    throw err;
  }
});

// ── GET /api/v1/payments/:id/status ────────────────────────────
export const getStatus = asyncHandler(async (req, res) => {
  const [rows] = await query(
    `SELECT pay.*, prov.user_id
     FROM payments pay
     JOIN providers prov ON prov.id = pay.provider_id
     WHERE pay.id = ?`,
    [req.params.id]
  );

  if (!rows.length || rows[0].user_id !== req.user.id) {
    throw new AppError('Paiement introuvable', 404, 'NOT_FOUND');
  }

  const payment = rows[0];

  // 1. Statut définitif → retour immédiat, jamais d'appel KPay
  if (['completed', 'failed', 'cancelled'].includes(payment.status)) {
    return res.json({ success: true, data: { status: payment.status } });
  }

  // 2. Webhook déjà reçu → on fait confiance à la BDD (source de vérité)
  if (payment.webhook_received_at) {
    return res.json({ success: true, data: { status: payment.status } });
  }

  // 3. Fallback : après 30s sans webhook, on interroge KPay UNE fois
  const ageMs = Date.now() - new Date(payment.created_at).getTime();
  if (ageMs > MANUAL_VERIFY_AFTER_MS && payment.kpay_payment_id) {
    try {
      const kres = await verifyPayment(payment.kpay_payment_id);
      if (kres.status !== payment.status) {
        await query('UPDATE payments SET status=? WHERE id=?', [kres.status, req.params.id]);
        logger.info('getStatus: statut mis à jour via KPay direct', {
          paymentId: req.params.id,
          from: payment.status,
          to: kres.status,
        });
      }
      return res.json({ success: true, data: { status: kres.status } });
    } catch (err) {
      logger.warn('getStatus: verifyPayment échoué, fallback sur BDD', {
        paymentId: req.params.id,
        err: err.message,
      });
      // On ne bloque pas : on renvoie le statut actuel (pending)
    }
  }

  // 4. Statut actuel (pending)
  res.json({ success: true, data: { status: payment.status } });
});