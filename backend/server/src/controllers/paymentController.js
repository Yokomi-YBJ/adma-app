import { v4 as uuid } from 'uuid';
import { query, transaction } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { initiatePayment, verifyPayment } from '../services/kpayService.js';

const PRICES = { premium: 1000, professional: 2500, enterprise: 5000 };
const PLANS  = Object.keys(PRICES);

export const initPayment = asyncHandler(async (req, res) => {
  const { planId, operator, phoneNumber } = req.body;
  if (!PLANS.includes(planId)) throw new AppError('Plan invalide', 400, 'INVALID_PLAN');

  const [provs] = await query('SELECT id FROM providers WHERE user_id=? AND is_active=TRUE', [req.user.id]);
  if (!provs.length) throw new AppError('Aucune fiche prestataire', 404, 'NO_PROVIDER');

  const amount    = PRICES[planId];
  const reference = `ADMA-${uuid().slice(0,12).toUpperCase()}`;

  const [pay] = await query(
    'INSERT INTO payments (provider_id, kpay_external_id, amount, mobile_operator, phone_number, status) VALUES (?,?,?,?,?,"pending")',
    [provs[0].id, reference, amount, operator, phoneNumber]
  );

  try {
    const kres = await initiatePayment({ amount, phone: phoneNumber, plan: planId, reference });
    await query('UPDATE payments SET kpay_payment_id=?, status=? WHERE id=?', [kres.paymentId, kres.status, pay.insertId]);
    res.json({ success: true, data: { paymentId: pay.insertId, kpayPaymentId: kres.paymentId, status: kres.status } });
  } catch (err) {
    await query('UPDATE payments SET status="failed" WHERE id=?', [pay.insertId]);
    throw err;
  }
});

export const getStatus = asyncHandler(async (req, res) => {
  const [rows] = await query(
    `SELECT pay.*, prov.user_id FROM payments pay
     JOIN providers prov ON prov.id=pay.provider_id WHERE pay.id=?`, [req.params.id]
  );
  if (!rows.length || rows[0].user_id !== req.user.id) {
    throw new AppError('Paiement introuvable', 404, 'NOT_FOUND');
  }
  if (rows[0].status === 'completed') return res.json({ success: true, data: { status: 'completed' } });

  if (rows[0].kpay_payment_id) {
    const kres = await verifyPayment(rows[0].kpay_payment_id);
    if (kres.status !== rows[0].status) {
      await query('UPDATE payments SET status=? WHERE id=?', [kres.status, req.params.id]);
    }
    return res.json({ success: true, data: { status: kres.status } });
  }
  res.json({ success: true, data: { status: rows[0].status } });
});
