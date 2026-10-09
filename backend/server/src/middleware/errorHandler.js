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
    message: `La ressource demandée (${req.method} ${req.path}) est introuvable.`,
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
    subject: `[ADMA] Alerte Incident Serveur — ${req.method} ${req.path}`,
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
    await query(
      `INSERT INTO admin_logs (admin_id, action, target_type, details)
       VALUES (1, 'error', 'server', ?)`,
      [details]
    );
  } catch {
    // La journalisation en base ne doit jamais bloquer la réponse HTTP
  }
}

export async function errorHandler(err, req, res, _next) {
  // ── 1. Erreurs applicatives contrôlées ─────────────────────────────
  if (err.name === 'AppError') {
    if (err.statusCode >= 500) {
      logger.error(`[${err.code}] ${err.message}`, { path: req.path });
      maybeAlert(err, req);
      await recordServerError(err, req);
    }
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.data && { errors: err.data }),
    });
  }

  // ── 2. Erreurs Multer (Uploads) ───────────────────────────────────
  if (err.name === 'MulterError') {
    let message = 'Erreur lors du téléversement du fichier.';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Le fichier sélectionné est trop volumineux (taille maximale autorisée : 5 Mo).';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Format ou champ de fichier non pris en charge.';
    }
    return res.status(400).json({
      success: false,
      code: err.code || 'UPLOAD_ERROR',
      message,
    });
  }

  // ── 3. Erreurs Base de données (MySQL / TiDB) ────────────────────
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE',
      message: 'Cet élément existe déjà dans le système.',
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return res.status(400).json({
      success: false,
      code: 'INVALID_REFERENCE',
      message: 'Une référence sélectionnée (ville, quartier ou catégorie) est introuvable.',
    });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return res.status(409).json({
      success: false,
      code: 'RESOURCE_LOCKED',
      message: 'Impossible de supprimer cet élément car des données actives y sont rattachées.',
    });
  }

  if (err.code === 'ER_DATA_TOO_LONG') {
    return res.status(400).json({
      success: false,
      code: 'DATA_TOO_LONG',
      message: 'Le texte renseigné dépasse la longueur maximale permise.',
    });
  }

  if (['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'ER_CON_COUNT_ERROR'].includes(err.code)) {
    logger.error('Erreur de connexion base de données', { code: err.code, message: err.message });
    return res.status(503).json({
      success: false,
      code: 'DATABASE_UNAVAILABLE',
      message: 'Le service est temporairement indisponible suite à une surcharge réseau. Veuillez réessayer dans quelques instants.',
    });
  }

  // ── 4. Erreurs imprévues (500) ────────────────────────────────────
  logger.error('Erreur non gérée', { message: err.message, stack: err.stack, path: req.path });
  maybeAlert(err, req);
  await recordServerError(err, req);

  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: isProd
      ? 'Une erreur inattendue est survenue. Veuillez réessayer dans quelques instants.'
      : err.message,
  });
}