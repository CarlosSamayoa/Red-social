import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { requireAuth } from '../middleware/auth.js';
import Publication from '../models/Publication.js';
import Comment from '../models/Comment.js';
import Like from '../models/Like.js';
import Follow from '../models/Follow.js';
import Notification from '../models/Notification.js';

const router = Router();
function assertValid(req){ const e=validationResult(req); if(!e.isEmpty()){ const msg=e.array().map(x=>`${x.path}: ${x.msg}`).join(', '); const err=new Error(msg); err.status=400; throw err; }}

// Follow / Unfollow
router.post('/follows/:username', requireAuth, async (req,res,next)=>{
  try{
    const followedUser = await req.app.get('models')?.User?.findOne({ username: req.params.username }) || null;
    // Fallback: populate via lean query
    const mongoose = (await import('mongoose')).default;
    const User = (await import('../models/User.js')).default;
    const u = followedUser || await User.findOne({ username: req.params.username });
    if(!u) return res.status(404).json({ error:'user_not_found' });
    if(String(u._id) === req.user.id) return res.status(400).json({ error:'cannot_follow_self' });
    const f = await Follow.findOneAndUpdate({ user:req.user.id, followed:u._id }, {}, { upsert:true, new:true, setDefaultsOnInsert:true });
    await Notification.create({ user: u._id, kind:'follow', actor: req.user.id, entity:'follow', entity_id:f._id });
    res.json({ ok:true });
  }catch(e){ next(e); }
});
router.delete('/follows/:username', requireAuth, async (req,res,next)=>{
  try{
    const User = (await import('../models/User.js')).default;
    const u = await User.findOne({ username: req.params.username });
    if(!u) return res.status(404).json({ error:'user_not_found' });
    await Follow.deleteOne({ user:req.user.id, followed:u._id });
    res.json({ ok:true });
  }catch(e){ next(e); }
});

// Create post (after upload)
router.post('/posts', requireAuth, [
  body('text').optional().isString(),
  body('location').optional().isString()
], async (req,res,next)=>{
  try{
    // Validar que tenga al menos un medio (nuevo formato con media[] o legacy con file)
    if (!req.body.media?.length && !req.body.file?.s3_key_original) {
      return res.status(400).json({ 
        error: 'validation_error',
        message: 'Se requiere al menos un archivo (media o file)' 
      });
    }
    
    assertValid(req);
    const post = await Publication.create({ user:req.user.id, ...req.body });
    res.status(201).json({ post });
  }catch(e){ next(e); }
});

// Get post by id
router.get('/posts/:id', requireAuth, async (req,res,next)=>{
  try{
    const postDoc = await Publication.findById(req.params.id).populate('user', 'username name profile_image').lean();
    const post = postDoc;
    if(!post) return res.status(404).json({ error:'not_found' });
    
    // Mapear profile_image a image para compatibilidad con frontend
    if (post.user && post.user.profile_image) {
      post.user.image = post.user.profile_image;
    }
    
    res.json({ post });
  }catch(e){ next(e); }
});

// Feed
router.get('/feed', requireAuth, [ query('page').optional().isInt({min:1}).toInt(), query('limit').optional().isInt({min:1, max:100}).toInt() ], async (req,res,next)=>{
  try{
    const following = await Follow.find({ user: req.user.id }).distinct('followed');
    const page = req.query.page || 1; const limit = req.query.limit || 12; const skip = (page-1)*limit;
    const posts = await Publication.find({ user: { $in: following } })
      .populate('user', 'username name profile_image')
      .sort({ created_at:-1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Mapear profile_image a image en todos los posts
    posts.forEach(post => {
      if (post.user && post.user.profile_image) {
        post.user.image = post.user.profile_image;
      }
    });
    
    // Debug: Ver qué campos tienen los posts
    if (posts.length > 0) {
      console.log('📊 Feed sample post:', {
        _id: posts[0]._id,
        hasMedia: !!posts[0].media,
        mediaLength: posts[0].media?.length,
        mediaType: typeof posts[0].media,
        mediaIsArray: Array.isArray(posts[0].media),
        hasFile: !!posts[0].file,
        fileKeys: posts[0].file ? Object.keys(posts[0].file) : [],
        allKeys: Object.keys(posts[0])
      });
      
      // Si el primer post tiene media, mostrar el primer item
      if (posts[0].media && posts[0].media.length > 0) {
        console.log('📷 First media item:', posts[0].media[0]);
      }
    }
    
    res.json({ posts });
  }catch(e){ next(e); }
});

// Likes
router.post('/posts/:id/like', requireAuth, async (req,res,next)=>{
  try{
    const postId = req.params.id;
    const like = await Like.findOneAndUpdate({ post: postId, user: req.user.id }, {}, { upsert:true, new:true, setDefaultsOnInsert:true });
    const post = await Publication.findById(postId).select('user').lean();
    if (post && String(post.user) !== req.user.id) {
      await Notification.create({ user: post.user, kind:'like', actor: req.user.id, entity:'post', entity_id: postId });
    }
    res.json({ ok:true });
  }catch(e){ next(e); }
});
router.delete('/posts/:id/like', requireAuth, async (req,res)=>{
  await Like.deleteOne({ post: req.params.id, user: req.user.id });
  res.json({ ok:true });
});

// Comments
router.post('/posts/:id/comments', requireAuth, [ body('body').isLength({min:1}) ], async (req,res,next)=>{
  try{
    assertValid(req);
    const c = await Comment.create({ post:req.params.id, user:req.user.id, body:req.body.body });
    const post = await Publication.findById(req.params.id).select('user').lean();
    if (post && String(post.user) !== req.user.id) {
      await Notification.create({ user: post.user, kind:'comment', actor: req.user.id, entity:'post', entity_id: req.params.id });
    }
    res.status(201).json({ comment: c });
  }catch(e){ next(e); }
});
router.get('/posts/:id/comments', requireAuth, async (req,res)=>{
  const list = await Comment.find({ post: req.params.id })
    .populate('user', 'username name profile_image')
    .sort({ created_at:-1 })
    .lean();
  
  // Mapear profile_image a image en todos los comentarios
  list.forEach(comment => {
    if (comment.user && comment.user.profile_image) {
      comment.user.image = comment.user.profile_image;
    }
  });
  
  res.json({ comments: list });
});
router.delete('/comments/:id', requireAuth, async (req,res)=>{
  await Comment.deleteOne({ _id: req.params.id, user: req.user.id });
  res.json({ ok:true });
});



// Likes status
router.get('/posts/:id/likes', requireAuth, async (req,res,next)=>{
  try{
    const postId = req.params.id;
    const count = await Like.countDocuments({ post: postId });
    const liked = !!(await Like.findOne({ post: postId, user: req.user.id }).lean());
    res.json({ count, liked });
  }catch(e){ next(e); }
});

// Feed Adictivo con Algoritmo de Engagement
router.get('/feed/infinite', requireAuth, [
  query('page').optional().isInt({min:1}).toInt(),
  query('limit').optional().isInt({min:1, max:50}).toInt()
], async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const userId = req.user.id;

    // 1. Obtener usuarios seguidos
    const following = await Follow.find({ user: userId }).distinct('followed');
    
    // 2. Algoritmo de Mezcla Adictiva (70% seguidos, 20% trending, 10% aleatorio)
    const followedWeight = Math.floor(limit * 0.7);
    const trendingWeight = Math.floor(limit * 0.2);
    const randomWeight = limit - followedWeight - trendingWeight;

    // 3. Posts de usuarios seguidos (contenido familiar)
    const followedPosts = await Publication.paginate(
      { user: { $in: following } },
      {
        page: 1,
        limit: followedWeight,
        sort: { created_at: -1 },
        populate: { path: 'user', select: 'username name profile_image' },
        lean: true
      }
    );
    
    // Mapear profile_image a image
    followedPosts.docs.forEach(post => {
      if (post.user && post.user.profile_image) {
        post.user.image = post.user.profile_image;
      }
    });

    // 4. Posts trending (con más likes recientes)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trendingPosts = await Publication.aggregate([
      { $match: { created_at: { $gte: oneDayAgo } } },
      {
        $lookup: {
          from: 'likes',
          localField: '_id',
          foreignField: 'post',
          as: 'likes'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $addFields: {
          likeCount: { $size: '$likes' },
          engagementScore: {
            $add: [
              { $size: '$likes' },
              { $multiply: [{ $divide: [{ $subtract: [new Date(), '$created_at'] }, 3600000] }, -0.1] }
            ]
          }
        }
      },
      { $sort: { engagementScore: -1 } },
      { $limit: trendingWeight },
      {
        $project: {
          user: { username: 1, name: 1, profile_image: 1 },
          text: 1,
          location: 1,
          file: 1,
          media: 1,
          created_at: 1
        }
      }
    ]);
    
    // Mapear profile_image a image en trending posts
    trendingPosts.forEach(post => {
      if (post.user && post.user.profile_image) {
        post.user.image = post.user.profile_image;
      }
    });

    // 5. Posts aleatorios (descubrimiento)
    const randomPosts = await Publication.aggregate([
      { $sample: { size: randomWeight } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          user: { username: 1, name: 1, profile_image: 1 },
          text: 1,
          location: 1,
          file: 1,
          media: 1,
          created_at: 1
        }
      }
    ]);
    
    // Mapear profile_image a image en random posts
    randomPosts.forEach(post => {
      if (post.user && post.user.profile_image) {
        post.user.image = post.user.profile_image;
      }
    });

    // 6. Mezclar algoritmos tipo Instagram/TikTok
    let mixedPosts = [];
    const allPosts = [
      ...followedPosts.docs.map(p => ({ ...p, type: 'followed' })),
      ...trendingPosts.map(p => ({ ...p, type: 'trending' })),
      ...randomPosts.map(p => ({ ...p, type: 'random' }))
    ];

    // Algoritmo de intercalado: seguidos -> trending -> aleatorio
    for (let i = 0; i < Math.max(followedPosts.docs.length, trendingPosts.length, randomPosts.length); i++) {
      if (followedPosts.docs[i]) mixedPosts.push({ ...followedPosts.docs[i], type: 'followed' });
      if (trendingPosts[i]) mixedPosts.push({ ...trendingPosts[i], type: 'trending' });
      if (randomPosts[i]) mixedPosts.push({ ...randomPosts[i], type: 'random' });
    }

    // 7. Agregar elementos de gamificación/adicción
    const response = {
      posts: mixedPosts.slice(0, limit),
      pagination: {
        page,
        limit,
        total: followedPosts.totalDocs + trendingPosts.length + randomPosts.length,
        pages: Math.ceil((followedPosts.totalDocs + trendingPosts.length + randomPosts.length) / limit),
        hasNextPage: page < Math.ceil((followedPosts.totalDocs + trendingPosts.length + randomPosts.length) / limit)
      },
      algorithm: {
        followed: followedPosts.docs.length,
        trending: trendingPosts.length,
        random: randomPosts.length,
        message: mixedPosts.length > 0 ? "¡Nuevo contenido disponible! 🔥" : "¡Ya viste todo por hoy! 😴"
      }
    };

    res.json(response);
  } catch (e) {
    next(e);
  }
});

export default router;
