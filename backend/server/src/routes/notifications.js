import { Router } from 'express';
import { query }  from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
  const { limit = 50, page = 1 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const [rows] = await query(
    'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [req.user.id, parseInt(limit), offset]
  );
  res.json({ success: true, data: rows });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  await query(
    'UPDATE notifications SET is_read=TRUE, read_at=NOW() WHERE id=? AND user_id=?',
    [req.params.id, req.user.id]
  );
  res.json({ success: true });
}));

router.patch('/read-all', asyncHandler(async (req, res) => {
  await query(
    'UPDATE notifications SET is_read=TRUE, read_at=NOW() WHERE user_id=? AND is_read=FALSE',
    [req.user.id]
  );
  res.json({ success: true });
}));

export default router;
