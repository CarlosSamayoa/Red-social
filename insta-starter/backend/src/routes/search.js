import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import User from '../models/User.js';
import Follow from '../models/Follow.js';
import Publication from '../models/Publication.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
function assertValid(req){ const e=validationResult(req); if(!e.isEmpty()){ const msg=e.array().map(x=>`${x.path}: ${x.msg}`).join(', '); const err=new Error(msg); err.status=400; throw err; }}

router.get('/search/users', requireAuth, [ query('q').optional().isString().trim().isLength({min:1}) ], async (req,res,next)=>{
  try{
    assertValid(req);
    const q = req.query.q;
    const limit = parseInt(req.query.limit) || 20;
    
    let list;
    if (q) {
      // Search with query
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      list = await User.find({ $or: [{ username: rx }, { name: rx }] })
        .select('username name image')
        .limit(limit).lean();
    } else {
      // Get suggested users (recent users, excluding current user)
      list = await User.find({ _id: { $ne: req.user.id } })
        .select('username name image')
        .sort({ createdAt: -1 })
        .limit(limit).lean();
    }
    
    const ids = list.map(u => u._id);
    const following = await Follow.find({ user: req.user.id, followed: { $in: ids } }).distinct('followed');
    const enriched = list.map(u => ({ ...u, isFollowing: following.some(id => String(id) === String(u._id)) }));
    res.json({ users: enriched });
  }catch(e){ next(e); }
});

// Search posts
router.get('/search/posts', requireAuth, [ query('q').optional().isString().trim().isLength({min:1}) ], async (req,res,next)=>{
  try{
    assertValid(req);
    const q = req.query.q;
    const limit = parseInt(req.query.limit) || 20;
    
    let list;
    if (q) {
      // Search posts by text content
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      list = await Publication.find({ text: rx })
        .populate('user', 'username name image')
        .sort({ created_at: -1 })
        .limit(limit).lean();
    } else {
      // Get recent posts from all users
      list = await Publication.find({})
        .populate('user', 'username name image')
        .sort({ created_at: -1 })
        .limit(limit).lean();
    }
    
    // ✅ Los posts ya incluyen el campo media por usar .lean() sin projection
    res.json({ posts: list });
  }catch(e){ next(e); }
});

// Explorador Infinito - Descubrimiento de contenido
router.get('/explore/infinite', requireAuth, [
  query('page').optional().isInt({min:1}).toInt(),
  query('limit').optional().isInt({min:1, max:50}).toInt(),
  query('category').optional().isString()
], async (req, res, next) => {
  try {
    assertValid(req);
    const page = req.query.page || 1;
    const limit = req.query.limit || 24; // Grid 6x4 típico de Instagram
    const category = req.query.category;
    const userId = req.user.id;

    // Obtener usuarios que NO sigue para descubrimiento
    const following = await Follow.find({ user: userId }).distinct('followed');
    following.push(userId); // Excluir también posts propios

    let query = { user: { $nin: following } };
    let sortOptions = {};

    // Algoritmo de categorización para explorar
    switch (category) {
      case 'trending':
        // Posts con más engagement reciente
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        query.created_at = { $gte: threeDaysAgo };
        
        const trendingPosts = await Publication.aggregate([
          { $match: query },
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
              from: 'comments',
              localField: '_id',
              foreignField: 'post',
              as: 'comments'
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
              engagementScore: {
                $add: [
                  { $multiply: [{ $size: '$likes' }, 2] },
                  { $size: '$comments' },
                  { $multiply: [{ $divide: [{ $subtract: [new Date(), '$created_at'] }, 3600000] }, -0.05] }
                ]
              }
            }
          },
          { $sort: { engagementScore: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              user: { username: 1, name: 1, image: 1 },
              text: 1,
              location: 1,
              file: 1,
              media: 1,
              created_at: 1,
              engagementScore: 1
            }
          }
        ]);
        
        return res.json({
          posts: trendingPosts,
          category: 'trending',
          pagination: { page, limit, hasNextPage: trendingPosts.length === limit },
          algorithm: { type: 'engagement-based', description: '🔥 Contenido en tendencia' }
        });

      case 'recent':
        sortOptions = { created_at: -1 };
        break;

      case 'random':
        // Aleatorio para serendipity
        const randomPosts = await Publication.aggregate([
          { $match: query },
          { $sample: { size: limit } },
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
              user: { username: 1, name: 1, image: 1 },
              text: 1,
              location: 1,
              file: 1,
              media: 1,
              created_at: 1
            }
          }
        ]);
        
        return res.json({
          posts: randomPosts,
          category: 'random',
          pagination: { page, limit, hasNextPage: randomPosts.length === limit },
          algorithm: { type: 'serendipity', description: '🎲 Descubre algo nuevo' }
        });

      case 'nearby':
        // Si tuviéramos geolocalización, sería por proximidad
        sortOptions = { created_at: -1 };
        break;

      default:
        // Algoritmo híbrido por defecto (50% reciente, 30% trending, 20% aleatorio)
        const recentLimit = Math.floor(limit * 0.5);
        const trendLimit = Math.floor(limit * 0.3);
        const randomLimit = limit - recentLimit - trendLimit;

        // Posts recientes
        const recentPosts = await Publication.paginate(query, {
          page: 1,
          limit: recentLimit,
          sort: { created_at: -1 },
          populate: { path: 'user', select: 'username name image' },
          lean: true
        });

        // Posts trending
        const trendingQuery = { ...query, created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };
        const trendingResults = await Publication.aggregate([
          { $match: trendingQuery },
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
              likeCount: { $size: '$likes' }
            }
          },
          { $sort: { likeCount: -1, created_at: -1 } },
          { $limit: trendLimit },
          {
            $project: {
              user: { username: 1, name: 1, image: 1 },
              text: 1,
              location: 1,
              file: 1,
              media: 1,
              created_at: 1
            }
          }
        ]);

        // Posts aleatorios
        const randomResults = await Publication.aggregate([
          { $match: query },
          { $sample: { size: randomLimit } },
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
              user: { username: 1, name: 1, image: 1 },
              text: 1,
              location: 1,
              file: 1,
              media: 1,
              created_at: 1
            }
          }
        ]);

        // Mezclar resultados de manera inteligente evitando duplicados
        const seenIds = new Set();
        const mixedPosts = [];
        const maxLength = Math.max(recentPosts.docs.length, trendingResults.length, randomResults.length);
        
        for (let i = 0; i < maxLength; i++) {
          if (recentPosts.docs[i] && !seenIds.has(String(recentPosts.docs[i]._id))) {
            mixedPosts.push({ ...recentPosts.docs[i], source: 'recent' });
            seenIds.add(String(recentPosts.docs[i]._id));
          }
          if (trendingResults[i] && !seenIds.has(String(trendingResults[i]._id))) {
            mixedPosts.push({ ...trendingResults[i], source: 'trending' });
            seenIds.add(String(trendingResults[i]._id));
          }
          if (randomResults[i] && !seenIds.has(String(randomResults[i]._id))) {
            mixedPosts.push({ ...randomResults[i], source: 'random' });
            seenIds.add(String(randomResults[i]._id));
          }
        }

        return res.json({
          posts: mixedPosts.slice(0, limit),
          category: 'mixed',
          pagination: {
            page,
            limit,
            hasNextPage: mixedPosts.length === limit,
            total: recentPosts.totalDocs
          },
          algorithm: {
            type: 'hybrid-discovery',
            composition: { recent: recentPosts.docs.length, trending: trendingResults.length, random: randomResults.length },
            description: '✨ Algoritmo de descubrimiento personalizado'
          }
        });
    }

    // Fallback para categorías específicas
    const results = await Publication.paginate(query, {
      page,
      limit,
      sort: sortOptions,
      populate: { path: 'user', select: 'username name image' },
      lean: true
    });

    res.json({
      posts: results.docs,
      category: category || 'default',
      pagination: {
        page: results.page,
        limit: results.limit,
        total: results.totalDocs,
        pages: results.totalPages,
        hasNextPage: results.hasNextPage
      },
      algorithm: { type: 'standard', description: '📱 Exploración estándar' }
    });

  } catch (e) {
    next(e);
  }
});

export default router;
