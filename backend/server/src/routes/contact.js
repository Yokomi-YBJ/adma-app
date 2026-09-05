import { Router } from 'express';
import { query }  from '../config/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();
const ALLOWED = ['profile_view','phone_click','whatsapp_click'];

router.post('/', optionalAuth, asyncHandler(async (req, res) => {
  const { providerId, eventType } = req.body;
  if (!ALLOWED.includes(eventType) || !providerId) {
    return res.status(400).json({ success: false, message: 'Données invalides' });
  }
  await query(
    'INSERT INTO contact_events (provider_id, user_id, event_type) VALUES (?,?,?)',
    [providerId, req.user?.id || null, eventType]
  );
  res.json({ success: true });
}));

export default router;
