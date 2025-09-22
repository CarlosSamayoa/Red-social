import React, { useState, useRef, useEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { postJSON } from '../api';

const loginBgUrl =
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1500&q=80';

const carouselImages = [
  {
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    caption: '“Encuentra lo que amas y deja que te destruya.”',
  },
  {
    url: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80',
    caption:
      '“Estamos aquí para reírnos de las adversidades y vivir tan bien que la Muerte tiemble al llevarnos.”',
  },
  {
    url: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80',
    caption: '“Lo que más importa es qué tan bien caminas a través del fuego.”',
  },
  {
    url: 'https://images.unsplash.com/photo-1465101178521-c3a6088ed0c4?auto=format&fit=crop&w=800&q=80',
    caption:
      '“Algunas personas nunca se vuelven locas. ¡Qué vidas tan horribles deben llevar!”',
  },
  {
    url: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80',
    caption: '“Tienes que morir unas cuantas veces antes de poder vivir de verdad.”',
  },
];

const Register = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaValue, setCaptchaValue] = useState(null);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const carouselInterval = useRef(null);

  useEffect(() => {
    carouselInterval.current = setInterval(() => {
      setCarouselIdx((idx) => (idx + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(carouselInterval.current);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError('');
  };

  const handleCaptchaChange = (value) => {
    setCaptchaValue(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validaciones del lado del cliente
    if (!formData.firstName.trim()) {
      setError('Por favor ingresa tu nombre');
      setLoading(false);
      return;
    }
    
    if (!formData.lastName.trim()) {
      setError('Por favor ingresa tu apellido');
      setLoading(false);
      return;
    }
    
    if (!formData.username.trim()) {
      setError('Por favor ingresa un nombre de usuario');
      setLoading(false);
      return;
    }
    
    if (formData.username.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres');
      setLoading(false);
      return;
    }
    
    if (!formData.email.trim()) {
      setError('Por favor ingresa tu email');
      setLoading(false);
      return;
    }
    
    if (!formData.password) {
      setError('Por favor ingresa una contraseña');
      setLoading(false);
      return;
    }
    
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }
    
    if (!captchaValue) {
      setError('Por favor completa el reCAPTCHA');
      setLoading(false);
      return;
    }
    
    try {
      const data = await postJSON('/auth/register', {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        username: formData.username,
        email: formData.email,
        password: formData.password,
        recaptcha: captchaValue,
      });
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onRegisterSuccess(data.user, data.token);
    } catch (error) {
      setError(error.message || 'Error de conexión. Por favor intenta de nuevo.');
      setCaptchaValue(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Fondo global */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          background: `url(${loginBgUrl}) center/cover no-repeat`,
          backgroundAttachment: 'fixed',
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background:
            'linear-gradient(120deg, rgba(24,90,219,0.65), rgba(10,35,66,0.65))',
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 0',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '1100px',
            maxWidth: '99vw',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 48px 0 #00000055',
          }}
        >
          {/* Panel Izquierdo: Carrusel */}
          <div
            style={{
              flex: 2,
              minWidth: 0,
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
              padding: '2.5rem',
              background: `linear-gradient(120deg, rgba(24,90,219,0.38), rgba(54,195,242,0.18)), url(${carouselImages[carouselIdx].url}) center/cover no-repeat`,
              transition: 'background-image 0.7s',
            }}
          >
            <div style={{ width: '100%', marginBottom: 32 }}>
              <div
                style={{
                  color: '#fff',
                  fontSize: '1.35rem',
                  fontWeight: 500,
                  textShadow: '0 2px 12px #23243a99',
                  marginBottom: 32,
                  letterSpacing: 0.5,
                  textAlign: 'center',
                  minHeight: 60,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(20,40,80,0.32)',
                  borderRadius: 12,
                  padding: '1.2rem 1.5rem',
                  boxShadow: '0 2px 16px #23243a33',
                }}
              >
                {carouselImages[carouselIdx].caption}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {carouselImages.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 22,
                      height: 6,
                      borderRadius: 4,
                      background:
                        idx === carouselIdx
                          ? '#fff'
                          : 'rgba(255,255,255,0.25)',
                      transition: 'background 0.3s',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Panel Derecho: Formulario */}
          <div
            style={{
              flex: 3,
              background: '#1e1e2f',
              padding: '3rem 2.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minWidth: 420,
              maxWidth: 720,
              borderRadius: '0 16px 16px 0',
            }}
          >
            <div style={{ marginBottom: 18 }}>
              <h2
                style={{
                  color: '#fff',
                  fontSize: '2rem',
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Crear cuenta
              </h2>
              <span style={{ color: '#bfc6e0', fontSize: '1rem' }}>
                ¿Ya tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  style={{
                    color: '#7d6df6',
                    background: 'none',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '1rem',
                    textDecoration: 'underline',
                  }}
                >
                  Inicia sesión
                </button>
              </span>
            </div>

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              {/* Nombre y Apellido juntos */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  name="firstName"
                  placeholder="Nombre"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: '#2b2b3c',
                    color: '#fff',
                    border: '1px solid #3a3a4f',
                    borderRadius: 8,
                    fontSize: '1rem',
                    padding: '0.9rem',
                    outline: 'none',
                  }}
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Apellido"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: '#2b2b3c',
                    color: '#fff',
                    border: '1px solid #3a3a4f',
                    borderRadius: 8,
                    fontSize: '1rem',
                    padding: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <input
                type="text"
                name="username"
                placeholder="Nombre de usuario"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#2b2b3c',
                  color: '#fff',
                  border: '1px solid #3a3a4f',
                  borderRadius: 8,
                  fontSize: '1rem',
                  padding: '0.9rem',
                  marginBottom: '1rem',
                  outline: 'none',
                }}
              />
              <input
                type="email"
                name="email"
                placeholder="Correo electrónico"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#2b2b3c',
                  color: '#fff',
                  border: '1px solid #3a3a4f',
                  borderRadius: 8,
                  fontSize: '1rem',
                  padding: '0.9rem',
                  marginBottom: '1rem',
                  outline: 'none',
                }}
              />
              <input
                type="password"
                name="password"
                placeholder="Contraseña"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#2b2b3c',
                  color: '#fff',
                  border: '1px solid #3a3a4f',
                  borderRadius: 8,
                  fontSize: '1rem',
                  padding: '0.9rem',
                  marginBottom: '1rem',
                  outline: 'none',
                }}
              />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirmar contraseña"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#2b2b3c',
                  color: '#fff',
                  border: '1px solid #3a3a4f',
                  borderRadius: 8,
                  fontSize: '1rem',
                  padding: '0.9rem',
                  marginBottom: '1rem',
                  outline: 'none',
                }}
              />

              <div style={{ marginBottom: 10 }}>
                <ReCAPTCHA
                  sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                  onChange={handleCaptchaChange}
                />
              </div>

              {error && (
                <div
                  style={{
                    color: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    border: '1px solid rgba(255, 107, 107, 0.3)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    lineHeight: '1.4',
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !captchaValue}
                style={{
                  width: '100%',
                  background: '#7d6df6',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '1rem',
                  border: 'none',
                  borderRadius: 8,
                  padding: '1rem',
                  marginBottom: '1.2rem',
                  cursor: 'pointer',
                }}
              >
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  margin: '18px 0 10px 0',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: 'rgba(255,255,255,0.13)',
                  }}
                />
                <span
                  style={{
                    color: '#bfc6e0',
                    margin: '0 12px',
                    fontSize: '1rem',
                  }}
                >
                  O regístrate con
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: 'rgba(255,255,255,0.13)',
                  }}
                />
              </div>

              {/* Solo Google */}
              <div style={{ display: 'flex', gap: 16 }}>
                <a
                  href={`${import.meta.env.VITE_API || 'http://localhost:3001/api'}/auth/google`}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: '#fff',
                    color: '#23243a',
                    fontWeight: 600,
                    fontSize: '1rem',
                    borderRadius: 8,
                    padding: '0.8rem 0',
                    textDecoration: 'none',
                    border: '1px solid #3a3a4f',
                  }}
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
                    alt="Google"
                    style={{ width: 20, height: 20 }}
                  />
                  Google
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
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
          zIndex: 100,
        }}
      >
        <span style={{ opacity: 0.85 }}>
          Desarrollado por <b>Carlos S</b> &copy; 2025 — Proyecto académico Red-O
        </span>
      </footer>
    </>
  );
};

export default Register;
