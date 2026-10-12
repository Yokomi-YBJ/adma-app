import { Router } from 'express';
import { body }   from 'express-validator';
import * as ctrl  from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { paymentRateLimit } from '../middleware/rateLimit.js';

const router = Router();
router.use(authenticate);

// ── Initier un paiement (ou programmer un downgrade) ────────────
router.post(
  '/initiate',
  paymentRateLimit,
  [
    body('planId')
      .isIn(['premium', 'professional', 'enterprise'])
      .withMessage('Plan invalide'),
    body('operator')
      .isIn(['orange_cmr', 'mtn_momo_cmr'])
      .withMessage('Opérateur invalide'),
    body('phoneNumber')
      .matches(/^(\+?237)?6[5-9]\d{7}$/)
      .withMessage('Numéro camerounais invalide'),
  ],
  ctrl.initPayment
);

// ── Gestion de la programmation de downgrade ────────────────────
router.get('/pending-plan',     ctrl.getPendingPlan);
router.delete('/pending-plan',  ctrl.cancelPendingPlan);

// ── Historique des paiements ────────────────────────────────────
router.get('/history',          ctrl.getHistory);

// ── Statut d'un paiement ────────────────────────────────────────
router.get('/:id/status', ctrl.getStatus);

export default router;