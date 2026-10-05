/**
 * ADMA — Contrôleur Signalements Admin
 */
import { query } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

export async function getReports(req, res) {
  const { status = 'pending', targetType, page = 1, limit = 20 } = req.query;
  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset   = (pageNum - 1) * limitNum;

  const conds = ['1=1'];
  const params = [];

  if (status && status !== 'all')     { conds.push('r.status = ?');      params.push(status); }
  if (targetType && targetType !== 'all') { conds.push('r.target_type = ?'); params.push(targetType); }

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

  // Enrichissement de chaque rapport
  for (const report of reports) {
    if (report.target_type === 'provider') {
      const [prov] = await query(
        `SELECT p.id, p.name, p.specialty, p.phone_number, p.photo_url,
                p.is_active, p.verification_status, p.plan,
                p.review_count, p.trust_score, p.deleted_at,
                ci.name AS city_name
         FROM providers p
         LEFT JOIN cities ci ON ci.id = p.city_id
         WHERE p.id = ?`,
        [report.target_id]
      );
      report.target_data = prov[0] || null;
    } else if (report.target_type === 'review') {
      const [rev] = await query(
        `SELECT r.id, r.comment, r.verdict, r.provider_id, r.status, r.created_at,
                p.name AS provider_name, p.id AS provider_id,
                CONCAT(u.first_name, ' ', u.last_name) AS author_name
         FROM reviews r
         LEFT JOIN providers p ON p.id = r.provider_id
         LEFT JOIN users u ON u.id = r.reviewer_id
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
        page: pageNum, limit: limitNum, total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    },
  });
}

/**
 * POST /api/v1/admin/reports/:id/action
 * Applique une action concrète sur la cible puis résout le signalement
 *
 * Body : { action: string, note?: string }
 * Actions supportées :
 *   - 'suspend_provider'  : suspend le prestataire signalé
 *   - 'activate_provider' : réactive le prestataire
 *   - 'hide_review'       : masque l'avis signalé
 *   - 'delete_review'     : supprime l'avis signalé
 *   - 'dismiss'           : classe le signalement sans suite
 *   - 'resolve_only'      : marque comme résolu sans autre action
 */
export async function applyReportAction(req, res) {
  const { id } = req.params;
  const { action, note } = req.body;

  if (!action) throw new AppError('Action requise', 400, 'MISSING_ACTION');

  const [reports] = await query(
    'SELECT * FROM reports WHERE id = ?',
    [id]
  );
  if (!reports.length) throw new AppError('Signalement introuvable', 404, 'REPORT_NOT_FOUND');

  const report = reports[0];
  const details = { reportId: id, targetType: report.target_type, targetId: report.target_id, action, note };

  try {
    switch (action) {
      case 'suspend_provider': {
        if (report.target_type !== 'provider') {
          throw new AppError('Action réservée aux signalements de prestataire', 400, 'INVALID_TARGET');
        }
        await query(
          'UPDATE providers SET is_active = FALSE, suspended_at = NOW() WHERE id = ?',
          [report.target_id]
        );
        await query(
          'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
          [req.admin.id, 'provider_suspend', 'provider', report.target_id, JSON.stringify(details)]
        );
        break;
      }

      case 'activate_provider': {
        if (report.target_type !== 'provider') {
          throw new AppError('Action réservée aux signalements de prestataire', 400, 'INVALID_TARGET');
        }
        await query(
          'UPDATE providers SET is_active = TRUE, suspended_at = NULL WHERE id = ?',
          [report.target_id]
        );
        await query(
          'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
          [req.admin.id, 'provider_activate', 'provider', report.target_id, JSON.stringify(details)]
        );
        break;
      }

      case 'hide_review': {
        if (report.target_type !== 'review') {
          throw new AppError('Action réservée aux signalements d\'avis', 400, 'INVALID_TARGET');
        }
        await query("UPDATE reviews SET status = 'hidden' WHERE id = ?", [report.target_id]);
        await query(
          'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
          [req.admin.id, 'review_hide', 'review', report.target_id, JSON.stringify(details)]
        );
        break;
      }

      case 'delete_review': {
        if (report.target_type !== 'review') {
          throw new AppError('Action réservée aux signalements d\'avis', 400, 'INVALID_TARGET');
        }
        const [revRows] = await query('SELECT provider_id FROM reviews WHERE id = ?', [report.target_id]);
        if (revRows.length) {
          const providerId = revRows[0].provider_id;
          await query('DELETE FROM reviews WHERE id = ?', [report.target_id]);

          // Recalcul du trust score
          const [[stat]] = await query(
            `SELECT COUNT(*) AS count,
                    COALESCE(SUM(CASE WHEN verdict = 'positive' THEN 1 ELSE 0 END), 0) AS positive
             FROM reviews WHERE provider_id = ? AND status = 'active'`,
            [providerId]
          );
          const reviewCount = stat.count;
          const trustScore  = reviewCount > 0 ? Math.round((stat.positive / reviewCount) * 100) : 0;
          await query(
            'UPDATE providers SET review_count = ?, trust_score = ? WHERE id = ?',
            [reviewCount, trustScore, providerId]
          );
        }
        await query(
          'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
          [req.admin.id, 'review_delete', 'review', report.target_id, JSON.stringify(details)]
        );
        break;
      }

      case 'dismiss': {
        await query(
          `UPDATE reports SET status = 'dismissed', resolved_by = ?, resolved_at = NOW()
           WHERE id = ?`,
          [req.admin.id, id]
        );
        await query(
          'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
          [req.admin.id, 'report_dismiss', 'report', id, JSON.stringify(details)]
        );
        return res.json({ success: true, message: 'Signalement classé sans suite' });
      }

      case 'resolve_only': {
        // pas d'action sur la cible, juste clôturer
        break;
      }

      default:
        throw new AppError(`Action inconnue : ${action}`, 400, 'INVALID_ACTION');
    }

    // Marquer le signalement comme résolu
    await query(
      `UPDATE reports SET status = 'resolved', resolved_by = ?, resolved_at = NOW()
       WHERE id = ?`,
      [req.admin.id, id]
    );

    await query(
      'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
      [req.admin.id, 'report_resolve', 'report', id, JSON.stringify(details)]
    );

    res.json({ success: true, message: 'Action appliquée et signalement résolu' });
  } catch (err) {
    logger.error('applyReportAction error', { err: err.message, action, reportId: id });
    throw err;
  }
}

// Conserve les anciens endpoints pour rétrocompatibilité
export async function resolveReport(req, res) {
  const { id } = req.params;
  const { note } = req.body || {};

  const [result] = await query(
    `UPDATE reports SET status = 'resolved', resolved_by = ?, resolved_at = NOW()
     WHERE id = ?`,
    [req.admin.id, id]
  );

  if (result.affectedRows === 0) throw new AppError('Signalement introuvable', 404, 'REPORT_NOT_FOUND');

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
    `UPDATE reports SET status = 'dismissed', resolved_by = ?, resolved_at = NOW()
     WHERE id = ?`,
    [req.admin.id, id]
  );

  if (result.affectedRows === 0) throw new AppError('Signalement introuvable', 404, 'REPORT_NOT_FOUND');

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, 'report_dismiss', 'report', id, JSON.stringify({ note })]
  );

  res.json({ success: true, message: 'Signalement classé sans suite' });
}