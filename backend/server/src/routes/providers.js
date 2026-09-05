import { Router }  from 'express';
import { body }    from 'express-validator';
import multer      from 'multer';
import * as ctrl   from '../controllers/providerController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { uploadRateLimit }            from '../middleware/rateLimit.js';

const upload = multer({
  storage:    multer.memoryStorage(),
  limits:     { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    cb(null, ['image/jpeg','image/jpg','image/png','image/webp'].includes(file.mimetype)),
});

const router = Router();

// ── Recherche standard ────────────────────────────────────────────
router.get('/',    optionalAuth, ctrl.searchProviders);

// ── Recherche géographique "Autour de moi" ────────────────────────
// GET /api/v1/providers/nearby?lat=7.3&lng=13.5&categoryId=1&page=1
router.get('/nearby', optionalAuth, ctrl.searchNearby);

// ── Ma fiche ──────────────────────────────────────────────────────
router.get('/me',  authenticate, ctrl.getMyProvider);

// ── Détail ────────────────────────────────────────────────────────
router.get('/:id',          optionalAuth, ctrl.getProvider);
router.get('/:id/contact',  authenticate, ctrl.getContact);
router.get('/:id/stats',    authenticate, ctrl.getProviderStats);

// ── CRUD fiche ────────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  uploadRateLimit,
  upload.single('photo'),
  ctrl.createProvider
);
router.put(
  '/:id',
  authenticate,
  uploadRateLimit,
  upload.single('photo'),
  ctrl.updateProvider
);
router.delete('/:id', authenticate, ctrl.deleteProvider);

// ── Géolocalisation zone de service ──────────────────────────────
// POST /api/v1/providers/geo  — définir/mettre à jour la position
router.post('/geo', authenticate, [
  body('latitude').isFloat({ min: -90,  max: 90  }).withMessage('Latitude invalide'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
], ctrl.updateGeoLocation);

// DELETE /api/v1/providers/geo — supprimer la position
router.delete('/geo', authenticate, ctrl.removeGeoLocation);

// ── Vérification CNI ──────────────────────────────────────────────
router.post(
  '/verification-request',
  authenticate,
  uploadRateLimit,
  upload.fields([{ name:'cniFront', maxCount:1 }, { name:'cniBack', maxCount:1 }]),
  ctrl.requestVerification
);

export default router;
