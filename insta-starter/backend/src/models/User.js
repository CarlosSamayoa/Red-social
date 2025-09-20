import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
const { Schema, model } = mongoose;

const UserSchema = new Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    index: true,
    trim: true
  },
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true }, // Mantener compatibilidad
  
  // Sistema de autenticación mejorado
  password_hash: String, // Hash de la contraseña
  password_salt: String, // Salt único para cada usuario
  
  // OAuth Google
  google_id: String,
  google_sub: String,
  
  // Perfil
  profile_image: String,
  bio: { type: String, maxlength: 500 },
  
  // Configuración
  role: { type: String, enum: ['user','admin'], default: 'user' },
  is_active: { type: Boolean, default: true },
  is_verified: { type: Boolean, default: false },
  
  // Seguridad
  failed_login_attempts: { type: Number, default: 0 },
  locked_until: Date,
  last_login: Date,
  
  // Timestamps
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { 
  versionKey: false,
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Índices para optimizar consultas
UserSchema.index({ email: 1, username: 1 });
UserSchema.index({ google_id: 1 });
UserSchema.index({ created_at: -1 });

// Método para verificar si la cuenta está bloqueada
UserSchema.methods.isLocked = function() {
  return !!(this.locked_until && this.locked_until > Date.now());
};

// Método para incrementar intentos fallidos
UserSchema.methods.incLoginAttempts = function() {
  // Si ya tenemos un número de intentos previo y el bloqueo ha expirado
  if (this.locked_until && this.locked_until < Date.now()) {
    return this.updateOne({
      $unset: { locked_until: 1 },
      $set: { failed_login_attempts: 1 }
    });
  }
  
  const updates = { $inc: { failed_login_attempts: 1 } };
  
  // Si alcanzamos el máximo de intentos y no está bloqueado, bloquear cuenta
  if (this.failed_login_attempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { locked_until: Date.now() + 2 * 60 * 60 * 1000 }; // 2 horas
  }
  
  return this.updateOne(updates);
};

// Método para resetear intentos fallidos al login exitoso
UserSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { failed_login_attempts: 1, locked_until: 1 },
    $set: { last_login: Date.now() }
  });
};

// Agregar plugin de paginación
UserSchema.plugin(mongoosePaginate);

export default model('User', UserSchema);
