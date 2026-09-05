import { Router } from 'express';
import { body }   from 'express-validator';
import * as ctrl  from '../controllers/reviewController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { reviewRateLimit } from '../middleware/rateLimit.js';

const router = Router();
router.get('/',         optionalAuth, ctrl.getReviews);
router.post('/',        authenticate, reviewRateLimit, [
  body('providerId').isInt().toInt(),
  body('verdict').isIn(['recommend','neutral','discourage']),
  body('comment').optional().trim().isLength({ max: 500 }),
], ctrl.createReview);
router.post('/:id/response', authenticate, [body('comment').trim().isLength({ min:1, max:500 })], ctrl.createReviewResponse);
router.delete('/:id',   authenticate, ctrl.deleteReview);
export default router;
