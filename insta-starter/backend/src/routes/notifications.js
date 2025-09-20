import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Notification from '../models/Notification.js';
const router = Router();

router.get('/notifications', requireAuth, async (req,res)=>{
  const list = await Notification.find({ user: req.user.id }).sort({ created_at:-1 }).limit(50).populate('actor','username name image').lean();
  res.json({ notifications: list });
});

router.post('/notifications/read', requireAuth, async (req,res)=>{
  await Notification.updateMany({ user: req.user.id, is_read: false }, { $set: { is_read: true } });
  res.json({ ok:true });
});

export default router;
