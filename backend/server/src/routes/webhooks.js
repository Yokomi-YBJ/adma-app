import { Router } from 'express';
import { query, transaction } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyWebhookSignature } from '../services/kpayService.js';
import { notifySubscriptionActivated } from '../services/notificationService.js';
import { computePrice, computeNewLoyaltyMonths } from '../services/pricingService.js';
import { logger } from '../utils/logger.js';

const router = Router();
const PLAN_DAYS = { premium: 30, professional: 30, enterprise: 30 };

router.post('/kpay', asyncHandler(async (req, res) => {
  const signature = req.headers['x-kpay-signature'] || '';
  const rawBody   = req.body;

  // 1. Signature HMAC
  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn('Webhook KPay: signature invalide');
    return res.status(401).json({ error: 'Signature invalide' });
  }

  // 2. Parse
  let event;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Payload invalide' });
  }

  logger.info('KPay webhook reçu', { type: event.type });

  // 3. Type d'événement
  if (!['collection.successful', 'payment.completed'].includes(event.type)) {
    return res.json({ received: true });
  }

  const externalId = event.data?.external_id;
  const kpayId     = event.data?.id;
  const eventAmount = event.data?.amount;

  if (!externalId && !kpayId) {
    logger.warn('Webhook KPay: identifiants manquants');
    return res.json({ received: true });
  }

  // 4. Traitement dans une transaction avec FOR UPDATE (anti-race)
  let shouldNotify = null;

  await transaction(async (conn) => {
    // ── SELECT FOR UPDATE : verrouille la ligne, le 2e webhook attendra ──
    const [[payment]] = await conn.execute(
      `SELECT * FROM payments
       WHERE (kpay_external_id = ? OR kpay_payment_id = ?)
       FOR UPDATE`,
      [externalId, kpayId]
    );

    if (!payment) {
      logger.info('Webhook KPay: paiement inconnu', { externalId, kpayId });
      return;
    }

    // ── Idempotence : si déjà traité, on sort ──
    if (payment.status === 'completed') {
      logger.info('Webhook KPay: paiement déjà traité, ignoré', { paymentId: payment.id });
      return;
    }

    // ── Vérification du montant (sécurité) ──
    if (eventAmount !== undefined && Number(eventAmount) !== Number(payment.amount)) {
      logger.error('Webhook KPay: montant mismatch', {
        paymentId:       payment.id,
        expectedAmount:  payment.amount,
        receivedAmount:  eventAmount,
      });
      // On marque comme failed pour éviter toute exploitation
      await conn.execute(
        'UPDATE payments SET status="failed", failure_reason=? WHERE id=?',
        ['Montant différent de celui attendu', payment.id]
      );
      return;
    }

    // ── Plan ──
    const plan = payment.plan_intent;
    if (!plan) {
      logger.error('Webhook KPay: plan_intent manquant', { paymentId: payment.id });
      return;
    }

    // ── Marquer comme complété ──
    await conn.execute(
      'UPDATE payments SET status="completed", webhook_received_at=NOW() WHERE id=?',
      [payment.id]
    );

    // ── Récupérer le prestataire ──
    const [[prov]] = await conn.execute(
      'SELECT id, user_id, loyalty_months, plan_expires_at FROM providers WHERE id=?',
      [payment.provider_id]
    );
    if (!prov) {
      logger.error('Webhook KPay: provider introuvable', { providerId: payment.provider_id });
      return;
    }

    // ── Fidélité ──
    const newLoyaltyMonths = computeNewLoyaltyMonths(prov);
    const pricing          = computePrice(plan, prov.loyalty_months || 0);

    // ── Souscription ──
    const days    = PLAN_DAYS[plan] || 30;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    const endDateStr = endDate.toISOString().slice(0, 10);

    const [sub] = await conn.execute(
      `INSERT INTO subscriptions
         (provider_id, plan, amount, base_amount, discount_percent, start_date, end_date)
       VALUES (?,?,?,?,?,CURDATE(),?)`,
      [
        payment.provider_id,
        plan,
        payment.amount,
        pricing.basePrice,
        pricing.discountPercent,
        endDateStr,
      ]
    );

    // ── Mise à jour du prestataire ──
    await conn.execute(
      `UPDATE providers
         SET plan=?, plan_expires_at=?, loyalty_months=?, last_renewal_at=NOW()
       WHERE id=?`,
      [plan, endDate, newLoyaltyMonths, payment.provider_id]
    );

    // ── Lien payment → subscription ──
    await conn.execute(
      'UPDATE payments SET subscription_id=? WHERE id=?',
      [sub.insertId, payment.id]
    );

    shouldNotify = { userId: prov.user_id, plan };
  });

  // 5. Notification hors transaction (non bloquante)
  if (shouldNotify) {
    notifySubscriptionActivated(shouldNotify.userId, shouldNotify.plan).catch(() => {});
  }

  res.json({ received: true });
}));

export default router;