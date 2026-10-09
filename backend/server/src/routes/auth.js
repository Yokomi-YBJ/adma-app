import { Router } from 'express';
import { body }   from 'express-validator';
import * as ctrl  from '../controllers/authController.js';
import { authenticate }          from '../middleware/auth.js';
import { otpRateLimit, loginRateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Plages mobiles Cameroun valides : 64X, 65X, 66X, 67X, 68X, 69X
const phoneRule = body('phone').trim().notEmpty()
  .matches(/^(\+237|237)?6[4-9]\d{7}$/)
  .withMessage('Numéro camerounais invalide (plages mobiles : 64X à 69X)');

router.post('/send-otp',   otpRateLimit,   [phoneRule],                  ctrl.sendOTP);
router.post('/verify-otp', loginRateLimit, [
  phoneRule,
  body('code').trim().isLength({ min:6, max:6 }).isNumeric().withMessage('Code à 6 chiffres requis'),
  body('deviceInfo').optional().isString().trim().isLength({ max:300 }),
], ctrl.verifyOTP);
router.post('/refresh',    ctrl.refreshToken);
router.post('/logout',     ctrl.logout);
router.get('/me',          authenticate, ctrl.getMe);

export default router;