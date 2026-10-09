import rateLimit from 'express-rate-limit';

const hit = (msg) => ({ success: false, code: 'RATE_LIMIT', message: msg });

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200, standardHeaders: 'draft-7', legacyHeaders: false,
  message: hit('Trop de requêtes. Veuillez patienter.'),
  skip: () => process.env.NODE_ENV === 'test',
});

// Protection anti-bombing SMS : limite par IP (max 10 requêtes par 15 min)
export const otpIpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: hit('Trop de demandes de code depuis cette connexion. Veuillez patienter 15 minutes.'),
  skip: () => process.env.NODE_ENV === 'test',
});

// Limite par numéro de téléphone (max 3 requêtes par 10 min)
export const otpPhoneRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, max: 3, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => req.body?.phone || req.ip,
  message: hit('Trop de tentatives pour ce numéro. Attendez 10 minutes avant de redemander un code.'),
  skip: () => process.env.NODE_ENV === 'test',
});

export const otpRateLimit = [otpIpRateLimit, otpPhoneRateLimit];

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

// ── Paiements ─────────────────────────────────────────────────────
// 3 tentatives de paiement par 10 minutes par utilisateur
// Évite le spam d'appels à KPay (chaque initiate coûte une requête API)
export const paymentRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `user_${req.user?.id || req.ip}`,
  message: hit('Trop de tentatives de paiement. Attendez 10 minutes.'),
});