import { Router } from 'express';
import { param, body, validationResult, query } from 'express-validator';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Storage } from '@google-cloud/storage';
import User from '../models/User.js';
import Follow from '../models/Follow.js';
import Publication from '../models/Publication.js';

import { requireAuth } from '../middleware/auth.js';
const router = Router();

// Inicializar cliente de Google Cloud Storage
const GCS_BUCKET = process.env.GCS_BUCKET;
let gcs;
if (GCS_BUCKET) {
  try {
    gcs = new Storage();
    console.log('🔷 GCS habilitado para fotos de perfil. Bucket:', GCS_BUCKET);
  } catch (e) {
    console.warn('⚠️ No se pudo inicializar GCS para perfiles:', e.message);
  }
}

// Configuración de multer para subida de fotos de perfil
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.id;
    const userDir = path.join(process.cwd(), 'storage', 'profiles', userId);
    
    // Crear directorio si no existe
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `profile_${timestamp}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB límite
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

function assertValid(req){
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    const msg = errors.array().map(e=>`${e.path}: ${e.msg}`).join(', ');
    const err = new Error(msg); err.status = 400; throw err;
  }
}

router.get('/:username', requireAuth, async (req,res,next)=>{
  try{
    const u = await User.findOne({ username: req.params.username }).lean();
    if(!u) return res.status(404).json({ error:'not_found' });
    const followers = await Follow.countDocuments({ followed: u._id });
    const following = await Follow.countDocuments({ user: u._id });
    const posts = await Publication.countDocuments({ user: u._id });
    const isFollowing = await Follow.findOne({ user: req.user.id, followed: u._id }).lean();
    
    // Mapear profile_image a image para compatibilidad con frontend
    res.json({ 
      user: { 
        id: u._id, 
        username: u.username, 
        name: u.name, 
        image: u.profile_image || u.image,  // Usar profile_image primero, fallback a image
        bio: u.bio, 
        stats: { followers, following, posts }, 
        isFollowing: !!isFollowing 
      } 
    });
  }catch(e){ next(e); }
});

router.patch('/me', requireAuth, [
  body('name').optional().isLength({min:1}),
  body('bio').optional().isLength({max: 280}),
  body('image').optional().isString()
], async (req,res,next)=>{
  try{
    assertValid(req);
    const updates = { ...req.body, updated_at: new Date() };
    const u = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).lean();
    const followers = await Follow.countDocuments({ followed: u._id });
    const following = await Follow.countDocuments({ user: u._id });
    const posts = await Publication.countDocuments({ user: u._id });
    const isFollowing = await Follow.findOne({ user: req.user.id, followed: u._id }).lean();
    
    // Mapear profile_image a image para compatibilidad
    res.json({ 
      user: { 
        id: u._id, 
        username: u.username, 
        name: u.name, 
        image: u.profile_image || u.image, 
        bio: u.bio, 
        stats: { followers, following, posts }, 
        isFollowing: !!isFollowing 
      } 
    });
  }catch(e){ next(e); }
});

// Cambiar foto de perfil
router.post('/profile-photo', requireAuth, upload.single('profile_image'), async (req, res, next) => {
  try {
    console.log('📸 Recibiendo petición de cambio de foto de perfil');
    console.log('Usuario:', req.user.id, req.user.username);
    console.log('Archivo:', req.file ? req.file.filename : 'NO FILE');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ninguna imagen' });
    }

    let imageUrl;

    // Si GCS está habilitado, subir al bucket
    if (gcs && GCS_BUCKET) {
      try {
        const destKey = `profiles/${req.user.id}/${req.file.filename}`;
        const bucket = gcs.bucket(GCS_BUCKET);
        await bucket.upload(req.file.path, {
          destination: destKey,
          metadata: { contentType: req.file.mimetype }
        });
        
        imageUrl = `https://storage.googleapis.com/${GCS_BUCKET}/${destKey}`;
        console.log('📤 Foto de perfil subida a GCS:', imageUrl);
        
        // Eliminar archivo local tras subida exitosa
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupErr) {
          console.warn('⚠️ No se pudo eliminar archivo local:', cleanupErr.message);
        }
      } catch (gcsErr) {
        console.error('⚠️ Error subiendo a GCS:', gcsErr.message);
        // Fallback a ruta local
        imageUrl = `/static/profiles/${req.user.id}/${req.file.filename}`;
      }
    } else {
      // Sin GCS, usar ruta local
      imageUrl = `/static/profiles/${req.user.id}/${req.file.filename}`;
      console.log('📍 URL de imagen local:', imageUrl);
    }

    // Actualizar usuario en base de datos (usando profile_image que es el campo real del modelo)
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { profile_image: imageUrl, updated_at: new Date() },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('✅ Usuario actualizado en BD:', {
      id: updatedUser._id,
      username: updatedUser.username,
      profile_image: updatedUser.profile_image
    });

    // Retornar 'image' en la respuesta para mantener compatibilidad con el frontend
    res.json({
      success: true,
      message: 'Foto de perfil actualizada correctamente',
      imageUrl: imageUrl,
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        name: updatedUser.name,
        image: updatedUser.profile_image  // Retornar como 'image' para el frontend
      }
    });

  } catch (error) {
    console.error('❌ Error uploading profile photo:', error);
    next(error);
  }
});

// Cambiar contraseña
router.post('/change-password', requireAuth, [
  body('currentPassword').isLength({ min: 1 }).withMessage('Contraseña actual requerida'),
  body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres')
], async (req, res, next) => {
  try {
    assertValid(req);

    const { currentPassword, newPassword } = req.body;

    // Buscar usuario actual
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }

    // Encriptar nueva contraseña
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña en base de datos
    await User.findByIdAndUpdate(
      req.user.id,
      { 
        password: hashedNewPassword,
        updated_at: new Date()
      }
    );

    res.json({
      success: true,
      message: 'Contraseña cambiada correctamente'
    });

  } catch (error) {
    console.error('Error changing password:', error);
    next(error);
  }
});

// Cambiar nombre de usuario
router.post('/change-username', requireAuth, async (req, res, next) => {
  try {
    const { newUsername, password } = req.body;

    // Validaciones
    if (!newUsername || !password) {
      return res.status(400).json({ error: 'Se requiere nuevo nombre de usuario y contraseña' });
    }

    if (newUsername.length < 3) {
      return res.status(400).json({ error: 'El nombre de usuario debe tener al menos 3 caracteres' });
    }

    // Validar formato (solo letras, números y guiones bajos)
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      return res.status(400).json({ error: 'El nombre de usuario solo puede contener letras, números y guiones bajos' });
    }

    // Buscar usuario actual
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    // Verificar si el username ya está en uso
    const existingUser = await User.findOne({ 
      username: newUsername.toLowerCase(),
      _id: { $ne: req.user.id } // Excluir al usuario actual
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Este nombre de usuario ya está en uso' });
    }

    // Actualizar username
    await User.findByIdAndUpdate(
      req.user.id,
      { 
        username: newUsername.toLowerCase(),
        updated_at: new Date()
      }
    );

    res.json({
      success: true,
      message: 'Nombre de usuario cambiado correctamente',
      newUsername: newUsername.toLowerCase()
    });

  } catch (error) {
    console.error('Error changing username:', error);
    next(error);
  }
});

export default router;


router.get('/:username/posts', requireAuth, [ query('page').optional().isInt({min:1}).toInt(), query('limit').optional().isInt({min:1, max:100}).toInt() ], async (req,res,next)=>{
  try{
    const u = await User.findOne({ username: req.params.username }).select('_id').lean();
    if(!u) return res.status(404).json({ error:'not_found' });
    const page = req.query.page || 1; const limit = req.query.limit || 12; const skip = (page-1)*limit;
    const list = await Publication.find({ user: u._id })
      .populate('user', 'username name image')
      .sort({ created_at:-1 })
      .skip(skip)
      .limit(limit)
      .lean();
    res.json({ posts: list });
  }catch(e){ next(e); }
});
