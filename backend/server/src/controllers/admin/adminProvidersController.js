/**
 * ADMA — Contrôleur Prestataires Admin
 */
import { query } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function getProviders(req, res) {
  const {
    q,
    status,
    plan,
    verification,
    cityId,
    categoryId,
    page = 1,
    limit = 20,
    sortBy = 'created_at',
    sortOrder = 'DESC',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conds = ['p.deleted_at IS NULL'];
  const params = [];

  if (status && status !== 'all') {
    conds.push('p.is_active = ?');
    params.push(status === 'active' ? 1 : 0);
  }

  if (plan && plan !== 'all') {
    conds.push('p.plan = ?');
    params.push(plan);
  }

  if (verification && verification !== 'all') {
    conds.push('p.verification_status = ?');
    params.push(verification);
  }

  if (cityId) {
    conds.push('p.city_id = ?');
    params.push(parseInt(cityId, 10));
  }

  if (categoryId) {
    conds.push('p.category_id = ?');
    params.push(parseInt(categoryId, 10));
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    conds.push('(p.name LIKE ? OR p.specialty LIKE ? OR u.phone LIKE ? OR p.phone_number LIKE ?)');
    params.push(term, term, term, term);
  }

  const allowedSorts = ['created_at', 'name', 'trust_score', 'review_count', 'ranking_score', 'plan'];
  const validSort = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
  const validOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const where = conds.join(' AND ');

  const [providers] = await query(
    `SELECT p.id, p.user_id, p.name, p.specialty, p.photo_url, p.plan, p.plan_expires_at,
            p.verification_status, p.is_active, p.review_count, p.trust_score, p.ranking_score,
            p.created_at, p.suspended_at,
            u.phone, CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
            ci.name AS city_name,
            cat.name_fr AS category_name
     FROM providers p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN cities ci ON ci.id = p.city_id
     LEFT JOIN categories cat ON cat.id = p.category_id
     WHERE ${where}
     ORDER BY p.${validSort} ${validOrder}
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  const [[{ total }]] = await query(
    `SELECT COUNT(*) AS total
     FROM providers p
     JOIN users u ON u.id = p.user_id
     WHERE ${where}`,
    params
  );

  res.json({
    success: true,
    data: {
      providers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    },
  });
}

export async function getProviderById(req, res) {
  const { id } = req.params;

  const [rows] = await query(
    `SELECT p.*, p.photo_url AS avatar_url,
            u.phone AS user_phone, u.first_name, u.last_name, u.status AS user_status,
            ci.name AS city_name,
            n.name AS neighborhood_name,
            cat.name_fr AS category_name
     FROM providers p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN cities ci ON ci.id = p.city_id
     LEFT JOIN neighborhoods n ON n.id = p.neighborhood_id
     LEFT JOIN categories cat ON cat.id = p.category_id
     WHERE p.id = ? AND p.deleted_at IS NULL`,
    [id]
  );

  if (!rows.length) throw new AppError('Prestataire introuvable', 404, 'PROVIDER_NOT_FOUND');

  const provider = rows[0];

  const [photos] = await query(
    'SELECT * FROM provider_photos WHERE provider_id = ? ORDER BY position ASC, created_at DESC',
    [id]
  );

  const [recentReviews] = await query(
    `SELECT r.*, CONCAT(u.first_name, ' ', u.last_name) AS reviewer_name, u.phone AS reviewer_phone
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.provider_id = ?
     ORDER BY r.created_at DESC LIMIT 10`,
    [id]
  );

  const [verifications] = await query(
    'SELECT * FROM verification_requests WHERE provider_id = ? ORDER BY created_at DESC',
    [id]
  );

  const [subscriptions] = await query(
    'SELECT * FROM subscriptions WHERE provider_id = ? ORDER BY created_at DESC LIMIT 5',
    [id]
  );

  res.json({
    success: true,
    data: {
      ...provider,
      photos,
      recentReviews,
      verifications,
      subscriptions,
    },
  });
}

export async function updateProvider(req, res) {
  const { id } = req.params;
  const { name, specialty, description, plan, city_id, is_active, verification_status } = req.body;

  const sets = [];
  const vals = [];

  if (name !== undefined) { sets.push('name = ?'); vals.push(name.trim()); }
  if (specialty !== undefined) { sets.push('specialty = ?'); vals.push(specialty.trim()); }
  if (description !== undefined) { sets.push('description = ?'); vals.push(description.trim()); }
  if (plan !== undefined) { sets.push('plan = ?'); vals.push(plan); }
  if (city_id !== undefined) { sets.push('city_id = ?'); vals.push(city_id); }
  if (is_active !== undefined) {
    sets.push('is_active = ?');
    vals.push(is_active ? 1 : 0);
    if (!is_active) {
      sets.push('suspended_at = NOW()');
    } else {
      sets.push('suspended_at = NULL');
    }
  }
  if (verification_status !== undefined) {
    sets.push('verification_status = ?');
    vals.push(verification_status);
    if (['verified_id', 'verified'].includes(verification_status)) {
      sets.push('verified_at = NOW()');
    }
  }

  if (sets.length > 0) {
    vals.push(id);
    await query(`UPDATE providers SET ${sets.join(', ')} WHERE id = ?`, vals);
  }

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, 'provider_update', 'provider', id, JSON.stringify(req.body)]
  );

  res.json({ success: true, message: 'Prestataire mis à jour avec succès' });
}

export async function suspendProvider(req, res) {
  const { id } = req.params;
  const { reason } = req.body || {};

  await query('UPDATE providers SET is_active = FALSE, suspended_at = NOW() WHERE id = ?', [id]);
  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, 'provider_suspend', 'provider', id, JSON.stringify({ reason: reason || 'Suspension par admin' })]
  );

  res.json({ success: true, message: 'Prestataire suspendu avec succès' });
}

export async function activateProvider(req, res) {
  const { id } = req.params;

  await query('UPDATE providers SET is_active = TRUE, suspended_at = NULL WHERE id = ?', [id]);
  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'provider_activate', 'provider', id]
  );

  res.json({ success: true, message: 'Prestataire réactivé avec succès' });
}

export async function deleteProvider(req, res) {
  const { id } = req.params;

  await query('UPDATE providers SET is_active = FALSE, deleted_at = NOW() WHERE id = ?', [id]);
  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'provider_delete', 'provider', id]
  );

  res.json({ success: true, message: 'Prestataire archivé avec succès' });
}