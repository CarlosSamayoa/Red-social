
import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { OAuth2Client } from 'google-auth-library';
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
    const err = new Error(msg); 
    err.status = 400;
    err.validationErrors = errors.array();
    throw err;
  }
}

// Reusable registration logic (used by both /signup and /register for compatibility)
async function registerHandler(req, res, next) {
  try {
    // Validar datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.array().map(e => `${e.msg}`).join(', ');
      return res.status(400).json({
        error: 'validation_error',
        message: msg,
        details: errors.array()
      });
    }
    
    // Verificar reCAPTCHA (saltar en desarrollo y localhost)
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         req.hostname === 'localhost' || 
                         req.hostname === '127.0.0.1' ||
                         !process.env.NODE_ENV; // Si NODE_ENV no está definido, asumir desarrollo
    
    if (!isDevelopment) {
      const ok = await verifyRecaptcha(req.body.recaptcha, req.ip, 'signup');
      if (!ok) return res.status(400).json({ error: 'recaptcha_failed', message: 'Verificación de reCAPTCHA fallida. Inténtalo de nuevo.' });
    }

    const { email, username, firstName, lastName, name, password } = req.body;

    // Ensure we have at least a name (either split or single field)
    if ((!firstName || !lastName) && !name) {
      return res.status(400).json({ error: 'name_required', message: 'Se requiere firstName y lastName o el campo name' });
    }

    // Normalize name fields: prefer explicit firstName/lastName, otherwise split `name`
    let normalizedFirstName = firstName;
    let normalizedLastName = lastName;
    if ((!normalizedFirstName || !normalizedLastName) && name) {
      const parts = name.trim().split(/\s+/);
      normalizedFirstName = parts[0] || username || 'Usuario';
      normalizedLastName = parts.slice(1).join(' ') || parts[0] || 'Apellido';
    }

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
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      name: `${normalizedFirstName} ${normalizedLastName}`, // Para compatibilidad
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
}

// Validators used for registration routes
const registrationValidators = [
  body('email').isEmail().withMessage('Email válido requerido'),
  body('username')
    .isLength({min:3, max:30})
    .withMessage('Usuario debe tener entre 3-30 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Usuario solo puede contener letras, números y guiones bajos'),
  // Accept a single `name` field for legacy frontends, or firstName/lastName if provided
  body('name').optional().isLength({min:1}).withMessage('Nombre requerido'),
  body('password')
    .isLength({min:8})
    .withMessage('Contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Contraseña debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 símbolo')
];

router.post('/signup', registrationValidators, registerHandler);

// Backwards-compatible route used by older frontends or when dev routes aren't mounted
router.post('/register', registrationValidators, registerHandler);


// End registration


// (signup handler has been refactored into registerHandler above)

router.post('/login', [
  body('identifier').notEmpty().withMessage('Email o usuario requerido'),
  body('password').isLength({min:6}).withMessage('Contraseña requerida')
], async (req, res, next) => {
  try {
    // Validar datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.array().map(e => `${e.msg}`).join(', ');
      return res.status(400).json({
        error: 'validation_error',
        message: msg,
        details: errors.array()
      });
    }
    
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔍 Skipping reCAPTCHA:', process.env.NODE_ENV === 'development');
    
    // Verificar reCAPTCHA (saltar en desarrollo y localhost)
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         req.hostname === 'localhost' || 
                         req.hostname === '127.0.0.1' ||
                         !process.env.NODE_ENV; // Si NODE_ENV no está definido, asumir desarrollo
    
    if (!isDevelopment) {
      console.log('🔐 Validating reCAPTCHA...');
      const ok = await verifyRecaptcha(req.body.recaptcha, req.ip, 'login');
      if (!ok) return res.status(400).json({ error: 'recaptcha_failed', message: 'Verificación de reCAPTCHA fallida. Inténtalo de nuevo.' });
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

// Inicializar cliente de Google Auth
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Ruta para login con token de Google desde el cliente
router.post('/google-login', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'El token de Google es requerido.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, given_name, family_name, picture } = payload;

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Si el usuario no existe, se crea uno nuevo.
      // Genera un nombre de usuario único basado en el email.
      const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      let username = baseUsername;
      let userExists = await User.findOne({ username });
      let attempts = 0;
      while (userExists && attempts < 5) {
        username = `${baseUsername}${Math.floor(Math.random() * 1000)}`;
        userExists = await User.findOne({ username });
        attempts++;
      }
      if (userExists) {
         return res.status(500).json({ message: 'No se pudo generar un nombre de usuario único.' });
      }

      user = new User({
        googleId,
        email: email.toLowerCase(),
        username,
        firstName: given_name,
        lastName: family_name,
        name,
        profile_image: picture,
        is_verified: true, // El email se considera verificado por Google.
      });
      await user.save();
    } else {
      // Si el usuario ya existe, se actualiza su información de Google si es necesario.
      user.googleId = user.googleId || googleId;
      user.profile_image = user.profile_image || picture;
      await user.save();
    }

    // Emitir token JWT para la sesión del usuario.
    const jwtToken = issueToken(user);
    
    res.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        profile_image: user.profile_image,
      },
      token: jwtToken,
      message: 'Inicio de sesión con Google exitoso.',
    });

  } catch (error) {
    console.error('❌ Error en la autenticación con Google:', error);
    next(new Error('El token de Google es inválido o ha expirado.'));
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
