import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Importar el modelo de Usuario
import User from '../src/models/User.js';

const MONGO_URI = 'mongodb://localhost:27017/insta';

// Configuración igual que en auth.js
const SALT_ROUNDS = 12;

function generateSalt() {
  return crypto.randomBytes(32).toString('hex');
}

async function hashPasswordWithSalt(password, salt) {
  const combinedPassword = password + salt;
  return await bcrypt.hash(combinedPassword, SALT_ROUNDS);
}

async function createTestUser() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ 
      $or: [{ email: 'test@example.com' }, { username: 'testuser' }] 
    });

    if (existingUser) {
      console.log('❌ El usuario test ya existe');
      process.exit(0);
    }

    // Crear usuario de prueba
    const password = 'Test123!';
    const password_salt = generateSalt();
    const password_hash = await hashPasswordWithSalt(password, password_salt);

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

    console.log('✅ Usuario de prueba creado exitosamente:');
    console.log('   Email: test@example.com');
    console.log('   Username: testuser');
    console.log('   Password: Test123!');
    console.log('   ID:', user._id);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    process.exit(1);
  }
}

createTestUser();