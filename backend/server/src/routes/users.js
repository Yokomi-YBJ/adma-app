import { Router } from 'express';
import { body }   from 'express-validator';
import multer     from 'multer';
import { query }  from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { uploadUserAvatar } from '../services/imgdbService.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();
router.use(authenticate);

// Modifier profil
router.put('/me', [
  body('firstName').optional().trim().isLength({ min: 1, max: 80 }),
  body('lastName').optional().trim().isLength({ max: 80 }),
], asyncHandler(async (req, res) => {
  const { firstName, lastName } = req.body;
  const sets = []; const vals = [];
  if (firstName !== undefined) { sets.push('first_name=?'); vals.push(firstName); }
  if (lastName  !== undefined) { sets.push('last_name=?');  vals.push(lastName); }
  if (!sets.length) throw new AppError('Aucune donnée', 400, 'NO_DATA');
  vals.push(req.user.id);
  await query(`UPDATE users SET ${sets.join(',')} WHERE id=?`, vals);
  res.json({ success: true, message: 'Profil mis à jour' });
}));

// Upload avatar
router.post('/avatar', upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Fichier requis', 400, 'NO_FILE');
  const { url, publicId } = await uploadUserAvatar(req.file, req.user.id);
  await query('UPDATE users SET avatar_url=?, cloudinary_id=? WHERE id=?', [url, publicId, req.user.id]);
  res.json({ success: true, data: { avatarUrl: url } });
}));

// Push token
router.post('/push-token', asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (token) await query('UPDATE users SET expo_push_token=? WHERE id=?', [token, req.user.id]);
  res.json({ success: true });
}));

// Préférences notifications
router.get('/notification-preferences', asyncHandler(async (req, res) => {
  const [rows] = await query('SELECT * FROM notification_preferences WHERE user_id=?', [req.user.id]);
  res.json({ success: true, data: rows[0] || {} });
}));

router.put('/notification-preferences', asyncHandler(async (req, res) => {
  const cols = ['new_review','review_response','verification_update','subscription_reminder','favorite_update','contact_reminder'];
  const sets = []; const vals = [];
  cols.forEach(c => { if (req.body[c] !== undefined) { sets.push(`${c}=?`); vals.push(req.body[c] ? 1 : 0); }});
  if (!sets.length) return res.json({ success: true });
  vals.push(req.user.id);
  await query(`UPDATE notification_preferences SET ${sets.join(',')} WHERE user_id=?`, vals);
  res.json({ success: true });
}));

// Supprimer compte (soft delete)
router.delete('/me', asyncHandler(async (req, res) => {
  await query("UPDATE users SET status='deleted', phone=CONCAT('del_',id,'_',phone) WHERE id=?", [req.user.id]);
  await query('UPDATE providers SET is_active=FALSE, deleted_at=NOW() WHERE user_id=?', [req.user.id]);
  res.json({ success: true, message: 'Compte supprimé' });
}));

export default router;
