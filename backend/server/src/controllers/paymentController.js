/**
 * ADMA — Contrôleur paiement (GeniusPay)
 * ✅ Gestion downgrade différé (Stratégie A)
 * ✅ Priorité à la BD locale pour le statut
 * ✅ Validation planId côté serveur
 * ✅ Stockage phone_number + mobile_operator
 */
import crypto from 'crypto';
import { query } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import {
  initiatePayment as gpInitiate,
  verifyPayment   as gpVerify,
} from '../services/geniusPayService.js';
import {
  computePrice,
  isDowngrade,
  isUpgrade,
} from '../services/pricingService.js';
import {
  scheduleDowngrade,
  getPendingPlanChange,
  cancelScheduledDowngrade,
} from '../services/subscriptionService.js';

// ✅ #6 : Validation stricte des plans
const VALID_PLANS    = ['premium', 'professional', 'enterprise'];
const VALID_OPERATORS = ['orange_cmr', 'mtn_momo_cmr'];

// ── POST /payments/initiate ─────────────────────────────────────
export const initPayment = asyncHandler(async (req, res) => {
  const { planId, operator, phoneNumber } = req.body;

  // ✅ #6 : Validation côté serveur (source de vérité)
  if (!VALID_PLANS.includes(planId)) {
    throw new AppError(`Plan invalide : ${planId}`, 400, 'INVALID_PLAN');
  }
  if (!VALID_OPERATORS.includes(operator)) {
    throw new AppError(`Opérateur invalide : ${operator}`, 400, 'INVALID_OPERATOR');
  }
  if (!/^(\+?237)?6[5-9]\d{7}$/.test(phoneNumber.replace(/\s/g, ''))) {
    throw new AppError('Numéro camerounais invalide', 400, 'INVALID_PHONE');
  }

  // 1. Récupérer le prestataire
  const [provRows] = await query(
    `SELECT id, plan, plan_expires_at, loyalty_months
       FROM providers
      WHERE user_id=? AND is_active=TRUE
      LIMIT 1`,
    [req.user.id]
  );

  if (!provRows.length) {
    throw new AppError('Aucune fiche prestataire active', 404, 'NO_PROVIDER');
  }

  const provider      = provRows[0];
  const providerId    = provider.id;
  const currentPlan   = provider.plan || 'free';
  const currentExpiry = provider.plan_expires_at;
  const loyaltyMonths = provider.loyalty_months || 0;

  // 2. Détection downgrade
  const hasActivePlan  = currentExpiry && new Date(currentExpiry) > new Date();
  const isDowngradeReq = isDowngrade(currentPlan, planId) && hasActivePlan;

  if (isDowngradeReq) {
    const schedule = await scheduleDowngrade(
      providerId,
      planId,
      currentExpiry,
      req.user.id   // ✅ #11 : passer userId pour notification
    );

    logger.info('Downgrade programmé', {
      userId:      req.user.id,
      providerId,
      currentPlan,
      newPlan:     planId,
      effectiveAt: schedule.effectiveAt,
    });

    return res.status(202).json({
      success:   true,
      scheduled: true,
      message:
        `Vous restez sur le plan ${currentPlan} jusqu'au ` +
        `${new Date(currentExpiry).toLocaleDateString('fr-FR')}. ` +
        `Le passage à ${planId} prendra effet automatiquement à cette date.`,
      data: {
        currentPlan,
        newPlan:       planId,
        effectiveAt:   schedule.effectiveAt,
        currentExpiry: currentExpiry,
      },
    });
  }

  // 3. UPGRADE ou RENOUVELLEMENT
  const pricing = computePrice(planId, loyaltyMonths);
  const amount  = pricing.finalPrice;

  if (!Number.isInteger(amount) || amount < 200) {
    throw new AppError('Montant invalide', 400, 'INVALID_AMOUNT');
  }

  const externalRef = `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  // ✅ #7 : Stocker phone_number + mobile_operator + currency en XOF
  const [insert] = await query(
    `INSERT INTO payments
       (provider_id, amount, currency, status, plan_intent,
        kpay_external_id, phone_number, mobile_operator)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      providerId,
      amount,
      'XOF',
      'pending',
      planId,
      externalRef,
      phoneNumber,
      operator,
    ]
  );
  const paymentDbId = insert.insertId;

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

  await query(
    'UPDATE payments SET kpay_external_id=?, kpay_payment_id=? WHERE id=?',
    [gp.reference, String(gp.paymentId || ''), paymentDbId]
  );

  const paymentType = isUpgrade(currentPlan, planId) ? 'UPGRADE' : 'RENEWAL';

  logger.info('Paiement initié', {
    paymentId: paymentDbId,
    reference: gp.reference,
    amount,
    plan:      planId,
    operator,
    type:      paymentType,
  });

  res.status(201).json({
    success:   true,
    scheduled: false,
    data: {
      paymentId:   gp.reference,
      reference:   gp.reference,
      amount,
      currency:    'XOF',
      status:      gp.status,
      // ✅ #15 : Les 2 URLs séparées
      paymentUrl:  gp.paymentUrl,
      checkoutUrl: gp.checkoutUrl || gp.paymentUrl,
      // ✅ #13 : Date d'expiration pour le frontend
      expiresAt:   gp.expiresAt,
    },
  });
});

// ── GET /payments/pending-plan ──────────────────────────────────
export const getPendingPlan = asyncHandler(async (req, res) => {
  const [provRows] = await query(
    'SELECT id FROM providers WHERE user_id=? LIMIT 1',
    [req.user.id]
  );

  if (!provRows.length) {
    return res.json({ success: true, data: null });
  }

  const pending = await getPendingPlanChange(provRows[0].id);
  res.json({ success: true, data: pending });
});

// ── DELETE /payments/pending-plan ───────────────────────────────
export const cancelPendingPlan = asyncHandler(async (req, res) => {
  const [provRows] = await query(
    'SELECT id FROM providers WHERE user_id=? LIMIT 1',
    [req.user.id]
  );

  if (!provRows.length) {
    throw new AppError('Provider introuvable', 404, 'NO_PROVIDER');
  }

  const cancelled = await cancelScheduledDowngrade(
    provRows[0].id,
    req.user.id   // ✅ #11 : passer userId
  );

  logger.info('Annulation downgrade', {
    providerId: provRows[0].id,
    cancelled,
  });

  res.json({
    success: true,
    cancelled,
    message: cancelled ? 'Changement annulé' : 'Aucun changement programmé',
  });
});

// ── GET /payments/history ───────────────────────────────────────
export const getHistory = asyncHandler(async (req, res) => {
  const [provRows] = await query(
    'SELECT id FROM providers WHERE user_id=? LIMIT 1',
    [req.user.id]
  );
  if (!provRows.length) return res.json({ success: true, data: [] });

  const [rows] = await query(
    `SELECT p.id, p.amount, p.currency, p.status, p.plan_intent,
            p.phone_number, p.mobile_operator, p.failure_reason,
            p.created_at, p.updated_at,
            s.plan AS subscription_plan, s.start_date, s.end_date
       FROM payments p
       LEFT JOIN subscriptions s ON s.id = p.subscription_id
      WHERE p.provider_id = ?
      ORDER BY p.created_at DESC
      LIMIT 50`,
    [provRows[0].id]
  );

  res.json({ success: true, data: rows });
});

// ── GET /payments/:id/status ────────────────────────────────────
export const getStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

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

  // Priorité à la BD locale
  if (['completed', 'failed', 'cancelled', 'refunded'].includes(payment.status)) {
    return res.json({
      success: true,
      data: {
        id:       payment.kpay_external_id,
        status:   payment.status,
        amount:   payment.amount,
        currency: 'XOF',
        paidAt:   payment.updated_at,
      },
    });
  }

  try {
    const gp = await gpVerify(payment.kpay_external_id);

    if (gp.status !== payment.status) {
      await query('UPDATE payments SET status=? WHERE id=?', [gp.status, payment.id]);
    }

    return res.json({
      success: true,
      data: {
        id:       gp.reference,
        status:   gp.status,
        amount:   gp.amount,
        currency: 'XOF',
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
        currency: 'XOF',
        paidAt:   null,
      },
    });
  }
});