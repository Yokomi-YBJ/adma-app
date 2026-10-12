/**
 * ADMA — Contrôleur paiement (GeniusPay)
 * ⚠️  Zéro migration : on réutilise kpay_external_id et kpay_payment_id
 */
import crypto from 'crypto';
import { query } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import {
  initiatePayment as gpInitiate,
  verifyPayment   as gpVerify,
} from '../services/geniusPayService.js';
import { computePrice } from '../services/pricingService.js';

// ── POST /payments/initiate ─────────────────────────────────────
export const initPayment = asyncHandler(async (req, res) => {
  const { planId, operator, phoneNumber } = req.body;

  // 1. Récupérer le prestataire
  const [provRows] = await query(
    'SELECT id, loyalty_months FROM providers WHERE user_id=? AND is_active=TRUE LIMIT 1',
    [req.user.id]
  );
  if (!provRows.length) {
    throw new AppError('Aucune fiche prestataire active', 404, 'NO_PROVIDER');
  }
  const providerId    = provRows[0].id;
  const loyaltyMonths = provRows[0].loyalty_months || 0;

  // 2. Prix côté serveur (source de vérité)
  const pricing = computePrice(planId, loyaltyMonths);
  const amount  = pricing.finalPrice;

  if (!Number.isInteger(amount) || amount < 200) {
    throw new AppError('Montant invalide', 400, 'INVALID_AMOUNT');
  }

  // 3. Référence externe unique
  const externalRef = `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  // 4. Enregistrer le paiement en base — on utilise kpay_external_id
  const [insert] = await query(
    `INSERT INTO payments
       (provider_id, amount, status, plan_intent, kpay_external_id)
     VALUES (?,?,?,?,?)`,
    [providerId, amount, 'pending', planId, externalRef]
  );
  const paymentDbId = insert.insertId;

  // 5. Appeler GeniusPay
  let gp;
  try {
    gp = await gpInitiate({
      amount,
      phone:     phoneNumber,
      operator,
      plan:      planId,
      reference: externalRef,
    });
  } catch (err) {
    await query(
      'UPDATE payments SET status="failed", failure_reason=? WHERE id=?',
      [err.message, paymentDbId]
    );
    throw err;
  }

  // 6. Sauvegarder la référence GeniusPay dans kpay_external_id
  //    et l'id interne dans kpay_payment_id
  await query(
    'UPDATE payments SET kpay_external_id=?, kpay_payment_id=? WHERE id=?',
    [gp.reference, String(gp.paymentId || ''), paymentDbId]
  );

  logger.info('Paiement initié', {
    paymentId: paymentDbId,
    reference: gp.reference,
    amount,
    plan:      planId,
    operator,
  });

  res.status(201).json({
    success: true,
    data: {
      paymentId:  gp.reference,       // référence MTX-... (pour le polling)
      reference:  gp.reference,
      amount,
      currency:   'XAF',
      status:     gp.status,
      paymentUrl: gp.paymentUrl,
    },
  });
});

// ── GET /payments/:id/status ────────────────────────────────────
export const getStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // On cherche par référence GeniusPay OU par référence externe
  const [rows] = await query(
    `SELECT p.*, pr.user_id
       FROM payments p
       JOIN providers pr ON pr.id = p.provider_id
      WHERE p.kpay_external_id = ?
         OR p.kpay_payment_id  = ?
      LIMIT 1`,
    [id, id]
  );

  if (!rows.length) {
    throw new AppError('Paiement introuvable', 404, 'PAYMENT_NOT_FOUND');
  }

  const payment = rows[0];

  if (payment.user_id !== req.user.id) {
    throw new AppError('Accès refusé', 403, 'FORBIDDEN');
  }

  // Déjà finalisé → on renvoie direct
  if (['completed', 'failed', 'cancelled'].includes(payment.status)) {
    return res.json({
      success: true,
      data: {
        id:       payment.kpay_external_id,
        status:   payment.status,
        amount:   payment.amount,
        currency: 'XAF',
        paidAt:   payment.updated_at,
      },
    });
  }

  // Sinon interroger GeniusPay
  try {
    const gp = await gpVerify(payment.kpay_external_id);

    if (gp.status !== payment.status) {
      await query(
        'UPDATE payments SET status=? WHERE id=?',
        [gp.status, payment.id]
      );
    }

    return res.json({
      success: true,
      data: {
        id:       gp.reference,
        status:   gp.status,
        amount:   gp.amount,
        currency: 'XAF',
        paidAt:   gp.paidAt,
      },
    });
  } catch (err) {
    logger.warn('Vérif GeniusPay échouée', {
      reference: payment.kpay_external_id,
      error:     err.message,
    });
    return res.json({
      success: true,
      data: {
        id:       payment.kpay_external_id,
        status:   payment.status,
        amount:   payment.amount,
        currency: 'XAF',
        paidAt:   null,
      },
    });
  }
});