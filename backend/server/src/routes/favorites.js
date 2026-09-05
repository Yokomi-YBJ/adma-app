import { Router } from 'express';
import { query }  from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { notifyNewFavorite } from '../services/notificationService.js';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await query(`
    SELECT p.id, p.name, p.specialty, p.photo_url, p.trust_score, p.review_count,
           p.verification_status, p.plan, p.availability,
           c.name_fr AS category_name_fr, ci.name AS city_name, n.name AS neighborhood_name
    FROM favorites f
    JOIN providers p ON p.id=f.provider_id
    JOIN categories c  ON c.id=p.category_id
    JOIN cities ci     ON ci.id=p.city_id
    JOIN neighborhoods n ON n.id=p.neighborhood_id
    WHERE f.user_id=? AND p.is_active=TRUE AND p.deleted_at IS NULL
    ORDER BY f.created_at DESC
  `, [req.user.id]);
  res.json({ success: true, data: rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { providerId } = req.body;
  const [prov] = await query('SELECT id FROM providers WHERE id=? AND is_active=TRUE', [providerId]);
  if (!prov.length) throw new AppError('Prestataire introuvable', 404, 'NOT_FOUND');
  try {
    await query('INSERT INTO favorites (user_id, provider_id) VALUES (?,?)', [req.user.id, providerId]);
    notifyNewFavorite(providerId).catch(() => {});
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new AppError('Déjà en favoris', 409, 'ALREADY_FAVORITE');
    throw e;
  }
  res.status(201).json({ success: true });
}));

router.delete('/:providerId', asyncHandler(async (req, res) => {
  await query('DELETE FROM favorites WHERE user_id=? AND provider_id=?', [req.user.id, req.params.providerId]);
  res.json({ success: true });
}));

export default router;
