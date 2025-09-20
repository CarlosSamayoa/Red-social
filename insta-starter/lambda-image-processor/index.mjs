import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.BUCKET;
export const handler = async (event) => {
  for (const record of event.Records) {
    const key = decodeURIComponent(record.s3.object.key);
    if (!key.startsWith('originals/')) continue;
    const orig = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const buf = Buffer.from(await orig.Body.transformToByteArray());
    const variants = [
      { kind: 'thumb', ops: img => img.resize(256) },
      { kind: 'medium', ops: img => img.resize(1024) },
      { kind: 'bw', ops: img => img.grayscale() },
    ];
    await Promise.all(variants.map(async v => {
      const out = await v.ops(sharp(buf)).jpeg({ quality: 82 }).toBuffer();
      const outKey = key.replace('originals/', `variants/${v.kind}/`);
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: outKey, Body: out, ContentType: 'image/jpeg' }));
    }));
  }
  return { ok: true };
};
