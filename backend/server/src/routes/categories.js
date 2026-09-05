import { Router } from 'express';
import { query }  from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { setCache, getCache } from '../services/cacheService.js';

const router = Router();
const TTL_24H = 24 * 60 * 60 * 1000;

router.get('/', asyncHandler(async (req, res) => {
  const cached = getCache('categories_all');
  if (cached) return res.json({ success: true, data: cached });
  const [rows] = await query(`
    SELECT c.*, COUNT(p.id) AS provider_count
    FROM categories c
    LEFT JOIN providers p ON p.category_id=c.id AND p.is_active=TRUE AND p.deleted_at IS NULL
    WHERE c.is_active=TRUE
    GROUP BY c.id ORDER BY c.sort_order ASC, c.name_fr ASC
  `);
  setCache('categories_all', rows, TTL_24H);
  res.json({ success: true, data: rows });
}));

router.get('/cities', asyncHandler(async (req, res) => {
  const cached = getCache('cities_all');
  if (cached) return res.json({ success: true, data: cached });
  const [rows] = await query('SELECT * FROM cities WHERE is_active=TRUE ORDER BY name ASC');
  setCache('cities_all', rows, TTL_24H);
  res.json({ success: true, data: rows });
}));

router.get('/neighborhoods', asyncHandler(async (req, res) => {
  const { cityId } = req.query;
  const key    = cityId ? `neigh_city_${cityId}` : 'neigh_all';
  const cached = getCache(key);
  if (cached) return res.json({ success: true, data: cached });
  const [rows] = await query(
    `SELECT * FROM neighborhoods WHERE is_active=TRUE ${cityId ? 'AND city_id=?' : ''} ORDER BY name ASC`,
    cityId ? [cityId] : []
  );
  setCache(key, rows, TTL_24H);
  res.json({ success: true, data: rows });
}));

export default router;
