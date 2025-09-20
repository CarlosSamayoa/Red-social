import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Conversation from '../src/models/Conversation.js';
import ConversationParticipant from '../src/models/ConversationParticipant.js';

dotenv.config();

async function cleanDuplicateConversations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all conversation participants grouped by conversation
    const allConversations = await ConversationParticipant.aggregate([
      {
        $group: {
          _id: '$conversation',
          participants: { $push: '$user' },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: 2 // Only conversations with exactly 2 participants
        }
      }
    ]);

    console.log(`Found ${allConversations.length} total conversations`);

    // Group conversations by participant pairs
    const conversationsByUserPair = {};
    
    for (const conv of allConversations) {
      // Sort participants to create a consistent key
      const sortedParticipants = conv.participants.sort().map(p => p.toString());
      const key = sortedParticipants.join('-');
      
      if (!conversationsByUserPair[key]) {
        conversationsByUserPair[key] = [];
      }
      conversationsByUserPair[key].push(conv._id);
    }

    // Find duplicates
    let totalDeleted = 0;
    for (const [userPair, conversations] of Object.entries(conversationsByUserPair)) {
      if (conversations.length > 1) {
        console.log(`\n👥 User pair ${userPair} has ${conversations.length} conversations`);
        
        // Keep the first conversation, delete the rest
        const conversationsToDelete = conversations.slice(1);
        console.log(`🗑️  Deleting ${conversationsToDelete.length} duplicate conversations`);

        for (const convId of conversationsToDelete) {
          // Delete conversation participants
          const deletedParticipants = await ConversationParticipant.deleteMany({ conversation: convId });
          console.log(`   Deleted ${deletedParticipants.deletedCount} participants for conversation ${convId}`);
          
          // Delete the conversation itself
          const deletedConv = await Conversation.deleteOne({ _id: convId });
          console.log(`   Deleted conversation ${convId} (${deletedConv.deletedCount} docs)`);
          
          totalDeleted++;
        }
      }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} duplicate conversations`);
    
    // Show remaining conversations count
    const remainingCount = await Conversation.countDocuments();
    console.log(`📋 Remaining conversations: ${remainingCount}`);

  } catch (error) {
    console.error('❌ Error cleaning conversations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}

cleanDuplicateConversations();