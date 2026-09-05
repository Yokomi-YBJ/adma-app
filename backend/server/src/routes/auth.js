import { Router } from 'express';
import { body }   from 'express-validator';
import * as ctrl  from '../controllers/authController.js';
import { authenticate }          from '../middleware/auth.js';
import { otpRateLimit, loginRateLimit } from '../middleware/rateLimit.js';

const router = Router();

const phoneRule = body('phone').trim().notEmpty()
  .matches(/^(\+237|237)?6[5-9]\d{7}$/).withMessage('Numéro camerounais invalide (ex: 6XXXXXXXX)');

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
