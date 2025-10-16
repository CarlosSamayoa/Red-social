import mongoose from 'mongoose';
import Publication from '../src/models/Publication.js';
import 'dotenv/config';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/insta';

async function cleanCorruptPosts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Encontrar publicaciones sin media ni file
    const corruptPosts = await Publication.find({
      $and: [
        { $or: [
          { media: { $exists: false } },
          { media: { $size: 0 } }
        ]},
        { $or: [
          { 'file.s3_key_original': { $exists: false } },
          { 'file.s3_key_original': null },
          { 'file.s3_key_original': '' }
        ]}
      ]
    }).lean();

    console.log(`\n🔍 Found ${corruptPosts.length} corrupt posts (no media and no file)`);

    if (corruptPosts.length > 0) {
      console.log('\nCorrupt posts:');
      corruptPosts.forEach(post => {
        console.log(`  - ${post._id}: media=${post.media?.length || 0}, file=${!!post.file?.s3_key_original}`);
      });

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      readline.question('\n⚠️  Do you want to DELETE these corrupt posts? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes') {
          const result = await Publication.deleteMany({
            _id: { $in: corruptPosts.map(p => p._id) }
          });
          console.log(`\n✅ Deleted ${result.deletedCount} corrupt posts`);
        } else {
          console.log('\n❌ Cancelled. No posts were deleted.');
        }
        
        readline.close();
        await mongoose.disconnect();
        process.exit(0);
      });
    } else {
      console.log('\n✨ No corrupt posts found!');
      await mongoose.disconnect();
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cleanCorruptPosts();
