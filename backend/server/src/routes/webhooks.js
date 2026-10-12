/**
 * ADMA — Webhooks GeniusPay
 * ⚠️  Zéro migration : utilise kpay_external_id et kpay_payment_id
 */
import { Router } from 'express';
import { query, transaction } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyWebhookSignature } from '../services/geniusPayService.js';
import { notifySubscriptionActivated } from '../services/notificationService.js';
import { computePrice, computeNewLoyaltyMonths } from '../services/pricingService.js';
import { logger } from '../utils/logger.js';

const router    = Router();
const PLAN_DAYS = { premium: 30, professional: 30, enterprise: 30 };

router.post('/geniuspay', asyncHandler(async (req, res) => {
  const signature = req.headers['x-webhook-signature'] || '';
  const timestamp = req.headers['x-webhook-timestamp'] || '';
  const rawBody   = req.body; // Buffer

  // 1. Vérifier la signature
  if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
    logger.warn('Webhook GeniusPay: signature invalide');
    return res.status(401).json({ success: false, error: 'Signature invalide' });
  }

  // 2. Parser
  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (e) {
    logger.error('Webhook GeniusPay: JSON invalide', e.message);
    return res.status(400).json({ success: false, error: 'Payload invalide' });
  }

  logger.info('GeniusPay webhook reçu', {
    event:  payload.event,
    ref:    payload.data?.reference,
    status: payload.data?.status,
  });

  const handledEvents = [
    'payment.success',
    'payment.failed',
    'payment.cancelled',
    'payment.expired',
  ];
  if (!handledEvents.includes(payload.event)) {
    return res.json({ received: true, ignored: true });
  }

  const d           = payload.data || {};
  const reference   = d.reference;
  const amount      = d.amount;
  const metadata    = d.metadata || {};
  const plan        = metadata.plan;
  const externalRef = metadata.reference;

  if (!reference && !externalRef) {
    logger.warn('Webhook GeniusPay: identifiants manquants');
    return res.json({ received: true });
  }

  // 3. Transaction avec verrou
  let shouldNotify = null;

  await transaction(async (conn) => {
    const [[payment]] = await conn.execute(
      `SELECT * FROM payments
        WHERE (kpay_external_id = ? OR kpay_payment_id = ?)
        FOR UPDATE`,
      [reference, externalRef || reference]
    );

    if (!payment) {
      logger.info('Webhook GeniusPay: paiement inconnu', { reference, externalRef });
      return;
    }

    if (['completed', 'failed', 'cancelled'].includes(payment.status)) {
      logger.info('Webhook GeniusPay: déjà traité', { paymentId: payment.id });
      return;
    }

    // Vérif montant
    if (amount !== undefined && Number(amount) !== Number(payment.amount)) {
      logger.error('Webhook GeniusPay: montant mismatch', {
        paymentId:      payment.id,
        expectedAmount: payment.amount,
        receivedAmount: amount,
      });
      await conn.execute(
        'UPDATE payments SET status="failed", failure_reason=? WHERE id=?',
        ['Montant différent', payment.id]
      );
      return;
    }

    // ── SUCCESS ────────────────────────────────────────────────
    if (payload.event === 'payment.success') {
      const planKey = plan || payment.plan_intent;
      if (!planKey) {
        logger.error('Webhook GeniusPay: plan_intent manquant', { paymentId: payment.id });
        return;
      }

      await conn.execute(
        `UPDATE payments
            SET status="completed",
                webhook_received_at=NOW(),
                kpay_external_id = COALESCE(kpay_external_id, ?)
          WHERE id=?`,
        [reference, payment.id]
      );

      const [[prov]] = await conn.execute(
        'SELECT id, user_id, loyalty_months, plan_expires_at FROM providers WHERE id=?',
        [payment.provider_id]
      );
      if (!prov) {
        logger.error('Webhook GeniusPay: provider introuvable', {
          providerId: payment.provider_id,
        });
        return;
      }

      const newLoyaltyMonths = computeNewLoyaltyMonths(prov);
      const pricing          = computePrice(planKey, prov.loyalty_months || 0);

      const days       = PLAN_DAYS[planKey] || 30;
      const endDate    = new Date();
      endDate.setDate(endDate.getDate() + days);
      const endDateStr = endDate.toISOString().slice(0, 10);

      const [sub] = await conn.execute(
        `INSERT INTO subscriptions
           (provider_id, plan, amount, base_amount, discount_percent, start_date, end_date)
         VALUES (?,?,?,?,?,CURDATE(),?)`,
        [
          payment.provider_id,
          planKey,
          payment.amount,
          pricing.basePrice,
          pricing.discountPercent,
          endDateStr,
        ]
      );

      await conn.execute(
        `UPDATE providers
            SET plan=?, plan_expires_at=?, loyalty_months=?, last_renewal_at=NOW()
          WHERE id=?`,
        [planKey, endDate, newLoyaltyMonths, payment.provider_id]
      );

      await conn.execute(
        'UPDATE payments SET subscription_id=? WHERE id=?',
        [sub.insertId, payment.id]
      );

      shouldNotify = { userId: prov.user_id, plan: planKey };
    }

    // ── FAILED / CANCELLED / EXPIRED ───────────────────────────
    if (['payment.failed', 'payment.cancelled', 'payment.expired'].includes(payload.event)) {
      const newStatus = payload.event === 'payment.cancelled' ? 'cancelled' : 'failed';
      await conn.execute(
        `UPDATE payments
            SET status=?,
                failure_reason=?,
                webhook_received_at=NOW(),
                kpay_external_id = COALESCE(kpay_external_id, ?)
          WHERE id=?`,
        [newStatus, `GeniusPay: ${payload.event}`, reference, payment.id]
      );
      logger.info('GeniusPay: paiement ' + newStatus, { paymentId: payment.id });
    }
  });

  if (shouldNotify) {
    notifySubscriptionActivated(shouldNotify.userId, shouldNotify.plan).catch(() => {});
  }

  res.json({ received: true });
}));

export default router;