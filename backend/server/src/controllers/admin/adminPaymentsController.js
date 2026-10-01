/**
 * ADMA — Contrôleur Paiements Admin
 */
import { query } from '../../config/database.js';

export async function getPayments(req, res) {
  const { status = 'all', operator, q, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conds = ['1=1'];
  const params = [];

  if (status && status !== 'all') {
    conds.push('pay.status = ?');
    params.push(status);
  }

  if (operator && operator !== 'all') {
    conds.push('pay.mobile_operator = ?');
    params.push(operator);
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    conds.push('(pay.phone_number LIKE ? OR pay.kpay_reference LIKE ? OR p.name LIKE ?)');
    params.push(term, term, term);
  }

  const where = conds.join(' AND ');

  const [payments] = await query(
    `SELECT pay.*,
            p.name AS provider_name, p.plan AS provider_plan,
            u.phone AS user_phone, CONCAT(u.first_name, ' ', u.last_name) AS user_name
     FROM payments pay
     JOIN providers p ON p.id = pay.provider_id
     JOIN users u ON u.id = p.user_id
     WHERE ${where}
     ORDER BY pay.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  const [[{ total }]] = await query(
    `SELECT COUNT(*) AS total
     FROM payments pay
     JOIN providers p ON p.id = pay.provider_id
     WHERE ${where}`,
    params
  );

  const [[summary]] = await query(
    `SELECT COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) AS total_success,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) AS count_success,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) AS count_failed,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) AS count_pending
     FROM payments`
  );

  res.json({
    success: true,
    data: {
      payments,
      summary: {
        totalSuccess: Number(summary.total_success),
        countSuccess: Number(summary.count_success),
        countFailed: Number(summary.count_failed),
        countPending: Number(summary.count_pending),
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    },
  });
}
