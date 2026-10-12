import { Router } from 'express';
import { body }   from 'express-validator';
import * as ctrl  from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { paymentRateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.use(authenticate);

// ── Initier un paiement (XAF Cameroun uniquement) ───────────────
router.post(
  '/initiate',
  paymentRateLimit,
  [
    body('planId')
      .isIn(['premium', 'professional', 'enterprise'])
      .withMessage('Plan invalide'),
    body('operator')
      .isIn(['orange_cmr', 'mtn_momo_cmr'])
      .withMessage('Opérateur invalide (Cameroun uniquement)'),
    body('phoneNumber')
      .matches(/^(\+?237)?6[5-9]\d{7}$/)
      .withMessage('Numéro camerounais invalide'),
  ],
  ctrl.initPayment
);

// ── Statut d'un paiement ─────────────────────────────────────────
router.get('/:id/status', ctrl.getStatus);

export default router;