/**
 * ADMA — Routes Admin unifiées
 * Préfixe: /api/v1/admin
 */
import { Router } from 'express';
import { body } from 'express-validator';
import { authenticateAdmin } from '../middleware/auth.js';
import { loginRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// Contrôleurs
import * as authCtrl from '../controllers/admin/adminAuthController.js';
import * as dashCtrl from '../controllers/admin/adminDashboardController.js';
import * as usersCtrl from '../controllers/admin/adminUsersController.js';
import * as provCtrl from '../controllers/admin/adminProvidersController.js';
import * as verifCtrl from '../controllers/admin/adminVerificationsController.js';
import * as revCtrl from '../controllers/admin/adminReviewsController.js';
import * as repCtrl from '../controllers/admin/adminReportsController.js';
import * as subCtrl from '../controllers/admin/adminSubscriptionsController.js';
import * as payCtrl from '../controllers/admin/adminPaymentsController.js';
import * as catCtrl from '../controllers/admin/adminCategoriesController.js';
import * as profCtrl from '../controllers/admin/adminProfileController.js';

const router = Router();

// ── 1. AUTH ADMIN (Publique & OTP) ────────────────────────────────
router.post(
  '/auth/login',
  loginRateLimit,
  [
    body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
    body('password').notEmpty().withMessage('Mot de passe requis'),
  ],
  asyncHandler(authCtrl.login)
);

router.post(
  '/auth/verify-otp',
  loginRateLimit,
  [
    body('adminId').isInt().toInt().withMessage('ID admin invalide'),
    body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Le code doit comporter 6 chiffres'),
  ],
  asyncHandler(authCtrl.verifyOTP)
);

router.get('/auth/me', authenticateAdmin, asyncHandler(authCtrl.getMe));

// ── 2. PROFIL & PARAMÈTRES ADMIN ──────────────────────────────────
router.get('/profile', authenticateAdmin, asyncHandler(profCtrl.getProfile));
router.put(
  '/profile',
  authenticateAdmin,
  [
    body('fullName').optional().trim().notEmpty().withMessage('Le nom ne peut être vide'),
    body('email').optional().isEmail().withMessage('Email invalide'),
  ],
  asyncHandler(profCtrl.updateProfile)
);
router.put(
  '/profile/password',
  authenticateAdmin,
  [
    body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
    body('newPassword').isLength({ min: 8 }).withMessage('Le nouveau mot de passe doit comporter au moins 8 caractères'),
  ],
  asyncHandler(profCtrl.changePassword)
);

// ── 3. DASHBOARD STATS ────────────────────────────────────────────
router.get('/stats/dashboard', authenticateAdmin, asyncHandler(dashCtrl.getDashboardStats));

// ── 4. UTILISATEURS ───────────────────────────────────────────────
router.get('/users', authenticateAdmin, asyncHandler(usersCtrl.getUsers));
router.get('/users/:id', authenticateAdmin, asyncHandler(usersCtrl.getUserById));
router.patch('/users/:id/suspend', authenticateAdmin, asyncHandler(usersCtrl.suspendUser));
router.patch('/users/:id/activate', authenticateAdmin, asyncHandler(usersCtrl.activateUser));
router.delete('/users/:id', authenticateAdmin, asyncHandler(usersCtrl.deleteUser));

// ── 5. PRESTATAIRES ───────────────────────────────────────────────
router.get('/providers', authenticateAdmin, asyncHandler(provCtrl.getProviders));
router.get('/providers/:id', authenticateAdmin, asyncHandler(provCtrl.getProviderById));
router.put('/providers/:id', authenticateAdmin, asyncHandler(provCtrl.updateProvider));
router.patch('/providers/:id/suspend', authenticateAdmin, asyncHandler(provCtrl.suspendProvider));
router.patch('/providers/:id/activate', authenticateAdmin, asyncHandler(provCtrl.activateProvider));
router.delete('/providers/:id', authenticateAdmin, asyncHandler(provCtrl.deleteProvider));

// ── 6. VÉRIFICATIONS CNI ──────────────────────────────────────────
router.get('/verifications', authenticateAdmin, asyncHandler(verifCtrl.getVerificationRequests));
router.get('/verifications/:id', authenticateAdmin, asyncHandler(verifCtrl.getVerificationById));
router.patch(
  '/verifications/:id/approve',
  authenticateAdmin,
  [body('badgeType').optional().isIn(['verified_id', 'verified']).withMessage('Type de badge invalide')],
  asyncHandler(verifCtrl.approveVerification)
);
router.patch(
  '/verifications/:id/reject',
  authenticateAdmin,
  [body('reason').optional().trim()],
  asyncHandler(verifCtrl.rejectVerification)
);

// Rétrocompatibilité d'anciens endpoints
router.get('/providers/verification-requests', authenticateAdmin, asyncHandler(verifCtrl.getVerificationRequests));
router.patch('/providers/verification-requests/:id/approve', authenticateAdmin, asyncHandler(verifCtrl.approveVerification));
router.patch('/providers/verification-requests/:id/reject', authenticateAdmin, asyncHandler(verifCtrl.rejectVerification));

// ── 7. AVIS ───────────────────────────────────────────────────────
router.get('/reviews', authenticateAdmin, asyncHandler(revCtrl.getReviews));
router.patch('/reviews/:id/hide', authenticateAdmin, asyncHandler(revCtrl.hideReview));
router.patch('/reviews/:id/restore', authenticateAdmin, asyncHandler(revCtrl.restoreReview));
router.delete('/reviews/:id', authenticateAdmin, asyncHandler(revCtrl.deleteReview));

// ── 8. SIGNALEMENTS ───────────────────────────────────────────────
router.get('/reports', authenticateAdmin, asyncHandler(repCtrl.getReports));
router.patch('/reports/:id/resolve', authenticateAdmin, asyncHandler(repCtrl.resolveReport));
router.patch('/reports/:id/dismiss', authenticateAdmin, asyncHandler(repCtrl.dismissReport));

// ── 9. ABONNEMENTS ────────────────────────────────────────────────
router.get('/subscriptions', authenticateAdmin, asyncHandler(subCtrl.getSubscriptions));
router.post(
  '/subscriptions/activate',
  authenticateAdmin,
  [
    body('providerId').isInt().toInt().withMessage('ID prestataire requis'),
    body('plan').isIn(['free', 'premium', 'professional', 'enterprise']).withMessage('Plan invalide'),
    body('days').optional().isInt({ min: 1, max: 365 }).withMessage('Nombre de jours invalide'),
  ],
  asyncHandler(subCtrl.manualActivateSubscription)
);
router.patch('/subscriptions/:id/cancel', authenticateAdmin, asyncHandler(subCtrl.cancelSubscription));

// ── 10. PAIEMENTS ─────────────────────────────────────────────────
router.get('/payments', authenticateAdmin, asyncHandler(payCtrl.getPayments));

// ── 11. CATÉGORIES ────────────────────────────────────────────────
router.get('/categories', authenticateAdmin, asyncHandler(catCtrl.getCategories));
router.post(
  '/categories',
  authenticateAdmin,
  [
    body('nameFr').trim().notEmpty().withMessage('Le nom en français est requis'),
    body('nameEn').trim().notEmpty().withMessage('Le nom en anglais est requis'),
  ],
  asyncHandler(catCtrl.createCategory)
);
router.patch('/categories/:id', authenticateAdmin, asyncHandler(catCtrl.updateCategory));
router.delete('/categories/:id', authenticateAdmin, asyncHandler(catCtrl.deleteCategory));

// ── 12. GESTION DES ADMINS & AUDIT LOGS ────────────────────────────
router.get('/admins', authenticateAdmin, asyncHandler(profCtrl.getAdmins));
router.post(
  '/admins',
  authenticateAdmin,
  [
    body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Mot de passe de 8 caractères minimum'),
    body('fullName').trim().notEmpty().withMessage('Nom complet requis'),
  ],
  asyncHandler(profCtrl.createAdmin)
);
router.patch('/admins/:id/toggle', authenticateAdmin, asyncHandler(profCtrl.toggleAdminStatus));
router.get('/logs', authenticateAdmin, asyncHandler(profCtrl.getLogs));

export default router;
