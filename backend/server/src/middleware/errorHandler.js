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
    success: false, code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} introuvable`,
  });
}

// Rate limit interne : max 1 alerte email toutes les 5 minutes
let lastAlertTime = 0;
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

function maybeAlert(err, req) {
  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN_MS) return;
  lastAlertTime = now;

  sendAdminAlert({
    subject: `[ADMA] Erreur serveur — ${req.method} ${req.path}`,
    body: [
      `Timestamp: ${new Date().toISOString()}`,
      `Route: ${req.method} ${req.originalUrl}`,
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
      path: req.originalUrl || req.path,
      code: err.code || null,
      message: err.message,
      user: req.user?.id || req.admin?.id || null,
    });
    // TODO: use a nullable/system admin ID after the schema supports system log entries.
    await query(
      `INSERT INTO admin_logs (admin_id, action, target_type, details)
       VALUES (1, 'error', 'server', ?)`,
      [details]
    );
  } catch {
    // Error logging must never interfere with the response.
  }
}

export async function errorHandler(err, req, res, _next) {
  if (err.name === 'AppError') {
    if (err.statusCode >= 500) {
      logger.error(`[${err.code}] ${err.message}`, { path: req.path });
      maybeAlert(err, req);
      await recordServerError(err, req);
    }
    return res.status(err.statusCode).json({
      success: false, code: err.code, message: err.message,
      ...(err.data && { errors: err.data }),
    });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, code: 'DUPLICATE', message: 'Cette ressource existe déjà' });
  }
  logger.error('Erreur non gérée', { message: err.message, stack: err.stack, path: req.path });
  maybeAlert(err, req);
  await recordServerError(err, req);
  res.status(500).json({
    success: false, code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Erreur interne' : err.message,
  });
}