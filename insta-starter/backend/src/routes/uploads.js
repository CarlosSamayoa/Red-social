import { Router } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
const router = Router();

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
router.post('/uploads/presign', requireAuth, async (req,res,next)=>{
  try{
    const { mime } = req.body;
    const key = `originals/${req.user.id}/${crypto.randomUUID()}` + (mime==='image/png'?'.png':'.jpg');
    const cmd = new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: mime });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });
    res.json({ key, url });
  }catch(e){ next(e); }
});
export default router;
