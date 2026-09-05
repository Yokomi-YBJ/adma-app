import { logger } from '../utils/logger.js';

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

export function errorHandler(err, req, res, _next) {
  if (err.name === 'AppError') {
    if (err.statusCode >= 500)
      logger.error(`[${err.code}] ${err.message}`, { path: req.path });
    return res.status(err.statusCode).json({
      success: false, code: err.code, message: err.message,
      ...(err.data && { errors: err.data }),
    });
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, code: 'DUPLICATE', message: 'Cette ressource existe déjà' });
  }
  logger.error('Erreur non gérée', { message: err.message, stack: err.stack, path: req.path });
  res.status(500).json({
    success: false, code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Erreur interne' : err.message,
  });
}
