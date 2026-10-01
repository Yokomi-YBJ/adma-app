/**
 * ADMA — Contrôleur Signalements Admin
 */
import { query } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function getReports(req, res) {
  const { status = 'pending', targetType, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conds = ['1=1'];
  const params = [];

  if (status && status !== 'all') {
    conds.push('r.status = ?');
    params.push(status);
  }

  if (targetType && targetType !== 'all') {
    conds.push('r.target_type = ?');
    params.push(targetType);
  }

  const where = conds.join(' AND ');

  const [reports] = await query(
    `SELECT r.*,
            u.phone AS reporter_phone, CONCAT(u.first_name, ' ', u.last_name) AS reporter_name,
            adm.full_name AS resolver_name
     FROM reports r
     JOIN users u ON u.id = r.reporter_id
     LEFT JOIN admins adm ON adm.id = r.resolved_by
     WHERE ${where}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  const [[{ total }]] = await query(
    `SELECT COUNT(*) AS total FROM reports r WHERE ${where}`,
    params
  );

  // Enrichissement de chaque rapport avec les données de la cible
  for (const report of reports) {
    if (report.target_type === 'provider') {
      const [prov] = await query(
        'SELECT id, name, specialty, phone_number, photo_url, is_active, verification_status FROM providers WHERE id = ?',
        [report.target_id]
      );
      report.target_data = prov[0] || null;
    } else if (report.target_type === 'review') {
      const [rev] = await query(
        `SELECT r.id, r.comment, r.verdict, r.provider_id, r.status, r.created_at,
                p.name AS provider_name
         FROM reviews r
         LEFT JOIN providers p ON p.id = r.provider_id
         WHERE r.id = ?`,
        [report.target_id]
      );
      report.target_data = rev[0] || null;
    }
  }

  res.json({
    success: true,
    data: {
      reports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    },
  });
}

export async function resolveReport(req, res) {
  const { id } = req.params;
  const { note } = req.body || {};

  const [result] = await query(
    `UPDATE reports
     SET status = 'resolved', resolved_by = ?, resolved_at = NOW()
     WHERE id = ?`,
    [req.admin.id, id]
  );

  if (result.affectedRows === 0) {
    throw new AppError('Signalement introuvable', 404, 'REPORT_NOT_FOUND');
  }

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, 'report_resolve', 'report', id, JSON.stringify({ note })]
  );

  res.json({ success: true, message: 'Signalement marqué comme résolu' });
}

export async function dismissReport(req, res) {
  const { id } = req.params;
  const { note } = req.body || {};

  const [result] = await query(
    `UPDATE reports
     SET status = 'dismissed', resolved_by = ?, resolved_at = NOW()
     WHERE id = ?`,
    [req.admin.id, id]
  );

  if (result.affectedRows === 0) {
    throw new AppError('Signalement introuvable', 404, 'REPORT_NOT_FOUND');
  }

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, 'report_dismiss', 'report', id, JSON.stringify({ note })]
  );

  res.json({ success: true, message: 'Signalement classé sans suite' });
}