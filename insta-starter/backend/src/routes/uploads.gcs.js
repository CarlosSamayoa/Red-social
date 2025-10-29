import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import Publication from '../models/Publication.js';

const router = Router();

// Determinar si usar GCS o almacenamiento local
const USE_GCS = process.env.NODE_ENV === 'production' || process.env.USE_GCS === 'true';

// Importar utilidad de GCS solo si es necesario
let gcsUtils;
if (USE_GCS) {
  try {
    // Usar import dinámico para CommonJS module
    gcsUtils = await import('../utils/gcs.js').then(m => m.default || m);
  } catch (error) {
    console.warn('⚠️ GCS utils not available, falling back to local storage');
  }
}

// Configurar multer para memoria (necesario para Cloud Run y procesamiento)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // Máximo 10 archivos por request
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files allowed'));
    }
  }
});

/**
 * POST /api/uploads
 * Upload de múltiples archivos (imágenes/videos)
 */
router.post('/uploads', requireAuth, upload.array('media', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const { text, filter } = req.body;
    const userId = req.user._id;
    const mediaItems = [];

    // Procesar cada archivo
    for (const file of req.files) {
      const mediaId = crypto.randomUUID();
      const isVideo = file.mimetype.startsWith('video/');
      
      if (isVideo) {
        // Subir video directamente
        if (USE_GCS && gcsUtils) {
          const destination = `originals/${userId}/${mediaId}_${file.originalname}`;
          const publicUrl = await gcsUtils.uploadToGCS(file.buffer, destination, file.mimetype);
          
          mediaItems.push({
            type: 'video',
            url: publicUrl,
            mimeType: file.mimetype
          });
        } else {
          // Para desarrollo local, guardar en disco
          const fs = await import('fs');
          const path = await import('path');
          const uploadDir = path.join(process.cwd(), 'storage', 'originals', userId.toString());
          
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          const filename = `${mediaId}_${file.originalname}`;
          const filepath = path.join(uploadDir, filename);
          fs.writeFileSync(filepath, file.buffer);
          
          mediaItems.push({
            type: 'video',
            url: `/static/originals/${userId}/${filename}`,
            mimeType: file.mimetype
          });
        }
      } else {
        // Procesar imagen con sharp
        const variants = [
          { kind: 'thumb', size: 256 },
          { kind: 'small', size: 512 },
          { kind: 'medium', size: 1024 },
          { kind: 'large', size: 2048 }
        ];

        const uploadPromises = [];
        let mainImageUrl = '';

        for (const variant of variants) {
          let sharpInstance = sharp(file.buffer).resize(variant.size, variant.size, {
            fit: 'inside',
            withoutEnlargement: true
          });

          // Aplicar filtro si se especificó
          if (filter) {
            switch (filter) {
              case 'bw':
                sharpInstance = sharpInstance.grayscale();
                break;
              case 'sepia':
                sharpInstance = sharpInstance.tint({ r: 112, g: 66, b: 20 });
                break;
              case 'vintage':
                sharpInstance = sharpInstance.modulate({ brightness: 0.9, saturation: 0.7 });
                break;
              case 'bright':
                sharpInstance = sharpInstance.modulate({ brightness: 1.3 });
                break;
              case 'contrast':
                sharpInstance = sharpInstance.linear(1.5, -(128 * 1.5) + 128);
                break;
              case 'cool':
                sharpInstance = sharpInstance.tint({ r: 0, g: 50, b: 100 });
                break;
              case 'warm':
                sharpInstance = sharpInstance.tint({ r: 100, g: 50, b: 0 });
                break;
              case 'enhanced':
                sharpInstance = sharpInstance.normalize();
                break;
              case 'soft':
                sharpInstance = sharpInstance.blur(2);
                break;
            }
          }

          const processedBuffer = await sharpInstance
            .jpeg({ quality: 85, progressive: true })
            .toBuffer();

          if (USE_GCS && gcsUtils) {
            // Subir a Google Cloud Storage
            const destination = `variants/${variant.kind}/${userId}/${mediaId}_${variant.kind}.jpg`;
            const uploadPromise = gcsUtils.uploadToGCS(processedBuffer, destination, 'image/jpeg');
            uploadPromises.push(uploadPromise);

            if (variant.kind === 'medium') {
              mainImageUrl = await uploadPromise;
            }
          } else {
            // Guardar localmente para desarrollo
            const fs = await import('fs');
            const path = await import('path');
            const uploadDir = path.join(process.cwd(), 'storage', 'variants', variant.kind, userId.toString());
            
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            const filename = `${mediaId}_${variant.kind}.jpg`;
            const filepath = path.join(uploadDir, filename);
            fs.writeFileSync(filepath, processedBuffer);
            
            if (variant.kind === 'medium') {
              mainImageUrl = `/static/variants/${variant.kind}/${userId}/${filename}`;
            }
            
            uploadPromises.push(Promise.resolve());
          }
        }

        await Promise.all(uploadPromises);

        mediaItems.push({
          type: 'image',
          url: mainImageUrl,
          mimeType: 'image/jpeg'
        });
      }
    }

    // Crear publicación en BD
    const publication = new Publication({
      user: userId,
      text: text || '',
      media: mediaItems,
      filter: filter || 'none',
      createdAt: new Date()
    });

    await publication.save();
    await publication.populate('user', 'username name profile_image');

    // Mapear profile_image a image
    const pubObj = publication.toObject();
    if (pubObj.user && pubObj.user.profile_image) {
      pubObj.user.image = pubObj.user.profile_image;
    }

    res.status(201).json({
      message: 'Media uploaded successfully',
      publication: pubObj
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
});

/**
 * POST /api/uploads/presign
 * Generar URL pre-firmada para upload directo (mantener compatibilidad)
 */
router.post('/uploads/presign', requireAuth, async (req, res) => {
  try {
    const { mime } = req.body;
    const key = `originals/${req.user._id}/${crypto.randomUUID()}` + (mime === 'image/png' ? '.png' : '.jpg');
    
    if (USE_GCS && gcsUtils) {
      // En GCS, generar signed URL
      const bucket = gcsUtils.storage.bucket(gcsUtils.bucketName);
      const file = bucket.file(key);
      
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutos
        contentType: mime,
      });
      
      res.json({ key, url });
    } else {
      // Para desarrollo local, retornar endpoint de upload
      res.json({ 
        key, 
        url: `/api/uploads/direct`,
        method: 'POST'
      });
    }
  } catch (error) {
    console.error('Presign error:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
});

export default router;
