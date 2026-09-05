import { Router } from 'express';
import { body }   from 'express-validator';
import { query }  from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { reportRateLimit } from '../middleware/rateLimit.js';

const router = Router();
const VALID_REASONS = ['fake_provider','wrong_number','wrong_info','activity_not_exist',
  'problematic_behavior','fake_review','offensive','defamation','spam','other'];

router.post('/', authenticate, reportRateLimit, [
  body('targetType').isIn(['provider','review']),
  body('targetId').isInt().toInt(),
  body('reason').isIn(VALID_REASONS),
  body('description').optional().trim().isLength({ max: 500 }),
], asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, description } = req.body;
  await query(
    'INSERT INTO reports (reporter_id, target_type, target_id, reason, description) VALUES (?,?,?,?,?)',
    [req.user.id, targetType, targetId, reason, description || null]
  );
  res.status(201).json({ success: true, message: 'Signalement envoyé' });
}));

export default router;
