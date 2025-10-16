import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import { rateLimit } from './src/middleware/ratelimit.js';
import mongoose from 'mongoose';
import passport from './src/config/passport.js';
import authRoutes from './src/routes/auth.js';
import authDevRoutes from './src/routes/auth.dev.js';
import userRoutes from './src/routes/users.js';
import socialRoutes from './src/routes/social.js';
import uploadRoutes from './src/routes/uploads.js';
import uploadLocalRoutes from './src/routes/uploads.local.js';
import dmRoutes from './src/routes/dm.js';
import notifRoutes from './src/routes/notifications.js';
import searchRoutes from './src/routes/search.js';
import friendsRoutes from './src/routes/friends.js';

const app = express();

// Configuración de sesiones para Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'tu-secret-key-aqui',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json({ limit: '10mb' }));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "http://localhost:5173", "http://localhost:5174"]
    }
  }
}));
app.use(morgan('dev'));

// Usar cors package con una lista de orígenes permitidos. Evita middleware manual que pueda duplicar headers.
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:5174', 
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // permitir solicitudes sin origin (curl, server-to-server, Postman)
    if (!origin) return cb(null, true);
    // permitir si está en la lista
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // rechazar sin error (simplemente no permitir)
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 204
}));

// Servir estáticos locales (solo dev) con CORS
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware específico para archivos estáticos con CORS
app.use('/static', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(process.cwd(), 'storage')));


const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/insta';
mongoose.connect(MONGO_URI).then(()=>console.log('✅ Mongo connected')).catch(e=>{
  console.error('❌ Mongo error', e);
  process.exit(1);
});

app.get('/api/health', (_,res)=>res.json({ ok:true, ts: Date.now() }));

app.use('/api/auth', authDevRoutes); // Rutas de desarrollo (sin rate limit)
app.use('/api/auth', rateLimit({windowMs:15000, max:20}), authRoutes); // Rutas principales con rate limit
app.use('/api/users', userRoutes);
app.use('/api', socialRoutes);         // posts, comments, likes, follows, feed
app.use('/api', uploadRoutes);         // presigned uploads
app.use('/api', uploadLocalRoutes);    // local uploads for development
app.use('/api', dmRoutes);             // conversations/messages
app.use('/api', notifRoutes);          // notifications
app.use('/api', searchRoutes);          // search
app.use('/api/friends', friendsRoutes); // friend requests

const port = process.env.PORT || 3001;
app.listen(port, ()=> console.log(`🚀 API on http://localhost:${port}`));
