import React, { useState, useCallback, useEffect } from 'react';
import { postJSON } from '../api';
import '../styles/modern-auth.css';
import { GoogleLogin } from '@react-oauth/google';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

// El componente principal ahora está envuelto para usar el hook de reCAPTCHA
function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Hook de reCAPTCHA v3
  const { executeRecaptcha, recaptchaAvailable } = useGoogleReCaptcha();

  // Debug: Verificar el estado de reCAPTCHA
  useEffect(() => {
    console.log('🔐 reCAPTCHA disponible:', recaptchaAvailable);
    console.log('🔑 executeRecaptcha:', executeRecaptcha ? 'Listo' : 'No disponible');
  }, [recaptchaAvailable, executeRecaptcha]);

  const loginBg = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 0,
    background:
      "linear-gradient(120deg, rgba(10,35,66,0.7) 60%, rgba(24,90,219,0.7) 100%), url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1500&q=80') center/cover no-repeat",
    pointerEvents: 'none',
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!executeRecaptcha) {
      setError('reCAPTCHA no está disponible. Por favor, recarga la página.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Obtener token de reCAPTCHA v3 antes de enviar
      const recaptchaToken = await executeRecaptcha('login');
      
      const data = await postJSON('/auth/login', {
        identifier: formData.identifier,
        password: formData.password,
        recaptcha: recaptchaToken,
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [executeRecaptcha, recaptchaAvailable, formData, onLoginSuccess]);

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      const idToken = credentialResponse.credential;
      const data = await postJSON('/auth/google-login', { token: idToken });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
    } catch (error) {
      console.error('Google login error:', error);
      setError(error.message || 'Error al iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLoginError = () => {
    console.error('Google login failed');
    setError('El inicio de sesión con Google falló. Por favor, intenta de nuevo.');
  };

  return (
    <>
      <div style={loginBg} />
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="auth-box fade-in-up"
          style={{
            background: 'rgba(20, 40, 80, 0.1)',
            boxShadow: '0 12px 48px 0 rgba(10,35,66,0.18)',
            borderRadius: '36px',
            padding: '4.5rem 4.5rem 3.5rem 4.5rem',
            minWidth: 520,
            maxWidth: 650,
            margin: '3.5rem',
            backdropFilter: 'blur(24px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            className="auth-header"
            style={{ width: '100%', textAlign: 'center', marginBottom: '2rem' }}
          >
            <h1
              style={{
                fontFamily: 'Montserrat, Segoe UI, Arial, sans-serif',
                fontWeight: 700,
                letterSpacing: 2,
                color: '#fff',
                fontSize: '2.2rem',
                marginBottom: 0,
              }}
            >
              Bienvenido a Red-O
            </h1>
            <p
              style={{
                color: '#fff',
                opacity: 0.9,
                marginBottom: '1.5rem',
                fontWeight: 400,
              }}
            >
              Inicia sesión para ver fotos de tus amigos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" style={{ width: '100%' }}>
            <div className="form-group" style={{ marginBottom: 28 }}>
              <label
                htmlFor="identifier"
                style={{
                  color: '#e3f0ff',
                  fontWeight: 600,
                  fontSize: '1.15rem',
                  letterSpacing: 1,
                  marginBottom: 8,
                  display: 'block',
                  textShadow: '0 2px 8px #0a234288',
                }}
              >
                Nombre de usuario o correo electrónico
              </label>
              <input
                id="identifier"
                type="text"
                name="identifier"
                placeholder="Ejemplo: carlos_s o carlos@ejemplo.com"
                value={formData.identifier}
                onChange={handleChange}
                required
                disabled={loading}
                style={{
                  background: 'rgba(255,255,255,0.13)',
                  color: '#e3f0ff',
                  border: 'none',
                  borderRadius: 24,
                  fontSize: '1.25rem',
                  padding: '1.2rem',
                  boxShadow: '0 2px 8px #185adb22',
                  width: '100%',
                  outline: 'none',
                  fontFamily: 'Montserrat, Segoe UI, Arial, sans-serif',
                  fontWeight: 500,
                  letterSpacing: 1,
                }}
              />
              <small 
                style={{
                  color: '#e3f0ff',
                  opacity: 0.7,
                  fontSize: '0.9rem',
                  marginTop: '0.5rem',
                  display: 'block'
                }}
              >
                Puedes usar tu nombre de usuario o tu dirección de correo
              </small>
            </div>

            <div className="form-group" style={{ marginBottom: 28 }}>
              <label
                htmlFor="password"
                style={{
                  color: '#e3f0ff',
                  fontWeight: 600,
                  fontSize: '1.15rem',
                  letterSpacing: 1,
                  marginBottom: 8,
                  display: 'block',
                  textShadow: '0 2px 8px #0a234288',
                }}
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Tu contraseña"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                style={{
                  background: 'rgba(255,255,255,0.13)',
                  color: '#e3f0ff',
                  border: 'none',
                  borderRadius: 24,
                  fontSize: '1.25rem',
                  padding: '1.2rem',
                  boxShadow: '0 2px 8px #185adb22',
                  width: '100%',
                  outline: 'none',
                  fontFamily: 'Montserrat, Segoe UI, Arial, sans-serif',
                  fontWeight: 500,
                  letterSpacing: 1,
                }}
              />
            </div>

            {error && (
              <div
                className="error-message"
                style={{
                  color: '#e74c3c',
                  marginBottom: '1rem',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            {/* Advertencia si reCAPTCHA no está disponible */}
            {!executeRecaptcha && (
              <div
                style={{
                  background: 'rgba(255, 193, 7, 0.15)',
                  border: '1px solid rgba(255, 193, 7, 0.4)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  marginBottom: 18,
                  textAlign: 'center',
                  fontSize: '0.9rem',
                  color: 'rgba(255, 193, 7, 0.95)',
                }}
              >
                ⚠️ Cargando reCAPTCHA... Por favor espera.
              </div>
            )}

            <button
              type="submit"
              className="auth-button"
              disabled={loading || !executeRecaptcha}
              style={{
                fontWeight: 700,
                fontSize: '1.15rem',
                borderRadius: 20,
                background: 'linear-gradient(90deg, #185adb, #36c3f2)',
                color: '#fff',
                padding: '1rem 0',
                marginBottom: 18,
                marginTop: 8,
                boxShadow: '0 6px 24px #36c3f244',
                letterSpacing: 1,
                width: '100%',
              }}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          <div
            className="auth-divider"
            style={{
              color: '#fff',
              opacity: 0.7,
              fontWeight: 500,
              letterSpacing: 1,
              margin: '1.2rem 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%'
            }}
          >
            <span style={{flex: 1, height: '1px', background: 'rgba(255,255,255,0.3)', marginRight: '1rem'}}></span>
            <span>O</span>
            <span style={{flex: 1, height: '1px', background: 'rgba(255,255,255,0.3)', marginLeft: '1rem'}}></span>
          </div>
          
          {/* TODO: Configurar orígenes autorizados en Google Cloud Console */}
          {/* Para habilitar: Agregar http://localhost:5173 en https://console.cloud.google.com/apis/credentials */}
          {/*
          <div style={{width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 18}}>
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
              theme="outline"
              size="large"
              text="signin_with"
              shape="pill"
              width="300px"
            />
          </div>
          */}
          
          <div style={{width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 18, padding: '12px', background: 'rgba(255,193,7,0.1)', borderRadius: '8px', border: '1px solid rgba(255,193,7,0.3)'}}>
            <small style={{color: 'rgba(255,193,7,0.9)', textAlign: 'center'}}>
              ⚠️ Google Login temporalmente deshabilitado. Configure el Client ID en Google Cloud Console.
            </small>
          </div>

          <div
            className="auth-footer"
            style={{ color: '#fff', opacity: 0.9, marginTop: 18, textAlign: 'center' }}
          >
            <p>
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                className="link-button"
                onClick={onSwitchToRegister}
                disabled={loading}
                style={{
                  color: '#36c3f2',
                  textDecoration: 'underline',
                  background: 'none',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Registrarse
              </button>
            </p>
          </div>
        </div>
      </div>

      <footer
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          background: 'rgba(20,40,80,0.18)',
          color: '#e3f0ff',
          fontFamily: 'Montserrat, Segoe UI, Arial, sans-serif',
          fontWeight: 400,
          fontSize: '1.05rem',
          textAlign: 'center',
          padding: '1.1rem 0 0.7rem 0',
          boxShadow: '0 -2px 16px #0a234244',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span style={{ opacity: 0.85 }}>
          Desarrollado por <b>Carlos S</b> &copy; 2025 &mdash; Proyecto académico Red-O
        </span>
      </footer>
    </>
  );
}

// Envolver el componente Login con el proveedor de reCAPTCHA
const LoginWrapper = (props) => {
  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY;
  
  // Debug: Verificar que la clave se esté cargando
  console.log('🔑 reCAPTCHA Key cargada:', recaptchaKey ? '✅ Sí' : '❌ No');
  console.log('📝 Longitud de la clave:', recaptchaKey?.length || 0);
  
  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaKey}>
      <Login {...props} />
    </GoogleReCaptchaProvider>
  );
};

export default LoginWrapper;