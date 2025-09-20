import React, { useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { postJSON } from '../api';
import '../styles/modern-auth.css';

function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaValue, setCaptchaValue] = useState(null);

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

  const handleCaptchaChange = (value) => {
    setCaptchaValue(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await postJSON('/auth/login', {
        identifier: formData.identifier,
        password: formData.password,
        recaptcha: captchaValue,
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Error de conexión. Por favor intenta de nuevo.');
      setCaptchaValue(null);
    } finally {
      setLoading(false); // ✅ solo estados, no JSX
    }
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

            <div
              className="captcha-container"
              style={{ marginBottom: '1.2rem', display: 'flex', justifyContent: 'center' }}
            >
              <ReCAPTCHA
                sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                onChange={handleCaptchaChange}
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

            <button
              type="submit"
              className="auth-button"
              disabled={loading || !captchaValue}
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
            }}
          >
            <span>O</span>
          </div>

          <a
            href={`${import.meta.env.VITE_API || 'http://localhost:3001/api'}/auth/google`}
            className="google-login-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.7rem',
              width: '100%',
              padding: '0.8rem 0',
              borderRadius: 20,
              background: '#fff',
              color: '#185adb',
              fontWeight: 600,
              fontSize: '1rem',
              boxShadow: '0 2px 8px #185adb22',
              marginBottom: 18,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Iniciar sesión con Google
          </a>

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

export default Login;
// Hecho con ❤️ por Carlos S - 2025 