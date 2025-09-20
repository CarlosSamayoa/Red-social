import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import Conversation from '../models/Conversation.js';
import ConversationParticipant from '../models/ConversationParticipant.js';
import Message from '../models/Message.js';
import mongoose from 'mongoose';
const router = Router();
function assertValid(req){ const e=validationResult(req); if(!e.isEmpty()){ const msg=e.array().map(x=>`${x.path}: ${x.msg}`).join(', '); const err=new Error(msg); err.status=400; throw err; }}

// Create/reuse conversation between me and target user
router.post('/dm', requireAuth, [ body('userId').notEmpty() ], async (req,res,next)=>{
  try{
    console.log('POST /dm called by user:', req.user._id);
    console.log('Request body:', req.body);
    assertValid(req);
    const { userId } = req.body;
    
    // Convert to ObjectId if needed
    const targetUserId = new mongoose.Types.ObjectId(userId);
    const currentUserId = new mongoose.Types.ObjectId(req.user._id);
    
    console.log('Looking for conversation between:', currentUserId, 'and', targetUserId);
    
    let conv = await ConversationParticipant.aggregate([
      { $match: { user: { $in: [currentUserId, targetUserId] } } },
      { $group: { _id: '$conversation', users: { $addToSet: '$user' } } },
      { $match: { users: { $all: [currentUserId, targetUserId], $size: 2 } } }
    ]);
    
    console.log('Existing conversation found:', conv);
    
    if (conv.length) {
      console.log('Returning existing conversation:', conv[0]._id);
      return res.json({ conversationId: conv[0]._id });
    }
    
    console.log('Creating new conversation...');
    const c = await Conversation.create({});
    console.log('Conversation created:', c._id);
    
    await ConversationParticipant.create([
      { conversation: c._id, user: currentUserId }, 
      { conversation: c._id, user: targetUserId }
    ]);
    console.log('Participants created');
    
    res.status(201).json({ conversationId: c._id });
  }catch(e){ 
    console.error('Error in POST /dm:', e);
    next(e); 
  }
});

router.get('/dm', requireAuth, async (req,res)=>{
  try {
    // Get conversations with participant details
    const conversations = await ConversationParticipant.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.user._id) } },
      {
        $lookup: {
          from: 'conversationparticipants',
          localField: 'conversation',
          foreignField: 'conversation',
          as: 'allParticipants'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'allParticipants.user',
          foreignField: '_id',
          as: 'participantUsers'
        }
      },
      {
        $project: {
          conversation: 1,
          participants: {
            $map: {
              input: '$participantUsers',
              as: 'user',
              in: {
                _id: '$$user._id',
                username: '$$user.username',
                email: '$$user.email'
              }
            }
          }
        }
      }
    ]);

    res.json({ conversations });
  } catch(e) {
    console.error('Error getting conversations:', e);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

router.get('/dm/:cid/messages', requireAuth, async (req,res)=>{
  const msgs = await Message.find({ conversation: req.params.cid })
    .populate({
      path: 'shared_post',
      select: 'text file user',
      populate: {
        path: 'user',
        select: 'username'
      }
    })
    .populate('sender', 'username')
    .sort({ created_at:-1 })
    .limit(50)
    .lean();
  res.json({ messages: msgs });
});

router.post('/dm/:cid/messages', requireAuth, [ body('body').isLength({min:1}) ], async (req,res,next)=>{
  try{
    assertValid(req);
    const m = await Message.create({ conversation: req.params.cid, sender: req.user._id, body: req.body.body });
    res.status(201).json({ message: m });
  }catch(e){ next(e); }
});

// Typing indicator endpoints
const typingUsers = new Map(); // Store typing state: conversationId -> { userId: timestamp }

router.post('/dm/:cid/typing', requireAuth, async (req,res)=>{
  try {
    const conversationId = req.params.cid;
    const userId = req.user._id;
    
    if (!typingUsers.has(conversationId)) {
      typingUsers.set(conversationId, new Map());
    }
    
    // Set typing with timestamp
    typingUsers.get(conversationId).set(userId, Date.now());
    
    // Auto-clear after 10 seconds
    setTimeout(() => {
      if (typingUsers.has(conversationId)) {
        typingUsers.get(conversationId).delete(userId);
        if (typingUsers.get(conversationId).size === 0) {
          typingUsers.delete(conversationId);
        }
      }
    }, 10000);
    
    res.json({ success: true });
  } catch(e) {
    console.error('Error setting typing:', e);
    res.status(500).json({ error: 'Failed to set typing' });
  }
});

router.get('/dm/:cid/typing', requireAuth, async (req,res)=>{
  try {
    const conversationId = req.params.cid;
    const currentUserId = req.user._id;
    
    if (!typingUsers.has(conversationId)) {
      return res.json({ typingUsers: [] });
    }
    
    const conversationTyping = typingUsers.get(conversationId);
    const now = Date.now();
    
    // Filter out expired typing indicators (older than 10 seconds)
    const activeTyping = [];
    for (const [userId, timestamp] of conversationTyping.entries()) {
      if (now - timestamp < 10000 && userId !== currentUserId) {
        activeTyping.push(userId);
      } else if (now - timestamp >= 10000) {
        conversationTyping.delete(userId);
      }
    }
    
    // Clean up empty conversations
    if (conversationTyping.size === 0) {
      typingUsers.delete(conversationId);
    }
    
    res.json({ typingUsers: activeTyping });
  } catch(e) {
    console.error('Error getting typing:', e);
    res.status(500).json({ error: 'Failed to get typing' });
  }
});

// Send message directly to user (combines conversation creation + message sending)
router.post('/dm/send', requireAuth, [ 
  body('recipient').notEmpty(),
  body('body').optional().isLength({min:0}) // Hacer body opcional para posts compartidos
], async (req,res,next)=>{
  try{
    assertValid(req);
    const { recipient, body: messageBody, shared_post } = req.body;
    
    // Find recipient user by username
    const User = (await import('../models/User.js')).default;
    const recipientUser = await User.findOne({ username: recipient });
    if (!recipientUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const targetUserId = new mongoose.Types.ObjectId(recipientUser._id);
    const currentUserId = new mongoose.Types.ObjectId(req.user._id);
    
    // Find or create conversation
    let conv = await ConversationParticipant.aggregate([
      { $match: { user: { $in: [currentUserId, targetUserId] } } },
      { $group: { _id: '$conversation', users: { $addToSet: '$user' } } },
      { $match: { users: { $all: [currentUserId, targetUserId], $size: 2 } } }
    ]);
    
    let conversationId;
    if (conv.length) {
      conversationId = conv[0]._id;
    } else {
      const c = await Conversation.create({});
      conversationId = c._id;
      await ConversationParticipant.create([
        { conversation: conversationId, user: currentUserId }, 
        { conversation: conversationId, user: targetUserId }
      ]);
    }
    
    // Create message with optional shared post data
    const messageData = { 
      conversation: conversationId, 
      sender: currentUserId, 
      body: messageBody 
    };
    
    if (shared_post) {
      messageData.shared_post = shared_post;
    }
    
    const message = await Message.create(messageData);
    
    res.status(201).json({ 
      success: true,
      message: 'Mensaje enviado correctamente',
      conversationId,
      messageId: message._id
    });
  }catch(e){ 
    console.error('Error in POST /dm/send:', e);
    next(e); 
  }
});

export default router;
