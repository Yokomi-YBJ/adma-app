/**
 * ADMA — Contrôleur Notifications Admin
 * Envoi immédiat ou programmé, ciblage granulaire, historique complet
 */
import { query } from '../../config/database.js';
import { broadcastToUsers } from '../../services/notificationService.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

const VALID_TYPES   = ['ad', 'promo', 'announcement', 'info', 'important'];
const VALID_TARGETS = ['all', 'providers', 'plan', 'category'];

/**
 * Récupère les userIds ciblés selon les critères
 */
async function getTargetUserIds(targetType, targetValue) {
  const params = [];
  let sql;

  switch (targetType) {
    case 'all':
      sql = `SELECT id FROM users WHERE status = 'active'`;
      break;

    case 'providers':
      sql = `
        SELECT DISTINCT u.id
        FROM users u
        JOIN providers p ON p.user_id = u.id
        WHERE u.status = 'active'
          AND p.is_active = TRUE
          AND p.deleted_at IS NULL
      `;
      break;

    case 'plan':
      if (!targetValue) throw new AppError('Valeur de plan requise', 400, 'MISSING_TARGET_VALUE');
      sql = `
        SELECT DISTINCT u.id
        FROM users u
        JOIN providers p ON p.user_id = u.id
        WHERE u.status = 'active'
          AND p.is_active = TRUE
          AND p.deleted_at IS NULL
          AND p.plan = ?
      `;
      params.push(targetValue);
      break;

    case 'category':
      if (!targetValue) throw new AppError('Valeur de catégorie requise', 400, 'MISSING_TARGET_VALUE');
      sql = `
        SELECT DISTINCT u.id
        FROM users u
        JOIN providers p ON p.user_id = u.id
        WHERE u.status = 'active'
          AND p.is_active = TRUE
          AND p.deleted_at IS NULL
          AND p.category_id = ?
      `;
      params.push(parseInt(targetValue, 10));
      break;

    default:
      throw new AppError(`Cible inconnue : ${targetType}`, 400, 'INVALID_TARGET');
  }

  const [rows] = await query(sql, params);
  return rows.map((r) => r.id);
}

/**
 * Valide le payload du formulaire de notification
 */
function validateBroadcastPayload(body) {
  const {
    titleFr, titleEn, titleFul,
    bodyFr, bodyEn, bodyFul,
    type = 'info',
    targetType = 'all',
    targetValue,
    scheduledAt,
  } = body;

  if (!titleFr?.trim() || !bodyFr?.trim()) {
    throw new AppError('Titre et message en français requis', 422, 'MISSING_FIELDS');
  }
  if (!VALID_TYPES.includes(type)) {
    throw new AppError(`Type invalide : ${type}`, 400, 'INVALID_TYPE');
  }
  if (!VALID_TARGETS.includes(targetType)) {
    throw new AppError(`Cible invalide : ${targetType}`, 400, 'INVALID_TARGET');
  }
  if (['plan', 'category'].includes(targetType) && !targetValue) {
    throw new AppError('Valeur de cible requise', 400, 'MISSING_TARGET_VALUE');
  }

  let scheduledDate = null;
  if (scheduledAt) {
    scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new AppError('Date de programmation invalide', 400, 'INVALID_DATE');
    }
    if (scheduledDate.getTime() <= Date.now() - 60 * 1000) {
      throw new AppError('La date doit être dans le futur', 400, 'PAST_DATE');
    }
  }

  return {
    titleFr:    titleFr.trim(),
    titleEn:    titleEn?.trim() || titleFr.trim(),
    titleFul:   titleFul?.trim() || titleFr.trim(),
    bodyFr:     bodyFr.trim(),
    bodyEn:     bodyEn?.trim() || bodyFr.trim(),
    bodyFul:    bodyFul?.trim() || bodyFr.trim(),
    type,
    targetType,
    targetValue: targetValue || null,
    scheduledAt: scheduledDate,
  };
}

/**
 * POST /api/v1/admin/notifications/broadcast
 * Crée un broadcast (immédiat ou programmé)
 */
export async function broadcast(req, res) {
  const payload = validateBroadcastPayload(req.body);

  const isScheduled = !!payload.scheduledAt;
  const status      = isScheduled ? 'scheduled' : 'sending';

  const [result] = await query(
    `INSERT INTO admin_broadcasts
       (admin_id, title_fr, title_en, title_ful, body_fr, body_en, body_ful,
        type, target_type, target_value, status, scheduled_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      req.admin.id,
      payload.titleFr, payload.titleEn, payload.titleFul,
      payload.bodyFr,  payload.bodyEn,  payload.bodyFul,
      payload.type,    payload.targetType, payload.targetValue,
      status,
      payload.scheduledAt,
    ]
  );

  const broadcastId = result.insertId;

  // Log admin
  await query(
    'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details) VALUES (?,?,?,?,?)',
    [
      req.admin.id, 'broadcast_notification', 'broadcast', broadcastId,
      JSON.stringify({
        titleFr: payload.titleFr,
        type: payload.type,
        targetType: payload.targetType,
        targetValue: payload.targetValue,
        scheduled: isScheduled,
      }),
    ]
  );

  // Envoi immédiat si non programmé
  if (!isScheduled) {
    // Fire & forget, la réponse part tout de suite
    executeBroadcast(broadcastId).catch((err) => {
      logger.error('Broadcast immédiat échoué', { broadcastId, err: err.message });
    });
  }

  res.json({
    success: true,
    data: {
      id: broadcastId,
      status,
      scheduledAt: payload.scheduledAt,
    },
    message: isScheduled
      ? `Notification programmée pour le ${payload.scheduledAt.toLocaleString('fr-FR')}`
      : 'Envoi en cours...',
  });
}

/**
 * Exécute réellement un broadcast (utilisé en immédiat ou par le scheduler)
 */
export async function executeBroadcast(broadcastId) {
  const [rows] = await query('SELECT * FROM admin_broadcasts WHERE id = ?', [broadcastId]);
  if (!rows.length) return;
  const b = rows[0];

  if (b.status === 'sent' || b.status === 'sending') return;

  await query('UPDATE admin_broadcasts SET status = "sending" WHERE id = ?', [broadcastId]);

  try {
    const userIds = await getTargetUserIds(b.target_type, b.target_value);
    if (!userIds.length) {
      await query(
        'UPDATE admin_broadcasts SET status = "sent", sent_at = NOW(), recipients_count = 0 WHERE id = ?',
        [broadcastId]
      );
      return;
    }

    const result = await broadcastToUsers(userIds, {
      titleFr:  b.title_fr,
      titleEn:  b.title_en,
      titleFul: b.title_ful,
      bodyFr:   b.body_fr,
      bodyEn:   b.body_en,
      bodyFul:  b.body_ful,
      channelId: 'promotions',
    });

    await query(
      `UPDATE admin_broadcasts
       SET status = "sent", sent_at = NOW(),
           recipients_count = ?, failed_count = ?
       WHERE id = ?`,
      [result.sent || 0, result.failed || 0, broadcastId]
    );

    logger.info(`Broadcast ${broadcastId} envoyé à ${result.sent} destinataires`);
  } catch (err) {
    logger.error(`Broadcast ${broadcastId} échoué`, err.message);
    await query(
      'UPDATE admin_broadcasts SET status = "failed", error_message = ? WHERE id = ?',
      [err.message.slice(0, 300), broadcastId]
    );
  }
}

/**
 * GET /api/v1/admin/notifications/history
 */
export async function getBroadcastHistory(req, res) {
  const { page = 1, limit = 30 } = req.query;
  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset   = (pageNum - 1) * limitNum;

  const [rows] = await query(
    `SELECT b.*, a.full_name AS admin_name
     FROM admin_broadcasts b
     JOIN admins a ON a.id = b.admin_id
     ORDER BY b.created_at DESC
     LIMIT ? OFFSET ?`,
    [limitNum, offset]
  );

  const [[{ total }]] = await query('SELECT COUNT(*) AS total FROM admin_broadcasts');

  res.json({
    success: true,
    data: {
      broadcasts: rows,
      pagination: {
        page: pageNum, limit: limitNum, total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    },
  });
}

/**
 * GET /api/v1/admin/notifications/targets
 * Renvoie les cibles disponibles (plans + catégories)
 */
export async function getAvailableTargets(req, res) {
  const [plans] = await query(
    `SELECT DISTINCT plan FROM providers WHERE is_active = TRUE AND deleted_at IS NULL ORDER BY plan`
  );
  const [categories] = await query(
    `SELECT id, name_fr FROM categories WHERE is_active = TRUE AND parent_id IS NULL ORDER BY name_fr`
  );

  res.json({
    success: true,
    data: {
      plans: plans.map((p) => p.plan),
      categories,
    },
  });
}