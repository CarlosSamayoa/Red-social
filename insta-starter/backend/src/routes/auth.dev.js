import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import User from '../models/User.js';
import { issueToken, requireAuth } from '../middleware/auth.js';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Configuración de seguridad (igual que en auth.js)
const SALT_ROUNDS = 12;

function assertValid(req){
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    const msg = errors.array().map(e=>`${e.path}: ${e.msg}`).join(', ');
    const err = new Error(msg); err.status = 400; throw err;
  }
}

function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

async function hashPasswordWithSalt(password, salt) {
  const combinedPassword = password + salt;
  return await bcrypt.hash(combinedPassword, SALT_ROUNDS);
}

// Endpoint para crear usuario de prueba rápido
router.post('/create-test-user', async (req, res) => {
  try {
    // Eliminar usuario existente si existe
    await User.deleteOne({ $or: [{ email: 'test@example.com' }, { username: 'testuser' }] });
    
    const password_salt = generateSalt();
    const password_hash = await hashPasswordWithSalt('Test123!', password_salt);
    
    const user = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      password_hash,
      password_salt,
      is_verified: true
    });
    
    res.json({ 
      success: true, 
      message: 'Usuario de prueba creado',
      credentials: {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test123!'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para migrar todos los usuarios al nuevo sistema de contraseñas
router.get('/migrate-users', async (req, res) => {
  try {
    const defaultPassword = 'Test123!'; // Contraseña por defecto para todos
    
    // Buscar todos los usuarios
    const users = await User.find({});
    
    const results = [];
    
    for (const user of users) {
      try {
        // Verificar si el usuario ya tiene el nuevo sistema
        if (user.password_hash && user.password_salt) {
          results.push({
            email: user.email,
            username: user.username,
            status: 'already_migrated',
            message: 'Usuario ya tiene el nuevo sistema'
          });
          continue;
        }
        
        // Generar nuevo salt y hash
        const password_salt = generateSalt();
        const password_hash = await hashPasswordWithSalt(defaultPassword, password_salt);
        
        // Actualizar usuario
        await User.findByIdAndUpdate(user._id, {
          $set: {
            password_hash,
            password_salt,
            firstName: user.firstName || user.name?.split(' ')[0] || 'Usuario',
            lastName: user.lastName || user.name?.split(' ')[1] || 'Apellido',
            is_verified: true,
            is_active: true
          },
          $unset: {
            password: 1 // Eliminar el campo password anterior
          }
        });
        
        results.push({
          email: user.email,
          username: user.username,
          status: 'migrated',
          message: `Usuario migrado con contraseña: ${defaultPassword}`
        });
        
      } catch (error) {
        results.push({
          email: user.email,
          username: user.username,
          status: 'error',
          message: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Migración completada',
      defaultPassword,
      results
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint GET temporal para crear usuario de prueba (para browser)
router.get('/create-test-user', async (req, res) => {
  try {
    // Eliminar usuario existente si existe
    await User.deleteOne({ $or: [{ email: 'test@example.com' }, { username: 'testuser' }] });
    
    const password_salt = generateSalt();
    const password_hash = await hashPasswordWithSalt('Test123!', password_salt);
    
    const user = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      name: 'Test User',
      password_hash,
      password_salt,
      is_verified: true
    });
    
    res.json({ 
      success: true, 
      message: 'Usuario de prueba creado via GET',
      credentials: {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test123!'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener datos del usuario autenticado
router.get('/me', requireAuth, async (req, res) => {
  // req.user viene del middleware requireAuth
  res.json({
    id: req.user.id,
    email: req.user.email,
    username: req.user.username
  });
});

// Google OAuth iniciador
router.get('/google', (req, res) => {
  const authUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/api/auth/google/callback'
  });
  res.redirect(authUrl);
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);
    
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;
    
    // Buscar o crear usuario
    let user = await User.findOne({ email });
    if (!user) {
      const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
      user = await User.create({
        email,
        username,
        name,
        google_id: payload.sub,
        profile_image: picture
      });
    }
    
    const token = issueToken(user);
    
    // Redirect al frontend con token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?token=${token}&user=${encodeURIComponent(JSON.stringify({
      id: String(user._id),
      email: user.email,
      username: user.username,
      name: user.name
    }))}`);
    
  } catch (error) {
    console.error('Google auth error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=auth_failed`);
  }
});

// Registro de usuario regular
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({min:3, max:20}).matches(/^[a-zA-Z0-9_]+$/).withMessage('Username only letters, numbers and underscore'),
  body('name').isLength({min:1, max:50}).trim(),
  body('password').isLength({min:6}).withMessage('Password must be at least 6 characters')
], async (req, res, next) => {
  try {
    // Validar campos
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => {
        // Hacer los mensajes más amigables
        switch(e.path) {
          case 'name': return 'El nombre es requerido';
          case 'username': return 'El nombre de usuario es requerido (3-20 caracteres, solo letras, números y _)';
          case 'email': return 'Ingresa un email válido';
          case 'password': return 'La contraseña debe tener al menos 6 caracteres';
          default: return e.msg;
        }
      }).join('. ');
      return res.status(400).json({ error: errorMessages });
    }
    
    const { email, username, name, password } = req.body;
    
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }
    
    // Hash de la contraseña con el sistema mejorado
    const password_salt = generateSalt();
    const password_hash = await hashPasswordWithSalt(password, password_salt);
    
    // Extraer firstName y lastName del campo name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0] || 'Usuario';
    
    // Crear usuario
    let user;
    try {
      user = await User.create({
        email,
        username,
        name,
        firstName,
        lastName,
        password_hash,
        password_salt,
        is_verified: true // Para desarrollo, marcar como verificado
      });
    } catch (mongoError) {
      console.error('MongoDB Error:', mongoError);
      if (mongoError.code === 11000) {
        // Error de duplicado
        if (mongoError.keyPattern?.email) {
          return res.status(400).json({ error: 'Este email ya está registrado' });
        }
        if (mongoError.keyPattern?.username) {
          return res.status(400).json({ error: 'Este nombre de usuario ya existe' });
        }
      }
      if (mongoError.errors) {
        // Errores de validación de Mongoose
        const errorMsg = Object.values(mongoError.errors)
          .map(err => err.message)
          .join('. ');
        return res.status(400).json({ error: errorMsg });
      }
      return res.status(400).json({ error: 'Error al crear el usuario. Por favor intenta de nuevo.' });
    }
    
    const token = issueToken(user);
    res.status(201).json({ 
      user: { 
        id: String(user._id), 
        email: user.email, 
        username: user.username, 
        name: user.name 
      }, 
      token 
    });
    
  } catch (e) { 
    next(e); 
  }
});

// ⚠️ Solo para entorno local de desarrollo
router.post('/dev-login', [
  body('email').isEmail(),
  body('username').isLength({min:3}),
  body('name').notEmpty()
], async (req,res,next)=>{
  try{
    assertValid(req);
    let user = await User.findOne({ email: req.body.email });
    if(!user){
      user = await User.create({ email: req.body.email, username: req.body.username, name: req.body.name });
    }
    const token = issueToken(user);
    res.json({ user: { id:String(user._id), email:user.email, username:user.username, name:user.name }, token });
  }catch(e){ next(e); }
});

// Middleware de manejo de errores para esta ruta
router.use((error, req, res, next) => {
  console.error('Auth error:', error);
  res.status(error.status || 500).json({ 
    error: error.message || 'Error interno del servidor' 
  });
});

export default router;
