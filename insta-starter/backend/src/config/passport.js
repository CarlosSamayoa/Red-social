import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

// Configuración de Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'tu-client-id-aqui',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'tu-client-secret-aqui',
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:8080/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Buscar usuario existente con Google ID
    let user = await User.findOne({ google_id: profile.id });
    
    if (user) {
      // Usuario ya existe, actualizar información si es necesario
      user.last_login = Date.now();
      await user.save();
      return done(null, user);
    }
    
    // Verificar si ya existe un usuario con el mismo email
    const emailUser = await User.findOne({ email: profile.emails[0].value.toLowerCase() });
    
    if (emailUser) {
      // Vincular cuenta de Google al usuario existente
      emailUser.google_id = profile.id;
      emailUser.google_sub = profile.id; // Para compatibilidad
      emailUser.last_login = Date.now();
      
      // Actualizar imagen de perfil si no tiene una
      if (!emailUser.profile_image && profile.photos && profile.photos.length > 0) {
        emailUser.profile_image = profile.photos[0].value;
      }
      
      await emailUser.save();
      return done(null, emailUser);
    }
    
    // Crear nuevo usuario con información de Google
    const newUser = await User.create({
      email: profile.emails[0].value.toLowerCase(),
      username: profile.emails[0].value.split('@')[0] + '_' + Date.now(), // Username único
      firstName: profile.name.givenName || '',
      lastName: profile.name.familyName || '',
      name: profile.displayName || `${profile.name.givenName} ${profile.name.familyName}`,
      google_id: profile.id,
      google_sub: profile.id, // Para compatibilidad
      profile_image: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
      is_verified: true, // Los usuarios de Google se consideran verificados
      last_login: Date.now()
    });
    
    return done(null, newUser);
  } catch (error) {
    console.error('Error en Google OAuth:', error);
    return done(error, null);
  }
}));

// Serialización para sesiones
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;