/**
 * ADMA — Helpers de réponse HTTP
 */
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name       = 'AppError';
    this.statusCode = statusCode;
    this.code       = `HTTP_${statusCode}`;
  }
}
// Alias pour compatibilité
export { ApiError as AppError };

export function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function paginated(res, data, total, page, limit) {
  return res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
