import mongoose from 'mongoose';
import Publication from '../src/models/Publication.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/insta';

async function migrateOldPosts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Encontrar publicaciones con file pero sin media
    const oldPosts = await Publication.find({
      $and: [
        { 'file.s3_key_original': { $exists: true, $ne: null, $ne: '' } },
        { $or: [
          { media: { $exists: false } },
          { media: { $size: 0 } }
        ]}
      ]
    });

    console.log(`\n🔍 Found ${oldPosts.length} old posts to migrate (have file but no media)`);

    if (oldPosts.length > 0) {
      console.log('\nMigrating posts...');
      
      let migratedCount = 0;
      for (const post of oldPosts) {
        // Crear media array desde file
        const mediaItem = {
          s3_key_original: post.file.s3_key_original,
          mime: post.file.mime || 'image/jpeg',
          width: post.file.width,
          height: post.file.height,
          size_bytes: post.file.size_bytes,
          variants: post.file.variants || [],
          filter: post.filter || 'original',
          media_type: 'image'
        };

        // Actualizar el post
        await Publication.updateOne(
          { _id: post._id },
          { $set: { media: [mediaItem] } }
        );

        migratedCount++;
        console.log(`  ✅ Migrated: ${post._id}`);
      }

      console.log(`\n✨ Successfully migrated ${migratedCount} posts!`);
    } else {
      console.log('\n✨ No old posts to migrate!');
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateOldPosts();
