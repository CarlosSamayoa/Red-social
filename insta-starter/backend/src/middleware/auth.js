import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  
  console.log('🔒 Auth middleware:', { 
    hasAuth: !!auth, 
    hasToken: !!token,
    tokenStart: token?.substring(0, 20) + '...' 
  });
  
  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'missing_token' });
  }
  
  try {
    // Usar el mismo fallback que en issueToken
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-development-only';
    const payload = jwt.verify(token, secret);
    
    console.log('✅ Token verified:', { 
      userId: payload.sub, 
      username: payload.username 
    });
    
    req.user = { 
      _id: payload.sub, 
      id: payload.sub,
      username: payload.username,
      email: payload.email 
    };
    next();
  } catch (e) { 
    console.log('❌ Token verification failed:', e.message);
    return res.status(401).json({ error: 'invalid_token' }); 
  }
}

// Alias para compatibilidad
export const auth = requireAuth;

export function issueToken(user) {
  console.log('🔑 JWT_SECRET status:', { 
    exists: !!process.env.JWT_SECRET, 
    length: process.env.JWT_SECRET?.length 
  });
  
  const payload = { 
    sub: String(user._id), 
    username: user.username,
    email: user.email
  };
  
  // Usar fallback temporal si JWT_SECRET no está disponible
  const secret = process.env.JWT_SECRET || 'fallback-secret-for-development-only';
  
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

// Middleware opcional para cargar datos completos del usuario
export async function loadUser(req, res, next) {
  try {
    if (req.user && req.user._id) {
      const fullUser = await User.findById(req.user._id).select('-password');
      if (fullUser) {
        req.user = fullUser;
      }
    }
    next();
  } catch (error) {
    console.error('Error loading user:', error);
    next(); // Continuar sin cargar usuario completo
  }
}
