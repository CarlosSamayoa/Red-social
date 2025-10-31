import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import User from './src/models/User.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://red-o-user:REDO2025U@10.128.0.3:27017/red-o?authSource=red-o';

// ⚠️ CAMBIA ESTAS CONTRASEÑAS POR LAS QUE QUIERAS
const USUARIOS = [
  { username: 'CASS', newPassword: 'NuevaPassword123!' },
  { username: 'CASS1', newPassword: 'OtraPassword456!' }
];

const SALT_ROUNDS = 12;

function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

async function hashPasswordWithSalt(password, salt) {
  const combinedPassword = password + salt;
  return await bcrypt.hash(combinedPassword, SALT_ROUNDS);
}

async function cambiarPasswords() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    console.log('📍 URI:', MONGO_URI.replace(/:[^:@]+@/, ':****@')); // Ocultar password en log
    
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000, // 30 segundos
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });
    
    console.log('✅ Conectado a MongoDB');
    console.log('📍 Database:', mongoose.connection.name);
    console.log('');

    for (const config of USUARIOS) {
      const user = await User.findOne({ username: config.username });
      
      if (!user) {
        console.log(`❌ Usuario ${config.username} no encontrado`);
        continue;
      }

      const password_salt = generateSalt();
      const password_hash = await hashPasswordWithSalt(config.newPassword, password_salt);

      user.password_salt = password_salt;
      user.password_hash = password_hash;
      user.login_attempts = 0;
      user.lock_until = undefined;
      
      await user.save();
      
      console.log(`✅ Contraseña actualizada para: ${config.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nueva contraseña: ${config.newPassword}`);
      console.log('');
    }

    console.log('🎉 Todas las contraseñas han sido actualizadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

cambiarPasswords();
