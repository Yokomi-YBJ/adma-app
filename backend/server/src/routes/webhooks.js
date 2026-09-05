import { Router } from 'express';
import { query, transaction } from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyWebhookSignature } from '../services/kpayService.js';
import { notifySubscriptionActivated } from '../services/notificationService.js';
import { logger } from '../utils/logger.js';

const router = Router();

const PLAN_FROM_AMOUNT = { 1000: 'premium', 2500: 'professional', 5000: 'enterprise' };
const PLAN_DAYS        = { premium: 30, professional: 30, enterprise: 30 };

router.post('/kpay', asyncHandler(async (req, res) => {
  const signature = req.headers['x-kpay-signature'] || '';
  const rawBody   = req.body;

  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn('Webhook KPay: signature invalide');
    return res.status(401).json({ error: 'Signature invalide' });
  }

  const event = JSON.parse(rawBody.toString());
  logger.info('KPay webhook reçu', { type: event.type });

  if (['collection.successful','payment.completed'].includes(event.type)) {
    const externalId = event.data?.external_id;
    const kpayId     = event.data?.id;

    const [rows] = await query(
      'SELECT * FROM payments WHERE (kpay_external_id=? OR kpay_payment_id=?) AND status != "completed"',
      [externalId, kpayId]
    );
    if (!rows.length) return res.json({ received: true });

    const payment = rows[0];
    await transaction(async (conn) => {
      await conn.execute(
        'UPDATE payments SET status="completed", webhook_received_at=NOW() WHERE id=?',
        [payment.id]
      );
      const plan = PLAN_FROM_AMOUNT[payment.amount];
      if (!plan) return;

      const days    = PLAN_DAYS[plan] || 30;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);
      const endDateStr = endDate.toISOString().slice(0, 10);

      const [sub] = await conn.execute(
        "INSERT INTO subscriptions (provider_id, plan, amount, start_date, end_date) VALUES (?,?,?,CURDATE(),?)",
        [payment.provider_id, plan, payment.amount, endDateStr]
      );
      await conn.execute(
        'UPDATE providers SET plan=?, plan_expires_at=? WHERE id=?',
        [plan, endDate, payment.provider_id]
      );
      await conn.execute(
        'UPDATE payments SET subscription_id=? WHERE id=?',
        [sub.insertId, payment.id]
      );

      const [prov] = await conn.execute('SELECT user_id FROM providers WHERE id=?', [payment.provider_id]);
      if (prov.length) notifySubscriptionActivated(prov[0].user_id, plan).catch(() => {});
    });
  }

  res.json({ received: true });
}));

export default router;
