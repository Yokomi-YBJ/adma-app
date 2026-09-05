/**
 * ADMA API — Point d'entrée principal
 * Node.js 20+ / Express 4
 */
import './config/env.js'; // Charge .env en premier
import express        from 'express';
import helmet         from 'helmet';
import cors           from 'cors';
import compression    from 'compression';
import morgan         from 'morgan';

import { testConnection }  from './config/database.js';
import { logger }          from './utils/logger.js';
import { globalRateLimit } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Routes
import authRoutes         from './routes/auth.js';
import providerRoutes     from './routes/providers.js';
import reviewRoutes       from './routes/reviews.js';
import favoriteRoutes     from './routes/favorites.js';
import paymentRoutes      from './routes/payments.js';
import contactRoutes      from './routes/contact.js';
import notifRoutes        from './routes/notifications.js';
import userRoutes         from './routes/users.js';
import categoryRoutes     from './routes/categories.js';
import reportRoutes       from './routes/reports.js';
import adminRoutes        from './routes/admin.js';
import webhookRoutes      from './routes/webhooks.js';

// Jobs planifiés
import './jobs/scheduler.js';

const app    = express();
const API    = '/api/v1';

// ── Sécurité ──────────────────────────────────────────────────────
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    cb(new Error('CORS: origine non autorisée'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Refresh-Token'],
}));

// ── Middlewares généraux ──────────────────────────────────────────
app.use(compression());
app.use(morgan('combined', { stream: { write: m => logger.http(m.trim()) } }));

// Webhook KPay — raw body AVANT le parser JSON global
app.use(`${API}/webhooks/kpay`, express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(globalRateLimit);

// ── Routes publiques & authentifiées ─────────────────────────────
app.use(`${API}/auth`,           authRoutes);
app.use(`${API}/providers`,      providerRoutes);
app.use(`${API}/reviews`,        reviewRoutes);
app.use(`${API}/favorites`,      favoriteRoutes);
app.use(`${API}/payments`,       paymentRoutes);
app.use(`${API}/contacts`,       contactRoutes);
app.use(`${API}/notifications`,  notifRoutes);
app.use(`${API}/users`,          userRoutes);
app.use(`${API}/categories`,     categoryRoutes);
app.use(`${API}/reports`,        reportRoutes);
app.use(`${API}/webhooks`,       webhookRoutes);

// ── Routes admin (préfixe séparé) ────────────────────────────────
app.use(`${API}/admin`,          adminRoutes);

// ── Health check ─────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', env: process.env.NODE_ENV });
});

// ── Gestion erreurs ───────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Démarrage ─────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 5000;

async function bootstrap() {
  try {
    await testConnection();
    logger.info('Base de données connectée');
    app.listen(PORT, () => {
      logger.info(`Adma API démarrée sur le port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    // Concaténation explicite pour forcer l'affichage de l'erreur
    logger.error(`Échec démarrage : ${err.message}`);
    
    // Ajout d'un console.error pour afficher la stack trace complète dans le terminal
    console.error(err); 
    
    process.exit(1);
  }
}

bootstrap();

export default app;
