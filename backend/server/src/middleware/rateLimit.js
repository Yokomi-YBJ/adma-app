import rateLimit from 'express-rate-limit';

const hit = (msg) => ({ success: false, code: 'RATE_LIMIT', message: msg });

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200, standardHeaders: 'draft-7', legacyHeaders: false,
  message: hit('Trop de requêtes. Veuillez patienter.'),
  skip: () => process.env.NODE_ENV === 'test',
});

export const otpRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, max: 3, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => req.body?.phone || req.ip,
  message: hit('Trop de tentatives OTP. Attendez 10 minutes.'),
});

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => req.body?.phone || req.body?.email || req.ip,
  message: hit('Trop de tentatives de connexion.'),
});

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, max: 30, standardHeaders: 'draft-7', legacyHeaders: false,
  message: hit("Trop d'uploads. Attendez une heure."),
});

export const reviewRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10, standardHeaders: 'draft-7', legacyHeaders: false,
  message: hit("Trop d'avis déposés. Attendez une heure."),
});

export const reportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5, standardHeaders: 'draft-7', legacyHeaders: false,
  message: hit("Trop de signalements. Attendez une heure."),
});
