/**
 * ADMA — Contrôleur Avis Admin
 */
import { query } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function getReviews(req, res) {
  const { status = 'all', verdict, q, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conds = ['1=1'];
  const params = [];

  if (status && status !== 'all') {
    conds.push('r.status = ?');
    params.push(status);
  }

  if (verdict && verdict !== 'all') {
    conds.push('r.verdict = ?');
    params.push(verdict);
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    conds.push('(p.name LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR r.comment LIKE ?)');
    params.push(term, term, term, term);
  }

  const where = conds.join(' AND ');

  const [reviews] = await query(
    `SELECT r.*,
            p.name AS provider_name, p.specialty AS provider_specialty,
            u.phone AS reviewer_phone, CONCAT(u.first_name, ' ', u.last_name) AS reviewer_name,
            u.avatar_url AS reviewer_avatar
     FROM reviews r
     JOIN providers p ON p.id = r.provider_id
     JOIN users u ON u.id = r.reviewer_id
     WHERE ${where}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  const [[{ total }]] = await query(
    `SELECT COUNT(*) AS total
     FROM reviews r
     JOIN providers p ON p.id = r.provider_id
     JOIN users u ON u.id = r.reviewer_id
     WHERE ${where}`,
    params
  );

  res.json({
    success: true,
    data: {
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    },
  });
}

export async function hideReview(req, res) {
  const { id } = req.params;

  await query("UPDATE reviews SET status = 'hidden' WHERE id = ?", [id]);
  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'review_hide', 'review', id]
  );

  res.json({ success: true, message: 'Avis masqué avec succès' });
}

export async function restoreReview(req, res) {
  const { id } = req.params;

  await query("UPDATE reviews SET status = 'active' WHERE id = ?", [id]);
  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'review_restore', 'review', id]
  );

  res.json({ success: true, message: 'Avis restauré avec succès' });
}

export async function deleteReview(req, res) {
  const { id } = req.params;

  const [rows] = await query('SELECT provider_id FROM reviews WHERE id = ?', [id]);
  if (!rows.length) throw new AppError('Avis introuvable', 404, 'NOT_FOUND');

  const providerId = rows[0].provider_id;

  await query('DELETE FROM reviews WHERE id = ?', [id]);

  // Recalcul du trust score et du nombre d'avis
  const [[stat]] = await query(
    `SELECT COUNT(*) AS count,
            COALESCE(SUM(CASE WHEN verdict = 'positive' THEN 1 ELSE 0 END), 0) AS positive
     FROM reviews
     WHERE provider_id = ? AND status = 'active'`,
    [providerId]
  );

  const reviewCount = stat.count;
  const trustScore = reviewCount > 0 ? Math.round((stat.positive / reviewCount) * 100) : 0;

  await query(
    'UPDATE providers SET review_count = ?, trust_score = ? WHERE id = ?',
    [reviewCount, trustScore, providerId]
  );

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'review_delete', 'review', id]
  );

  res.json({ success: true, message: 'Avis supprimé avec succès' });
}
