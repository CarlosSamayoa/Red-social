
import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { issueToken, requireAuth } from '../middleware/auth.js';
import { verifyRecaptcha } from '../utils/recaptcha.js';
import passport from '../config/passport.js';

const router = Router();

// Configuración de seguridad
const SALT_ROUNDS = 12; // Incrementado para mayor seguridad
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 horas

// Función para generar salt único
function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

// Función para hash de contraseña con salt personalizado
async function hashPasswordWithSalt(password, salt) {
  // Combinamos el salt personalizado con bcrypt
  const combinedPassword = password + salt;
  return await bcrypt.hash(combinedPassword, SALT_ROUNDS);
}

function assertValid(req){
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    const msg = errors.array().map(e=>`${e.path}: ${e.msg}`).join(', ');
    const err = new Error(msg); err.status = 400; throw err;
  }
}

router.post('/signup', [
  body('email').isEmail().withMessage('Email válido requerido'),
  body('username')
    .isLength({min:3, max:30})
    .withMessage('Usuario debe tener entre 3-30 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Usuario solo puede contener letras, números y guiones bajos'),
  body('firstName').notEmpty().withMessage('Nombre requerido'),
  body('lastName').notEmpty().withMessage('Apellido requerido'),
  body('password')
    .isLength({min:8})
    .withMessage('Contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Contraseña debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 símbolo')
], async (req, res, next) => {
  try {
    assertValid(req);
    
    // Verificar reCAPTCHA (saltar en desarrollo y localhost)
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         req.hostname === 'localhost' || 
                         req.hostname === '127.0.0.1' ||
                         !process.env.NODE_ENV; // Si NODE_ENV no está definido, asumir desarrollo
    
    if (!isDevelopment) {
      const ok = await verifyRecaptcha(req.body.recaptcha, req.ip);
      if (!ok) return res.status(400).json({ error: 'recaptcha_failed' });
    }

    const { email, username, firstName, lastName, password } = req.body;
    
    // Verificar si el usuario ya existe
    const exists = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { username }] 
    });
    if (exists) {
      return res.status(409).json({ 
        error: 'user_exists',
        message: 'El email o usuario ya está registrado'
      });
    }

    // Generar salt único para este usuario
    const password_salt = generateSalt();
    
    // Hash de la contraseña con salt personalizado
    const password_hash = await hashPasswordWithSalt(password, password_salt);
    
    // Crear usuario con campos mejorados
    const user = await User.create({ 
      email: email.toLowerCase(),
      username,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`, // Para compatibilidad
      password_hash,
      password_salt,
      is_verified: false // Requerirá verificación por email en el futuro
    });
    
    // Generar token JWT
    const token = issueToken(user);
    
    res.status(201).json({ 
      user: { 
        id: user._id, 
        email: user.email, 
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name
      }, 
      token,
      message: 'Usuario registrado exitosamente'
    });
  } catch (e) { 
    next(e); 
  }
});

router.post('/login', [
  body('identifier').notEmpty().withMessage('Email o usuario requerido'),
  body('password').isLength({min:6}).withMessage('Contraseña requerida')
], async (req, res, next) => {
  try {
    assertValid(req);
    
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 Skipping reCAPTCHA:', process.env.NODE_ENV === 'development');
    
    // Verificar reCAPTCHA (saltar en desarrollo y localhost)
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         req.hostname === 'localhost' || 
                         req.hostname === '127.0.0.1' ||
                         !process.env.NODE_ENV; // Si NODE_ENV no está definido, asumir desarrollo
    
    if (!isDevelopment) {
      console.log('🔐 Validating reCAPTCHA...');
      const ok = await verifyRecaptcha(req.body.recaptcha, req.ip);
      if (!ok) return res.status(400).json({ error: 'recaptcha_failed' });
    } else {
      console.log('🚫 Skipping reCAPTCHA validation in development mode');
    }
    
    const { identifier, password } = req.body;
    
    // Buscar por email o username
    const query = identifier.includes('@')
      ? { email: identifier.toLowerCase() }
      : { username: identifier };
    
    const user = await User.findOne(query);
    
    console.log('🔍 Login attempt:', { identifier, userFound: !!user });
    
    if (!user || !user.password_hash) {
      console.log('❌ User not found or no password hash');
      return res.status(401).json({ 
        error: 'invalid_credentials',
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si la cuenta está bloqueada
    if (user.isLocked()) {
      console.log('🔒 Account locked');
      return res.status(423).json({ 
        error: 'account_locked',
        message: 'Cuenta bloqueada por múltiples intentos fallidos. Intenta más tarde.'
      });
    }

    // Verificar contraseña usando el salt del usuario
    let passwordMatch = false;
    
    console.log('🧂 Password verification:', { 
      hasSalt: !!user.password_salt, 
      passwordLength: password.length,
      userEmail: user.email,
      username: user.username
    });
    
    if (user.password_salt) {
      // Nuevo sistema con salt personalizado
      console.log('🔑 Salt details:', {
        saltLength: user.password_salt.length,
        hashLength: user.password_hash.length,
        inputPassword: password
      });
      
      // Combinar contraseña con salt personalizado y usar bcrypt.compare
      const combinedPassword = password + user.password_salt;
      passwordMatch = await bcrypt.compare(combinedPassword, user.password_hash);
      
      console.log('🔐 Salt-based verification:', { 
        combinedPasswordLength: combinedPassword.length,
        passwordMatch 
      });
    } else {
      // Compatibilidad con sistema anterior
      passwordMatch = await bcrypt.compare(password, user.password_hash);
      console.log('🔐 BCrypt verification:', { passwordMatch });
    }

    if (!passwordMatch) {
      console.log('❌ Password mismatch');
      // Incrementar intentos fallidos
      await user.incLoginAttempts();
      
      return res.status(401).json({ 
        error: 'invalid_credentials',
        message: 'Credenciales inválidas'
      });
    }
    
    console.log('✅ Login successful');

    // Login exitoso - resetear intentos fallidos
    await user.resetLoginAttempts();

    // Generar token JWT
    const token = issueToken(user);
    
    res.json({ 
      user: { 
        id: user._id, 
        email: user.email, 
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name || `${user.firstName} ${user.lastName}`
      }, 
      token,
      message: 'Login exitoso'
    });
  } catch (e) { 
    next(e); 
  }
});

// Rutas de Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      // Generar JWT para el usuario autenticado con Google
      const token = issueToken(req.user);
      
      // Redirigir al frontend con el token
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5174';
      res.redirect(`${frontendURL}?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: req.user._id,
        email: req.user.email,
        username: req.user.username,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        name: req.user.name,
        profile_image: req.user.profile_image
      }))}`);
    } catch (error) {
      console.error('Error en callback de Google:', error);
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5174';
      res.redirect(`${frontendURL}?error=google_auth_failed`);
    }
  }
);

// Ruta para obtener información del usuario autenticado (mejorada)
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    username: req.user.username,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    name: req.user.name,
    profile_image: req.user.profile_image,
    bio: req.user.bio,
    is_verified: req.user.is_verified,
    created_at: req.user.created_at
  });
});

export default router;
