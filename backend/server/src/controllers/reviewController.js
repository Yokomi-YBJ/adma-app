import { query } from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { notifyNewReview, notifyReviewResponse, notifyReviewUpdated } from '../services/notificationService.js';
import { invalidateCache } from '../services/cacheService.js';

// ── Mise à jour des stats ──────────────────────────────────────
export async function updateProviderReviewStats(providerId) {
  const [[counts]] = await query(`
    SELECT
      COUNT(*) AS total_reviews,
      SUM(IF(verdict = 'recommend', 1, 0)) AS recommend_reviews
    FROM reviews
    WHERE provider_id = ? AND status = 'active'
  `, [providerId]);

  const reviewCount = Number(counts?.total_reviews || 0);
  const recommendCount = Number(counts?.recommend_reviews || 0);
  const trustScore = reviewCount > 0 ? Math.round((recommendCount / reviewCount) * 100) : 0;

  const [[prov]] = await query(
    'SELECT verification_status, photo_url, description, specialty, plan FROM providers WHERE id = ?',
    [providerId]
  );
  let rankingScore = 5;
  if (prov) {
    const isVerified = prov.verification_status === 'verified' ? 15 : (prov.verification_status === 'verified_id' ? 8 : 0);
    const hasCompleteProfile = (prov.photo_url && prov.description && prov.specialty) ? 10 : 5;
    const isPaidPlan = ['premium', 'professional', 'enterprise'].includes(prov.plan) ? 10 : 0;
    rankingScore = ((trustScore / 100) * 40) + (Math.min(reviewCount, 100) / 100 * 20) + isVerified + hasCompleteProfile + isPaidPlan + 5;
  }

  await query(`
    UPDATE providers
    SET review_count = ?, recommend_count = ?, trust_score = ?, ranking_score = ?
    WHERE id = ?
  `, [reviewCount, recommendCount, trustScore, rankingScore, providerId]);

  invalidateCache('home_providers');
}

// ── GET /reviews (liste ou avis d'un utilisateur) ──────────────
export const getReviews = asyncHandler(async (req, res) => {
  const { providerId, userId, page = 1, limit = 20 } = req.query;
  if (!providerId) throw new AppError('providerId requis', 400, 'MISSING_PARAM');

  if (userId) {
    const [rows] = await query(
      `SELECT r.id, r.verdict, r.comment, r.created_at, r.updated_at,
              TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))) AS reviewer_name,
              u.avatar_url AS reviewer_avatar,
              rr.comment AS response, rr.created_at AS response_at
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       LEFT JOIN review_responses rr ON rr.review_id = r.id
       WHERE r.provider_id = ? AND r.reviewer_id = ? AND r.status = 'active'
       ORDER BY r.created_at DESC
       LIMIT 1`,
      [providerId, userId]
    );
    return res.json({ success: true, data: rows });
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const [rows] = await query(`
    SELECT r.id, r.verdict, r.comment, r.created_at, r.updated_at,
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

  res.json({
    success: true,
    data: {
      reviews: rows.map(r => ({
        id: r.id,
        verdict: r.verdict,
        comment: r.comment,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        reviewerName: r.reviewer_name?.trim() || 'Utilisateur',
        reviewerAvatar: r.reviewer_avatar,
        response: r.response ? { comment: r.response, createdAt: r.response_at } : null,
      })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    },
  });
});

// ── POST /reviews ──────────────────────────────────────────────
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

  await updateProviderReviewStats(providerId);

  const reviewerName = [req.user.first_name, req.user.last_name].filter(Boolean).join(' ') || 'Un utilisateur';
  notifyNewReview(providerId, reviewerName, verdict).catch(() => {});

  res.status(201).json({ success: true, data: { id: result.insertId, verdict, comment } });
});

// ── PUT /reviews/:id (modifier son propre avis) ────────────────
export const updateReview = asyncHandler(async (req, res) => {
  const reviewId = parseInt(req.params.id);
  const { verdict, comment } = req.body;
  const userId = req.user.id;

  // Récupérer l'ancien avis pour la notification et vérification
  const [rows] = await query(
    'SELECT id, provider_id, reviewer_id, verdict FROM reviews WHERE id=? AND status="active"',
    [reviewId]
  );
  if (!rows.length) throw new AppError('Avis introuvable', 404, 'NOT_FOUND');
  if (rows[0].reviewer_id !== userId) throw new AppError('Accès refusé', 403, 'FORBIDDEN');

  const oldVerdict = rows[0].verdict;

  // Mise à jour (updated_at sera automatiquement mis à jour par ON UPDATE CURRENT_TIMESTAMP)
  await query(
    'UPDATE reviews SET verdict=?, comment=? WHERE id=?',
    [verdict, comment?.trim() || null, reviewId]
  );

  await updateProviderReviewStats(rows[0].provider_id);

  // Notifier le prestataire du changement (si le verdict a changé ou si c'est un avis modifié)
  const reviewerName = [req.user.first_name, req.user.last_name].filter(Boolean).join(' ') || 'Un utilisateur';
  if (oldVerdict !== verdict) {
    notifyReviewUpdated(rows[0].provider_id, reviewerName, oldVerdict, verdict).catch(() => {});
  } else {
    // Même si le verdict ne change pas, on peut envoyer une notification "avis modifié"
    notifyReviewUpdated(rows[0].provider_id, reviewerName, oldVerdict, verdict).catch(() => {});
  }

  res.json({ success: true, message: 'Avis mis à jour' });
});

// ── POST /reviews/:id/response ─────────────────────────────────
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

// ── DELETE /reviews/:id ──────────────────────────────────────────
export const deleteReview = asyncHandler(async (req, res) => {
  const [rows] = await query('SELECT provider_id, reviewer_id FROM reviews WHERE id=?', [req.params.id]);
  if (!rows.length) throw new AppError('Avis introuvable', 404, 'NOT_FOUND');
  if (rows[0].reviewer_id !== req.user.id) throw new AppError('Accès refusé', 403, 'FORBIDDEN');
  await query("UPDATE reviews SET status='deleted' WHERE id=?", [req.params.id]);
  if (rows[0].provider_id) {
    await updateProviderReviewStats(rows[0].provider_id);
  }
  res.json({ success: true });
});