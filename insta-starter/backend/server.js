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


// Conexión a MongoDB con retry logic para Cloud Run
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/insta';

const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('✅ MongoDB connected successfully');
      console.log(`📍 Database: ${mongoose.connection.name}`);
      return;
    } catch (error) {
      retries++;
      console.error(`❌ MongoDB connection attempt ${retries}/${maxRetries} failed:`, error.message);
      if (retries === maxRetries) {
        console.error('❌ Could not connect to MongoDB after maximum retries');
        process.exit(1);
      }
      // Esperar 5 segundos antes de reintentar
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Conectar a MongoDB
connectDB();

// Manejar errores de conexión después de la conexión inicial
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
  connectDB();
});

// Health check mejorado para Cloud Run
app.get('/health', (_, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  const statusCode = mongoose.connection.readyState === 1 ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

// Montar rutas de desarrollo SOLO en entornos no productivos y solo si se habilita explícitamente.
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_ROUTES === 'true') {
  app.use('/api/auth', authDevRoutes); // Rutas de desarrollo (sin rate limit)
  console.log('⚙️ Dev auth routes enabled');
} else {
  console.log('🔒 Dev auth routes disabled');
}

// Rutas principales con rate limit (siempre montadas)
app.use('/api/auth', rateLimit({windowMs:15000, max:20}), authRoutes);
// Compat: algunos frontends llaman a /auth (sin /api) — montamos también para evitar 404
app.use('/auth', rateLimit({windowMs:15000, max:20}), authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', socialRoutes);         // posts, comments, likes, follows, feed
app.use('/api', uploadRoutes);         // presigned uploads
app.use('/api', uploadLocalRoutes);    // local uploads for development
app.use('/api', dmRoutes);             // conversations/messages
app.use('/api', notifRoutes);          // notifications
app.use('/api', searchRoutes);          // search
app.use('/api/friends', friendsRoutes); // friend requests

// Middleware de manejo de errores global
// Debe ir después de todas las rutas
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Si ya se envió la respuesta, delegar al error handler predeterminado
  if (res.headersSent) {
    return next(err);
  }
  
  // Establecer el código de estado
  const statusCode = err.status || err.statusCode || 500;
  
  // Siempre responder con JSON
  res.status(statusCode).json({
    error: true,
    message: err.message || 'Error interno del servidor',
    status: statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const port = process.env.PORT || 3002;

// Para Cloud Run, escuchar en 0.0.0.0
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

app.listen(port, host, () => {
  console.log(`🚀 Server running on ${host}:${port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://${host}:${port}/health`);
});
