/**
 * ADMA — Contrôleur Utilisateurs Admin
 */
import { query } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function getUsers(req, res) {
  const { q, status, page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conds = ['1=1'];
  const params = [];

  if (status && status !== 'all') {
    conds.push('u.status = ?');
    params.push(status);
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    conds.push('(u.phone LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)');
    params.push(term, term, term);
  }

  const allowedSorts = ['created_at', 'phone', 'first_name', 'last_name', 'status'];
  const validSort = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
  const validOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const where = conds.join(' AND ');

  const [users] = await query(
    `SELECT u.id, u.phone, u.first_name, u.last_name, u.avatar_url, u.status, u.phone_verified, u.created_at,
            p.id AS provider_id, p.name AS provider_name, p.plan AS provider_plan,
            (SELECT COUNT(*) FROM reviews r WHERE r.reviewer_id = u.id) AS review_count,
            (SELECT COUNT(*) FROM reports rep WHERE rep.reporter_id = u.id) AS report_count
     FROM users u
     LEFT JOIN providers p ON p.user_id = u.id AND p.deleted_at IS NULL
     WHERE ${where}
     ORDER BY u.${validSort} ${validOrder}
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  const [[{ total }]] = await query(`SELECT COUNT(*) AS total FROM users u WHERE ${where}`, params);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    },
  });
}

export async function getUserById(req, res) {
  const { id } = req.params;
  const [rows] = await query(
    `SELECT u.id, u.phone, u.first_name, u.last_name, u.avatar_url, u.status, u.phone_verified, u.created_at
     FROM users u WHERE u.id = ?`,
    [id]
  );

  if (!rows.length) throw new AppError('Utilisateur introuvable', 404, 'USER_NOT_FOUND');

  const user = rows[0];

  const [providers] = await query(
    `SELECT p.*, ci.name AS city_name, c.name_fr AS category_name
     FROM providers p
     LEFT JOIN cities ci ON ci.id = p.city_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.user_id = ? AND p.deleted_at IS NULL`,
    [id]
  );

  const [reviews] = await query(
    `SELECT r.*, p.name AS provider_name
     FROM reviews r
     JOIN providers p ON p.id = r.provider_id
     WHERE r.reviewer_id = ?
     ORDER BY r.created_at DESC LIMIT 10`,
    [id]
  );

  const [reports] = await query(
    `SELECT * FROM reports WHERE reporter_id = ? ORDER BY created_at DESC LIMIT 10`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...user,
      provider: providers[0] || null,
      reviews,
      reports,
    },
  });
}

export async function suspendUser(req, res) {
  const { id } = req.params;
  const { reason } = req.body || {};

  await query('UPDATE users SET status = "suspended" WHERE id = ?', [id]);
  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [req.admin.id, 'user_suspend', 'user', id, JSON.stringify({ reason: reason || 'Suspension manuelle par admin' })]
  );

  res.json({ success: true, message: 'Utilisateur suspendu avec succès' });
}

export async function activateUser(req, res) {
  const { id } = req.params;

  await query('UPDATE users SET status = "active" WHERE id = ?', [id]);
  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'user_activate', 'user', id]
  );

  res.json({ success: true, message: 'Utilisateur réactivé avec succès' });
}

export async function deleteUser(req, res) {
  const { id } = req.params;

  // Anonymisation des données selon RGPD/bonnes pratiques
  await query(
    `UPDATE users SET
       status = 'suspended',
       first_name = 'Compte',
       last_name = 'Supprimé',
       phone = CONCAT('DEL_', id, '_', phone),
       avatar_url = NULL
     WHERE id = ?`,
    [id]
  );

  // Désactiver les prestataires associés
  await query('UPDATE providers SET is_active = FALSE, deleted_at = NOW() WHERE user_id = ?', [id]);

  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id) VALUES (?,?,?,?)',
    [req.admin.id, 'user_delete', 'user', id]
  );

  res.json({ success: true, message: 'Compte utilisateur supprimé/anonymisé avec succès' });
}
