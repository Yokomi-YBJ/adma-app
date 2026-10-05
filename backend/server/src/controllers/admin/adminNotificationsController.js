/**
 * ADMA — Contrôleur Notifications Admin (broadcast)
 */
import { query } from '../../config/database.js';
import { broadcastToUsers } from '../../services/notificationService.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function broadcast(req, res) {
  const {
    titleFr, titleEn, titleFul,
    bodyFr, bodyEn, bodyFul,
    targetPlan = 'all',
  } = req.body;

  if (!titleFr?.trim() || !bodyFr?.trim()) {
    throw new AppError('Titre et message en français requis', 422, 'MISSING_FIELDS');
  }

  // Construire la liste des users cibles
  let sql;
  const params = [];

  if (targetPlan === 'all') {
    sql = `SELECT id FROM users WHERE status = 'active'`;
  } else {
    sql = `
      SELECT DISTINCT u.id
      FROM users u
      JOIN providers p ON p.user_id = u.id
      WHERE u.status = 'active'
        AND p.plan = ?
        AND p.is_active = TRUE
        AND p.deleted_at IS NULL
    `;
    params.push(targetPlan);
  }

  const [users] = await query(sql, params);
  const userIds = users.map((u) => u.id);

  if (!userIds.length) {
    return res.json({ success: true, data: { sent: 0, failed: 0, total: 0 } });
  }

  const result = await broadcastToUsers(userIds, {
    titleFr: titleFr.trim(),
    titleEn: titleEn?.trim() || titleFr.trim(),
    titleFul: titleFul?.trim() || titleFr.trim(),
    bodyFr: bodyFr.trim(),
    bodyEn: bodyEn?.trim() || bodyFr.trim(),
    bodyFul: bodyFul?.trim() || bodyFr.trim(),
    channelId: 'promotions',
  });

  // Log admin
  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, details) VALUES (?,?,?,?)',
    [
      req.admin.id,
      'broadcast_notification',
      'all_users',
      JSON.stringify({ titleFr, bodyFr, targetPlan, sent: result.sent, failed: result.failed }),
    ]
  );

  res.json({
    success: true,
    data: { ...result, total: userIds.length },
  });
}

export async function getBroadcastHistory(req, res) {
  const [rows] = await query(
    `SELECT id, admin_id, details, created_at
     FROM admin_logs
     WHERE action = 'broadcast_notification'
     ORDER BY created_at DESC
     LIMIT 50`
  );
  res.json({ success: true, data: rows });
}
