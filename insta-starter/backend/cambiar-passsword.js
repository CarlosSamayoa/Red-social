import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import User from './src/models/User.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/red-o';

// Configuración
const USUARIOS = [
  { username: 'CASS', newPassword: 'TuNuevaPassword123!' },
  { username: 'CASS1', newPassword: 'OtraNuevaPassword456!' }
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
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

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
      user.login_attempts = 0; // Resetear intentos fallidos
      user.lock_until = undefined; // Desbloquear cuenta si estaba bloqueada
      
      await user.save();
      
      console.log(`✅ Contraseña actualizada para ${config.username}`);
      console.log(`   Email: ${user.email}`);
    }

    console.log('\n🎉 Todas las contraseñas han sido actualizadas');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

cambiarPasswords();
