import { Router } from 'express';
import { Storage } from '@google-cloud/storage';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
const router = Router();

// Initialize GCS client if bucket is configured
const GCS_BUCKET = process.env.GCS_BUCKET || process.env.S3_BUCKET || '';
let storage;
if (GCS_BUCKET) {
  try {
    storage = new Storage();
    console.log('🔷 GCS signed URL service enabled. Bucket:', GCS_BUCKET);
  } catch (e) {
    console.warn('⚠️ GCS storage initialization failed:', e.message);
  }
}

// Generate signed upload URL for direct browser uploads to GCS
router.post('/uploads/presign', requireAuth, async (req, res, next) => {
  try {
    if (!storage || !GCS_BUCKET) {
      return res.status(503).json({ 
        error: 'Cloud storage not configured',
        message: 'GCS_BUCKET environment variable is required'
      });
    }

    const { mime } = req.body;
    if (!mime || !mime.startsWith('image/')) {
      return res.status(400).json({ error: 'Invalid mime type. Only images allowed.' });
    }

    const ext = mime === 'image/png' ? '.png' : mime === 'image/gif' ? '.gif' : '.jpg';
    const key = `originals/${req.user.id}/${crypto.randomUUID()}${ext}`;
    
    const bucket = storage.bucket(GCS_BUCKET);
    const file = bucket.file(key);

    // Generate signed URL for PUT upload (valid for 15 minutes)
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: mime,
    });

    res.json({ 
      key, 
      url,
      method: 'PUT',
      headers: {
        'Content-Type': mime
      }
    });
  } catch (e) {
    console.error('❌ Error generating signed URL:', e);
    next(e);
  }
});

export default router;
