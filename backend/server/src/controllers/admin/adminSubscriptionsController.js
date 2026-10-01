/**
 * ADMA — Contrôleur Abonnements Admin
 */
import { query } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function getSubscriptions(req, res) {
  const { plan, status, q, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conds = ['1=1'];
  const params = [];

  if (plan && plan !== 'all') {
    conds.push('s.plan = ?');
    params.push(plan);
  }

  if (status && status !== 'all') {
    conds.push('s.status = ?');
    params.push(status);
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    conds.push('(p.name LIKE ? OR u.phone LIKE ?)');
    params.push(term, term);
  }

  const where = conds.join(' AND ');

  const [subscriptions] = await query(
    `SELECT s.*,
            p.name AS provider_name, p.specialty AS provider_specialty,
            u.phone AS user_phone, CONCAT(u.first_name, ' ', u.last_name) AS user_name
     FROM subscriptions s
     JOIN providers p ON p.id = s.provider_id
     JOIN users u ON u.id = p.user_id
     WHERE ${where}
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  const [[{ total }]] = await query(
    `SELECT COUNT(*) AS total
     FROM subscriptions s
     JOIN providers p ON p.id = s.provider_id
     JOIN users u ON u.id = p.user_id
     WHERE ${where}`,
    params
  );

  res.json({
    success: true,
    data: {
      subscriptions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    },
  });
}

export async function manualActivateSubscription(req, res) {
  const { providerId, plan, days = 30 } = req.body;

  const [prov] = await query('SELECT id, name FROM providers WHERE id = ?', [providerId]);
  if (!prov.length) throw new AppError('Prestataire introuvable', 404, 'NOT_FOUND');

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + parseInt(days, 10));
  const endStr = endDate.toISOString().slice(0, 10);

  // Clôturer les anciens abonnements actifs
  await query(
    "UPDATE subscriptions SET status = 'expired' WHERE provider_id = ? AND status = 'active'",
    [providerId]
  );

  await query(
    `INSERT INTO subscriptions (provider_id, plan, amount, start_date, end_date, status, activated_by)
     VALUES (?, ?, 0, CURDATE(), ?, 'active', 'admin')`,
    [providerId, plan, endStr]
  );

  await query(
    'UPDATE providers SET plan = ?, plan_expires_at = ? WHERE id = ?',
    [plan, endDate, providerId]
  );

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, 'subscription_activate', 'provider', providerId, JSON.stringify({ plan, days, providerName: prov[0].name })]
  );

  res.json({
    success: true,
    message: `Plan ${plan} activé avec succès pour ${days} jours pour ${prov[0].name}`,
  });
}

export async function cancelSubscription(req, res) {
  const { id } = req.params;

  const [sub] = await query('SELECT * FROM subscriptions WHERE id = ?', [id]);
  if (!sub.length) throw new AppError('Abonnement introuvable', 404, 'NOT_FOUND');

  const currentSub = sub[0];

  await query(
    "UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?",
    [id]
  );

  await query(
    "UPDATE providers SET plan = 'free', plan_expires_at = NULL WHERE id = ?",
    [currentSub.provider_id]
  );

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'subscription_cancel', 'subscription', id]
  );

  res.json({ success: true, message: 'Abonnement annulé avec succès' });
}
