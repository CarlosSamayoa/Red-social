import 'dotenv/config';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import User from '../src/models/User.js';
import Publication from '../src/models/Publication.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/insta';
const ROOT = path.resolve(process.cwd(), 'storage');

async function makeImage(color, outPath){
  const buf = await sharp({ create: { width: 1200, height: 800, channels: 3, background: color } })
    .jpeg({ quality: 82 }).toBuffer();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return buf;
}

async function makeVariants(uid, baseName){
  const orig = path.join(ROOT, 'originals', uid, baseName);
  const img = sharp(orig);
  const kinds = [
    ['thumb', 256],
    ['medium', 1024]
  ];
  const v = [];
  for (const [kind, size] of kinds){
    const out = path.join(ROOT, 'variants', kind, uid, baseName);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const buf = await img.resize(size).jpeg({ quality: 82 }).toBuffer();
    fs.writeFileSync(out, buf);
    v.push({ kind, s3_key: path.relative(ROOT, out).replace(/\\/g,'/') });
  }
  // bw
  const bwOut = path.join(ROOT, 'variants', 'bw', uid, baseName);
  fs.mkdirSync(path.dirname(bwOut), { recursive: true });
  const bwBuf = await sharp(orig).grayscale().jpeg({ quality: 82 }).toBuffer();
  fs.writeFileSync(bwOut, bwBuf);
  v.push({ kind:'bw', s3_key: path.relative(ROOT, bwOut).replace(/\\/g,'/') });
  return v;
}

async function run(){
  await mongoose.connect(MONGO_URI);
  console.log('connected');

  await User.deleteMany({ username: { $in: ['alice','bob','carol'] } });
  await Publication.deleteMany({});

  const users = await User.create([
    { email: 'alice@example.com', username:'alice', name:'Alice' },
    { email: 'bob@example.com', username:'bob', name:'Bob' },
    { email: 'carol@example.com', username:'carol', name:'Carol' }
  ]);

  for (const u of users){
    const uid = String(u._id);
    for (let i=0; i<3; i++){
      const name = `${Date.now()}_${i}.jpg`;
      const color = i===0 ? '#ffcc00' : i===1 ? '#66ccff' : '#ff99cc';
      const orig = path.join(ROOT, 'originals', uid, name);
      await makeImage(color, orig);
      const variants = await makeVariants(uid, name);
      await Publication.create({
        user: uid,
        text: `Demo ${i+1} by ${u.username}`,
        file: { s3_key_original: path.relative(ROOT, orig).replace(/\\/g,'/'), mime:'image/jpeg', variants }
      });
    }
  }
  console.log('seeded');
  process.exit(0);
}

run().catch(e=>{ console.error(e); process.exit(1); });
