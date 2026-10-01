/**
 * ADMA — Contrôleur Vérifications CNI Admin
 */
import { query } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { notifyVerificationApproved, notifyVerificationRejected } from '../../services/notificationService.js';

export async function getVerificationRequests(req, res) {
  const { status = 'pending', page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conds = ['1=1'];
  const params = [];

  if (status && status !== 'all') {
    conds.push('vr.status = ?');
    params.push(status);
  }

  const where = conds.join(' AND ');

  const [requests] = await query(
    `SELECT vr.*,
            p.name AS provider_name, p.specialty AS provider_specialty,
            p.verification_status AS current_status, p.user_id,
            u.phone, CONCAT(u.first_name, ' ', u.last_name) AS user_name,
            adm.full_name AS reviewed_by_name
     FROM verification_requests vr
     JOIN providers p ON p.id = vr.provider_id
     JOIN users u ON u.id = p.user_id
     LEFT JOIN admins adm ON adm.id = vr.reviewed_by
     WHERE ${where}
     ORDER BY vr.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  const [[{ total }]] = await query(
    `SELECT COUNT(*) AS total
     FROM verification_requests vr
     WHERE ${where}`,
    params
  );

  res.json({
    success: true,
    data: {
      requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    },
  });
}

export async function getVerificationById(req, res) {
  const { id } = req.params;

  const [rows] = await query(
    `SELECT vr.*,
            p.name AS provider_name, p.specialty, p.avatar_url, p.verification_status AS current_status,
            p.user_id, u.phone, u.first_name, u.last_name,
            adm.full_name AS reviewed_by_name
     FROM verification_requests vr
     JOIN providers p ON p.id = vr.provider_id
     JOIN users u ON u.id = p.user_id
     LEFT JOIN admins adm ON adm.id = vr.reviewed_by
     WHERE vr.id = ?`,
    [id]
  );

  if (!rows.length) throw new AppError('Demande introuvable', 404, 'VERIFICATION_NOT_FOUND');

  res.json({ success: true, data: rows[0] });
}

export async function approveVerification(req, res) {
  const { id } = req.params;
  const { badgeType = 'verified_id', note } = req.body;

  const [rows] = await query('SELECT * FROM verification_requests WHERE id = ?', [id]);
  if (!rows.length) throw new AppError('Demande introuvable', 404, 'NOT_FOUND');

  const reqData = rows[0];

  await query(
    `UPDATE verification_requests
     SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), review_note = ?
     WHERE id = ?`,
    [req.admin.id, note || null, id]
  );

  await query(
    'UPDATE providers SET verification_status = ?, verified_at = NOW() WHERE id = ?',
    [badgeType, reqData.provider_id]
  );

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, 'verification_approve', 'provider', reqData.provider_id, JSON.stringify({ badgeType, note })]
  );

  const [prov] = await query('SELECT user_id FROM providers WHERE id = ?', [reqData.provider_id]);
  if (prov.length) {
    notifyVerificationApproved(prov[0].user_id, badgeType).catch(() => {});
  }

  res.json({ success: true, message: 'Demande de vérification approuvée avec succès' });
}

export async function rejectVerification(req, res) {
  const { id } = req.params;
  const { reason = 'Documents non conformes' } = req.body;

  const [rows] = await query('SELECT * FROM verification_requests WHERE id = ?', [id]);
  if (!rows.length) throw new AppError('Demande introuvable', 404, 'NOT_FOUND');

  const reqData = rows[0];

  await query(
    `UPDATE verification_requests
     SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), review_note = ?
     WHERE id = ?`,
    [req.admin.id, reason, id]
  );

  await query(
    "UPDATE providers SET verification_status = 'none' WHERE id = ?",
    [reqData.provider_id]
  );

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, 'verification_reject', 'provider', reqData.provider_id, JSON.stringify({ reason })]
  );

  const [prov] = await query('SELECT user_id FROM providers WHERE id = ?', [reqData.provider_id]);
  if (prov.length) {
    notifyVerificationRejected(prov[0].user_id, reason).catch(() => {});
  }

  res.json({ success: true, message: 'Demande de vérification rejetée' });
}
