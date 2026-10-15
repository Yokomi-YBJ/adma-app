import rateLimit from 'express-rate-limit';

const hit = (msg) => ({ success: false, code: 'RATE_LIMIT', message: msg });

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200, standardHeaders: 'draft-7', legacyHeaders: false,
  message: hit('Trop de requêtes. Veuillez patienter.'),
  skip: () => process.env.NODE_ENV === 'test',
});

// ── OTP mobile ─────────────────────────────────────────────────────
export const otpIpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: hit('Trop de demandes de code depuis cette connexion. Veuillez patienter 15 minutes.'),
  skip: () => process.env.NODE_ENV === 'test',
});

export const otpPhoneRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, max: 3, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => req.body?.phone || req.ip,
  message: hit('Trop de tentatives pour ce numéro. Attendez 10 minutes avant de redemander un code.'),
  skip: () => process.env.NODE_ENV === 'test',
});

export const otpRateLimit = [otpIpRateLimit, otpPhoneRateLimit];

// ── Login utilisateur (mobile) ─────────────────────────────────────
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, standardHeaders: 'draft-7', legacyHeaders: false,
  keyGenerator: (req) => req.body?.phone || req.body?.email || req.ip,
  message: hit('Trop de tentatives de connexion.'),
});

// ── Login admin (anti-brute-force renforcé) ────────────────────────
// 5 tentatives / 15 min par IP (endpoint sensible)
export const adminLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `admin:${req.ip}`,
  message: hit('Trop de tentatives de connexion admin. Blocage temporaire.'),
  skip: () => process.env.NODE_ENV === 'test',
});

// ── Anti-scanner global sur tout /admin et /auth ───────────────────
// 30 requêtes / minute par IP (bloque les scripts de scan)
export const scannerRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: hit('Trop de requêtes. Ralentissez.'),
  skip: () => process.env.NODE_ENV === 'test',
});

// ── Uploads ────────────────────────────────────────────────────────
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
// 5 tentatives / 10 min par utilisateur (au lieu de 3, moins frustrant)
export const paymentRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `user_${req.user?.id || req.ip}`,
  message: hit('Trop de tentatives de paiement. Attendez 10 minutes.'),
});