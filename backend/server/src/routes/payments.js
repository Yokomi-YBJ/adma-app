import { Router } from 'express';
import { body }   from 'express-validator';
import * as ctrl  from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.post('/initiate', [
  body('planId').isIn(['premium','professional','enterprise']),
  body('operator').isIn(['orange_cmr','mtn_momo_cmr']),
  body('phoneNumber').matches(/^\+?237?6[5-9]\d{7}$/),
], ctrl.initPayment);
router.get('/:id/status', ctrl.getStatus);
export default router;
