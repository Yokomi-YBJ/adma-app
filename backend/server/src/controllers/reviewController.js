import { query } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { notifyNewReview, notifyReviewResponse } from '../services/notificationService.js';

export const getReviews = asyncHandler(async (req, res) => {
  const { providerId, page = 1, limit = 20 } = req.query;
  if (!providerId) throw new AppError('providerId requis', 400, 'MISSING_PARAM');
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const [rows] = await query(`
    SELECT r.id, r.verdict, r.comment, r.created_at,
           TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS reviewer_name,
           u.avatar_url AS reviewer_avatar,
           rr.comment AS response, rr.created_at AS response_at
    FROM reviews r
    JOIN users u ON u.id=r.reviewer_id
    LEFT JOIN review_responses rr ON rr.review_id=r.id
    WHERE r.provider_id=? AND r.status='active'
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `, [providerId, parseInt(limit), offset]);

  const [[{ total }]] = await query(
    'SELECT COUNT(*) AS total FROM reviews WHERE provider_id=? AND status="active"', [providerId]
  );

  res.json({ success: true, data: {
    reviews: rows.map(r => ({
      id: r.id, verdict: r.verdict, comment: r.comment, createdAt: r.created_at,
      reviewerName:   r.reviewer_name?.trim() || 'Utilisateur',
      reviewerAvatar: r.reviewer_avatar,
      response:       r.response ? { comment: r.response, createdAt: r.response_at } : null,
    })),
    pagination: { page: parseInt(page), total },
  }});
});

export const createReview = asyncHandler(async (req, res) => {
  const { providerId, verdict, comment } = req.body;
  const userId = req.user.id;

  const [own] = await query('SELECT id FROM providers WHERE id=? AND user_id=?', [providerId, userId]);
  if (own.length) throw new AppError('Vous ne pouvez pas noter votre propre fiche', 403, 'CANT_REVIEW_OWN');

  const [dup] = await query('SELECT id FROM reviews WHERE provider_id=? AND reviewer_id=?', [providerId, userId]);
  if (dup.length) throw new AppError('Vous avez déjà laissé un avis', 409, 'ALREADY_REVIEWED');

  const [prov] = await query('SELECT id, name FROM providers WHERE id=? AND is_active=TRUE', [providerId]);
  if (!prov.length) throw new AppError('Prestataire introuvable', 404, 'PROVIDER_NOT_FOUND');

  const [result] = await query(
    'INSERT INTO reviews (provider_id, reviewer_id, verdict, comment) VALUES (?,?,?,?)',
    [providerId, userId, verdict, comment?.trim() || null]
  );

  const reviewerName = [req.user.first_name, req.user.last_name].filter(Boolean).join(' ') || 'Un utilisateur';
  notifyNewReview(providerId, reviewerName, verdict).catch(() => {});

  res.status(201).json({ success: true, data: { id: result.insertId, verdict, comment } });
});

export const createReviewResponse = asyncHandler(async (req, res) => {
  const { comment } = req.body;
  const reviewId    = parseInt(req.params.id);

  const [rows] = await query(`
    SELECT r.reviewer_id, p.user_id AS provider_user_id, p.name, p.id AS provider_id
    FROM reviews r JOIN providers p ON p.id=r.provider_id
    WHERE r.id=? AND r.status='active'
  `, [reviewId]);
  if (!rows.length) throw new AppError('Avis introuvable', 404, 'NOT_FOUND');
  if (rows[0].provider_user_id !== req.user.id) throw new AppError('Accès refusé', 403, 'FORBIDDEN');

  const [dup] = await query('SELECT id FROM review_responses WHERE review_id=?', [reviewId]);
  if (dup.length) throw new AppError('Une réponse existe déjà', 409, 'ALREADY_RESPONDED');

  await query('INSERT INTO review_responses (review_id, provider_id, comment) VALUES (?,?,?)',
    [reviewId, rows[0].provider_id, comment.trim()]);

  notifyReviewResponse(rows[0].reviewer_id, rows[0].name).catch(() => {});
  res.status(201).json({ success: true, message: 'Réponse publiée' });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const [rows] = await query('SELECT reviewer_id FROM reviews WHERE id=?', [req.params.id]);
  if (!rows.length) throw new AppError('Avis introuvable', 404, 'NOT_FOUND');
  if (rows[0].reviewer_id !== req.user.id) throw new AppError('Accès refusé', 403, 'FORBIDDEN');
  await query("UPDATE reviews SET status='deleted' WHERE id=?", [req.params.id]);
  res.json({ success: true });
});
