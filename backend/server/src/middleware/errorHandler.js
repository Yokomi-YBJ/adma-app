import { logger } from '../utils/logger.js';
import { sendAdminAlert } from '../services/mailService.js';
import { query } from '../config/database.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', data = null) {
    super(message);
    this.name       = 'AppError';
    this.statusCode = statusCode;
    this.code       = code;
    this.data       = data;
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: 'Ressource introuvable.',
  });
}

// ── Rate limit interne pour les emails d'alerte ────────────────
let lastAlertTime = 0;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

// ── Types d'erreurs qu'on N'ALERTE PAS (bruit des scanners) ────
const NOISY_ERROR_CODES = [
  'ECONNRESET',
  'ECONNABORTED',
  'EPIPE',
  'ETIMEDOUT',
];

function isNoisyError(err) {
  if (err.name === 'SyntaxError' && err.message.includes('JSON')) return true;
  if (err.type === 'entity.parse.failed') return true;
  if (err.type === 'entity.too.large') return true;
  if (NOISY_ERROR_CODES.includes(err.code)) return true;
  if (err.code === 'UNAUTHORIZED' || err.code === 'INVALID_TOKEN') return true;
  if (err.code === 'TOKEN_EXPIRED') return true;
  return false;
}

async function maybeAlert(err, req) {
  if (isNoisyError(err)) return;

  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN_MS) return;
  lastAlertTime = now;

  sendAdminAlert({
    subject: `[ADMA] Alerte Incident Serveur — ${req.method} ${req.path}`,
    body: [
      `Timestamp: ${new Date().toISOString()}`,
      `Route: ${req.method} ${req.originalUrl}`,
      `IP: ${req.ip}`,
      `User-Agent: ${req.headers['user-agent'] || 'unknown'}`,
      `User: ${req.user?.id || req.admin?.id || 'anonyme'}`,
      `Code: ${err.code || 'N/A'}`,
      `Message: ${err.message}`,
      `Stack: ${err.stack || 'N/A'}`,
    ].join('\n'),
  }).catch((e) => logger.error('sendAdminAlert failed', { err: e.message }));
}

async function recordServerError(err, req) {
  try {
    const details = JSON.stringify({
      path:    req.originalUrl || req.path,
      code:    err.code || null,
      message: err.message,
      ip:      req.ip,
      ua:      req.headers['user-agent'] || null,
      user:    req.user?.id || req.admin?.id || null,
    });
    await query(
      `INSERT INTO admin_logs (admin_id, action, target_type, details)
       VALUES (1, 'error', 'server', ?)`,
      [details]
    );
  } catch {
    // Ne bloque jamais la réponse HTTP
  }
}

export async function errorHandler(err, req, res, _next) {
  // ── 1. Erreurs de parsing (scanners / mauvais format) ──────────
  if (err.type === 'entity.parse.failed' || err.name === 'SyntaxError') {
    logger.warn('Requête malformée (scanner ?)', {
      path: req.originalUrl || req.path,
      ip:   req.ip,
      ua:   req.headers['user-agent'] || 'unknown',
      err:  err.message.slice(0, 100),
    });

    return res.status(400).json({
      success: false,
      code: 'INVALID_PAYLOAD',
      message: 'Format de requête invalide. JSON attendu.',
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Requête trop volumineuse.',
    });
  }

  // ── 2. Erreurs applicatives contrôlées ─────────────────────────
  if (err.name === 'AppError') {
    if (err.statusCode >= 500) {
      logger.error(`[${err.code}] ${err.message}`, { path: req.path });
      maybeAlert(err, req);
      await recordServerError(err, req);
    } else {
      logger.warn(`[${err.code}] ${err.message}`, { path: req.path, ip: req.ip });
    }
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.data && { errors: err.data }),
    });
  }

  // ── 3. Erreurs Multer ──────────────────────────────────────────
  if (err.name === 'MulterError') {
    let message = 'Erreur lors du téléversement du fichier.';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Le fichier est trop volumineux (max : 5 Mo).';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Format ou champ de fichier non pris en charge.';
    }
    return res.status(400).json({
      success: false,
      code: err.code || 'UPLOAD_ERROR',
      message,
    });
  }

  // ── 4. Erreurs BD ──────────────────────────────────────────────
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false, code: 'DUPLICATE',
      message: 'Cet élément existe déjà.',
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return res.status(400).json({
      success: false, code: 'INVALID_REFERENCE',
      message: 'Une référence sélectionnée est introuvable.',
    });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return res.status(409).json({
      success: false, code: 'RESOURCE_LOCKED',
      message: 'Impossible de supprimer : des données actives y sont rattachées.',
    });
  }

  if (err.code === 'ER_DATA_TOO_LONG') {
    return res.status(400).json({
      success: false, code: 'DATA_TOO_LONG',
      message: 'Le texte dépasse la longueur maximale.',
    });
  }

  if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_CON_COUNT_ERROR'].includes(err.code)) {
    logger.error('Erreur de connexion BD', { code: err.code, message: err.message });
    return res.status(503).json({
      success: false, code: 'DATABASE_UNAVAILABLE',
      message: 'Service temporairement indisponible. Réessayez dans quelques instants.',
    });
  }

  // ── 5. Erreurs imprévues (500) ────────────────────────────────
  logger.error('Erreur non gérée', {
    message: err.message, stack: err.stack, path: req.path, ip: req.ip,
  });
  maybeAlert(err, req);
  await recordServerError(err, req);

  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: isProd
      ? 'Une erreur inattendue est survenue.'
      : err.message,
  });
}