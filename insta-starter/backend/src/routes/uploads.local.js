import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import Publication from '../models/Publication.js';

const router = Router();
const ROOT = path.resolve(process.cwd(), 'storage'); // backend/storage
const originals = (uid) => path.join(ROOT, 'originals', uid);
const variants = (kind, uid) => path.join(ROOT, 'variants', kind, uid);

// Configuración mejorada de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = originals(req.user.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${timestamp}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, filename);
  }
});

// Configuración mejorada de multer con validaciones
const upload = multer({ 
  storage, 
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 1
  }, 
  fileFilter: (req, file, cb) => {
    // Validar tipo de archivo
    const allowedTypes = /^image\/(jpeg|jpg|png|webp|gif)$/i;
    const isValidType = allowedTypes.test(file.mimetype);
    
    // Validar extensión
    const allowedExts = /\.(jpg|jpeg|png|webp|gif)$/i;
    const isValidExt = allowedExts.test(file.originalname);
    
    if (isValidType && isValidExt) {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Solo se permiten imágenes (JPG, PNG, WebP, GIF)'), false);
    }
  }
});

// Función para crear transformaciones automáticas mejoradas
async function createImageVariants(originalPath, userId, metadata) {
  const uid = userId;
  const fileName = path.basename(originalPath, path.extname(originalPath)) + '.jpg';
  
  // Definir transformaciones automáticas avanzadas
  const transformations = [
    // Tamaños estándar
    { 
      kind: 'thumb', 
      op: (s) => s.resize(256, 256, { fit: 'cover', position: 'center' }),
      description: 'Miniatura cuadrada 256x256'
    },
    { 
      kind: 'medium', 
      op: (s) => s.resize(1024, null, { withoutEnlargement: true }),
      description: 'Tamaño medio máximo 1024px de ancho'
    },
    { 
      kind: 'large', 
      op: (s) => s.resize(2048, null, { withoutEnlargement: true }),
      description: 'Tamaño grande máximo 2048px de ancho'
    },
    { 
      kind: 'small', 
      op: (s) => s.resize(512, null, { withoutEnlargement: true }),
      description: 'Tamaño pequeño máximo 512px de ancho'
    },
    
    // Efectos artísticos
    { 
      kind: 'bw', 
      op: (s) => s.grayscale().gamma(1.1).modulate({ brightness: 1.05 }),
      description: 'Blanco y negro con ajustes de gamma'
    },
    { 
      kind: 'sepia', 
      op: (s) => s.grayscale().tint({ r: 255, g: 240, b: 205 }).modulate({ saturation: 0.6 }),
      description: 'Efecto sepia vintage'
    },
    { 
      kind: 'vintage', 
      op: (s) => s.modulate({ brightness: 0.9, saturation: 0.7, hue: 10 })
                    .tint({ r: 255, g: 245, b: 220 })
                    .gamma(1.2),
      description: 'Efecto vintage con tonos cálidos'
    },
    
    // Mejoras de imagen
    { 
      kind: 'enhanced', 
      op: (s) => s.modulate({ brightness: 1.1, saturation: 1.2 })
                  .sharpen(1, 1, 2),
      description: 'Imagen mejorada con brillo y saturación'
    },
    { 
      kind: 'contrast', 
      op: (s) => s.linear(1.3, -(128 * 1.3) + 128).gamma(0.9),
      description: 'Alto contraste con ajuste de gamma'
    },
    { 
      kind: 'soft', 
      op: (s) => s.modulate({ brightness: 1.05, saturation: 0.8 })
                  .blur(0.5),
      description: 'Efecto suave y difuminado'
    },
    
    // Efectos especiales
    { 
      kind: 'cool', 
      op: (s) => s.tint({ r: 200, g: 220, b: 255 }).modulate({ saturation: 1.1 }),
      description: 'Tonos fríos azulados'
    },
    { 
      kind: 'warm', 
      op: (s) => s.tint({ r: 255, g: 235, b: 200 }).modulate({ saturation: 1.1 }),
      description: 'Tonos cálidos dorados'
    },
    
    // Formatos específicos
    { 
      kind: 'square', 
      op: (s) => s.resize(800, 800, { fit: 'cover', position: 'center' }),
      description: 'Formato cuadrado 800x800 para redes sociales'
    }
  ];
  
  const variantsCreated = [];
  
  for (const transform of transformations) {
    try {
      const vdir = variants(transform.kind, uid);
      fs.mkdirSync(vdir, { recursive: true });
      const outputPath = path.join(vdir, fileName);
      
      // Aplicar transformación con configuración optimizada
      const processedImage = await transform.op(sharp(originalPath))
        .jpeg({ 
          quality: transform.kind === 'thumb' ? 75 : 85,
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();
      
      // Guardar imagen transformada
      fs.writeFileSync(outputPath, processedImage);
      
      // Obtener metadatos de la imagen transformada
      const transformedMeta = await sharp(outputPath).metadata();
      
      variantsCreated.push({
        kind: transform.kind,
        path: outputPath,
        s3_key: path.relative(ROOT, outputPath).replace(/\\/g, '/'),
        width: transformedMeta.width,
        height: transformedMeta.height,
        size: transformedMeta.size || processedImage.length,
        description: transform.description
      });
      
      console.log(`✅ Transformación creada: ${transform.kind} (${transformedMeta.width}x${transformedMeta.height})`);
    } catch (error) {
      console.error(`❌ Error creando transformación ${transform.kind}:`, error.message);
    }
  }
  
  return variantsCreated;
}

// Ruta mejorada de upload local con transformaciones automáticas
router.post('/uploads/local', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'no_file', 
        message: 'No se ha subido ningún archivo' 
      });
    }

    const filePath = req.file.path;
    const ext = path.extname(filePath).toLowerCase();
    const isPng = ext === '.png';
    const isGif = ext === '.gif';
    const mime = isPng ? 'image/png' : isGif ? 'image/gif' : 'image/jpeg';

    console.log(`🔄 Procesando imagen: ${req.file.originalname} (${req.file.size} bytes)`);

    // Obtener metadatos de la imagen original
    const img = sharp(filePath);
    const metadata = await img.metadata();
    const userId = req.user.id;

    console.log(`📊 Metadatos originales: ${metadata.width}x${metadata.height}, ${metadata.format}`);

    // Validar dimensiones mínimas
    if (metadata.width < 100 || metadata.height < 100) {
      fs.unlinkSync(filePath); // Eliminar archivo inválido
      return res.status(400).json({
        error: 'invalid_dimensions',
        message: 'La imagen debe tener al menos 100x100 píxeles'
      });
    }

    // Crear todas las transformaciones automáticamente
    console.log(`🎨 Iniciando creación de transformaciones automáticas...`);
    const variants = await createImageVariants(filePath, userId, metadata);
    console.log(`✅ Se crearon ${variants.length} transformaciones automáticas`);

    // Preparar información del archivo para la base de datos
    const relativeOriginalPath = path.relative(ROOT, filePath).replace(/\\/g, '/');
    
    // Crear publicación en la base de datos con información extendida
    const publication = await Publication.create({
      user: userId,
      text: req.body.text || '',
      file: {
        s3_key_original: relativeOriginalPath,
        mime,
        width: metadata.width,
        height: metadata.height,
        size_bytes: req.file.size,
        format: metadata.format,
        has_alpha: metadata.hasAlpha,
        variants: variants.map(v => ({
          kind: v.kind,
          s3_key: v.s3_key,
          width: v.width,
          height: v.height,
          size_bytes: v.size,
          description: v.description
        }))
      },
      processing_info: {
        original_filename: req.file.originalname,
        processed_at: new Date(),
        transformations_count: variants.length,
        processing_time_ms: Date.now() - new Date(req.file.filename.split('_')[0]).getTime()
      }
    });

    // Respuesta con información detallada
    res.status(201).json({
      success: true,
      message: `Imagen subida y procesada exitosamente con ${variants.length} transformaciones`,
      post: {
        id: publication._id,
        user: userId,
        text: publication.text,
        created_at: publication.created_at,
        file: {
          original: {
            path: relativeOriginalPath,
            width: metadata.width,
            height: metadata.height,
            size: req.file.size,
            format: metadata.format
          },
          variants: variants.map(v => ({
            kind: v.kind,
            path: v.s3_key,
            width: v.width,
            height: v.height,
            description: v.description
          }))
        }
      }
    });

  } catch (error) {
    console.error('❌ Error procesando imagen:', error);
    
    // Limpiar archivo si existe
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error limpiando archivo:', cleanupError);
      }
    }
    
    next(error);
  }
});

// Ruta para obtener información de transformaciones disponibles
router.get('/transformations/info', requireAuth, (req, res) => {
  const transformationsInfo = [
    { kind: 'thumb', description: 'Miniatura cuadrada 256x256' },
    { kind: 'medium', description: 'Tamaño medio máximo 1024px de ancho' },
    { kind: 'large', description: 'Tamaño grande máximo 2048px de ancho' },
    { kind: 'small', description: 'Tamaño pequeño máximo 512px de ancho' },
    { kind: 'bw', description: 'Blanco y negro con ajustes de gamma' },
    { kind: 'sepia', description: 'Efecto sepia vintage' },
    { kind: 'vintage', description: 'Efecto vintage con tonos cálidos' },
    { kind: 'enhanced', description: 'Imagen mejorada con brillo y saturación' },
    { kind: 'contrast', description: 'Alto contraste con ajuste de gamma' },
    { kind: 'soft', description: 'Efecto suave y difuminado' },
    { kind: 'cool', description: 'Tonos fríos azulados' },
    { kind: 'warm', description: 'Tonos cálidos dorados' },
    { kind: 'square', description: 'Formato cuadrado 800x800 para redes sociales' }
  ];
  
  res.json({
    available_transformations: transformationsInfo,
    automatic_processing: true,
    max_file_size: '10MB',
    supported_formats: ['JPEG', 'PNG', 'WebP', 'GIF']
  });
});

export default router;
