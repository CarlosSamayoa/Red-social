import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import ReCAPTCHA from 'react-google-recaptcha'
import Feed from './components/Feed.jsx'
import UserProfile from './components/UserProfile.jsx'
import Notifications from './components/Notifications.jsx'
import Search from './components/Search.jsx'
import Settings from './components/Settings.jsx'
import PostView from './components/PostView.jsx'
import FaceDetection from './components/FaceDetection.jsx'
import Register from './components/Register.jsx'
import Login from './components/Login.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import FriendRequests from './components/FriendRequests.jsx'
// Importaciones temporalmente comentadas para debug
// import Sidebar from './components/Sidebar.jsx'
// import ModernHeader from './components/ModernHeader.jsx'
import { postJSON, postForm, STATIC } from './api'
import './styles/instagram.css'

function DevLogin({ onLogin }){
  const [loading, setLoading] = useState(false)
  const [recaptchaValue, setRecaptchaValue] = useState(null)
  const [formData, setFormData] = useState({
    email: 'demo@example.com',
    username: 'demo',
    name: 'Demo User'
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRecaptcha = (value) => {
    setRecaptchaValue(value)
  }

  const submit = async (e)=>{
    e.preventDefault()
    
    // Verificar reCAPTCHA en producción
    if (process.env.NODE_ENV === 'production' && !recaptchaValue) {
      alert('Please complete the reCAPTCHA verification')
      return
    }

    setLoading(true)
    const payload = { 
      ...formData, 
      recaptcha_token: recaptchaValue 
    }
    const j = await postJSON('/auth/dev-login', payload).catch(()=>null)
    setLoading(false)
    if(j?.token){ 
      localStorage.setItem('token', j.token); 
      localStorage.setItem('uid', j.user.id); 
      onLogin(j.user) 
    } else {
      alert('Login failed. Please try again.')
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-logo">Red-O</h1>
        <form onSubmit={submit} className="login-form">
          <input 
            name="email" 
            placeholder="Email" 
            value={formData.email}
            onChange={handleChange}
            className="login-input"
            required
          />
          <input 
            name="username" 
            placeholder="Username" 
            value={formData.username}
            onChange={handleChange}
            className="login-input"
            required
          />
          <input 
            name="name" 
            placeholder="Full Name" 
            value={formData.name}
            onChange={handleChange}
            className="login-input"
            required
          />
          <button disabled={loading} className="login-button">
            {loading ? <span className="loading"></span> : 'Log In'}
          </button>
          
          {/* reCAPTCHA - Solo en producción o cuando esté configurado */}
          {process.env.REACT_APP_RECAPTCHA_SITE_KEY && (
            <div style={{marginTop: '16px', display: 'flex', justifyContent: 'center'}}>
              <ReCAPTCHA
                sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                onChange={handleRecaptcha}
                theme="light"
              />
            </div>
          )}
        </form>
        
        {/* Google Login Button */}
        <div style={{marginTop: '16px', textAlign: 'center'}}>
          <button 
            type="button" 
            onClick={() => window.location.href = '/api/auth/google'}
            style={{
              background: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  )
}

function UploadPost(){
  const [busy, setBusy] = useState(false)
  const [fileLabel, setFileLabel] = useState('')
  const [caption, setCaption] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [faceData, setFaceData] = useState([])
  
  const onChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileLabel(file.name)
      setSelectedFile(file)
    } else {
      setFileLabel('')
      setSelectedFile(null)
    }
  }

  const handleFacesDetected = (faces) => {
    setFaceData(faces)
    console.log('Faces detected:', faces)
  }
  
  const submit = async (e)=>{
    e.preventDefault()
    setBusy(true)
    const fd = new FormData(e.currentTarget)
    
    // Agregar datos de detección facial si están disponibles
    if (faceData.length > 0) {
      fd.append('face_data', JSON.stringify(faceData))
    }
    
    await postForm('/uploads/local', fd).catch(()=>{})
    setBusy(false)
    if (e.currentTarget) {
      e.currentTarget.reset()
    }
    setFileLabel('')
    setCaption('')
    setSelectedFile(null)
    setFaceData([])
    window.location.reload()
  }

  return (
    <div className="upload-container">
      <form onSubmit={submit} className="upload-form">
        <div className="file-input-wrapper">
          <input 
            name="image" 
            type="file" 
            accept="image/*" 
            required 
            onChange={onChange}
            className="file-input"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="file-input-label">
            {fileLabel || 'Choose Photo'}
          </label>
        </div>
        <textarea 
          name="text" 
          placeholder="Write a caption..." 
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="caption-input"
        />
        <button disabled={busy || !fileLabel} className="upload-btn">
          {busy ? <span className="loading"></span> : 'Share'}
        </button>
      </form>
      
      {/* Face Detection Preview */}
      {selectedFile && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ marginBottom: '8px', fontSize: '14px', color: '#262626' }}>
            Face Detection Preview:
          </h4>
          <FaceDetection 
            imageFile={selectedFile} 
            onFacesDetected={handleFacesDetected}
          />
          {faceData.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
              Detected: {faceData.length} face{faceData.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function App(){
  const [authed, setAuthed] = useState(!!localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login') // 'login', 'register', 'dev'
  const [notificationCount, setNotificationCount] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatTargetUser, setChatTargetUser] = useState(null)
  const [headerSearch, setHeaderSearch] = useState('')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false) // Estado para el menú desplegable
  const navigate = useNavigate()
  const location = useLocation()

  const API = import.meta.env.VITE_API || 'http://localhost:8080/api'
  
  // Hook para cargar notificaciones
  const loadNotifications = async () => {
    try {
      const r = await fetch(`${API}/notifications`, { 
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      if (!r.ok) return
      const j = await r.json()
      const unread = (j.notifications || []).filter(n => !n.is_read).length
      setNotificationCount(unread)
    } catch {}
  }

  const openChatWithUser = (username) => {
    console.log('openChatWithUser called with:', username);
    setChatTargetUser(username)
    console.log('setChatTargetUser called, current chatTargetUser will be:', username);
    setChatOpen(true)
    console.log('setChatOpen(true) called');
  }

  // Cargar usuario desde localStorage al iniciar
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser && authed) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Error parsing stored user:', error)
        logout()
      }
    }

    // Verificar parámetros de URL para OAuth callback
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const userParam = urlParams.get('user')
    
    if (token && userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam))
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
        setAuthed(true)
        // Limpiar URL
        window.history.replaceState({}, document.title, window.location.pathname)
        // Redirigir al perfil
        if(userData?.username) navigate(`/u/${userData.username}`)
      } catch (error) {
        console.error('Error processing OAuth callback:', error)
      }
    }
  }, [authed, navigate])

  // Cargar notificaciones
  useEffect(() => {
    if (authed) {
      loadNotifications()
      const id = setInterval(loadNotifications, 30000)
      return () => clearInterval(id)
    }
  }, [authed])

  // Cerrar menú de perfil al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuOpen && !event.target.closest('.profile-menu-container')) {
        setProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileMenuOpen])

  const logout = ()=>{ 
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('uid')
    setAuthed(false)
    setUser(null)
    navigate('/login')
  }

  const handleHeaderSearch = (e) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      navigate(`/search?q=${encodeURIComponent(headerSearch.trim())}`);
    }
  }

  const handleAuthSuccess = (userData, token) => {
    setUser(userData)
    setAuthed(true)
    // Token y user ya están guardados en localStorage por los componentes
    // Redirigir al feed principal después del login
    navigate('/')
  }

  const switchToRegister = () => setAuthMode('register')
  const switchToLogin = () => setAuthMode('login')
  const switchToDev = () => setAuthMode('dev')

  // Sistema de autenticación
  if (!authed) {
    return (
      <div>
        {authMode === 'login' && (
          <Login 
            onLoginSuccess={handleAuthSuccess}
            onSwitchToRegister={switchToRegister}
          />
        )}
        {authMode === 'register' && (
          <Register 
            onRegisterSuccess={handleAuthSuccess}
            onSwitchToLogin={switchToLogin}
          />
        )}
        {authMode === 'dev' && (
          <DevLogin onLogin={handleAuthSuccess} />
        )}
        
        {/* Enlaces para cambiar entre modos */}
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px'
        }}>
          <div>Modo desarrollo:</div>
          <button 
            onClick={switchToDev}
            style={{
              background: 'none',
              border: '1px solid white',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              marginTop: '4px'
            }}
          >
            Dev Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #F2F3F4 0%, #DED1C6 50%, #A77693 100%)'}}>
      {/* Sidebar */}
      <div style={{
        width: '200px',
        background: 'rgba(255,255,255,0.95)',
        position: 'fixed',
        height: '100vh',
        left: 0,
        top: 0,
        zIndex: 1000,
        padding: '1rem',
        borderRight: '1px solid rgba(167,118,147,0.2)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h2 style={{color: '#174871', marginBottom: '2rem', fontSize: '1.5rem'}}>Red-O</h2>
        
        <nav style={{flex: 1}}>
          <div style={{marginBottom: '1rem'}}>
            <a href="/" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              textDecoration: 'none',
              color: '#174871',
              borderRadius: '12px',
              transition: 'all 0.3s ease'
            }}>
              <span style={{fontSize: '1.2rem'}}>🏠</span>
              Inicio
            </a>
          </div>
          <div style={{marginBottom: '1rem'}}>
            <a href="/search" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              textDecoration: 'none',
              color: '#174871',
              borderRadius: '12px',
              transition: 'all 0.3s ease'
            }}>
              <span style={{fontSize: '1.2rem'}}>🔍</span>
              Buscar
            </a>
          </div>
          <div style={{marginBottom: '1rem'}}>
            <a href="/search" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              textDecoration: 'none',
              color: '#174871',
              borderRadius: '12px',
              transition: 'all 0.3s ease'
            }}>
              <span style={{fontSize: '1.2rem'}}>🔍✨</span>
              Explorar
            </a>
          </div>
          <div style={{marginBottom: '1rem'}}>
            <a href="/notifications" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              textDecoration: 'none',
              color: '#174871',
              borderRadius: '12px',
              transition: 'all 0.3s ease'
            }}>
              <span style={{fontSize: '1.2rem'}}>♡</span>
              Notificaciones
            </a>
          </div>
          <div style={{marginBottom: '1rem'}}>
            <a href="/friends" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              textDecoration: 'none',
              color: '#174871',
              borderRadius: '12px',
              transition: 'all 0.3s ease'
            }}>
              <span style={{fontSize: '1.2rem'}}>👥</span>
              Amigos
            </a>
          </div>
        </nav>
        
        <div style={{marginTop: 'auto', paddingTop: '2rem'}}>
          <div style={{fontSize: '0.9rem', color: '#174871', marginBottom: '0.5rem'}}>
            {user?.firstName} {user?.lastName}
          </div>
          <button onClick={logout} style={{
            background: 'linear-gradient(135deg, #A77693, #174871)',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}>
            Salir
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{
        marginLeft: '200px', 
        flex: 1, 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <header style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(222, 209, 198, 0.3)',
          padding: '1rem 2rem',
          marginBottom: '2rem',
          borderRadius: '0 0 20px 20px',
          boxShadow: '0 4px 20px rgba(23, 72, 113, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <form onSubmit={handleHeaderSearch} style={{flex: 1, maxWidth: '400px'}}>
              <input 
                type="text" 
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Buscar usuarios..." 
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: 'rgba(242, 243, 244, 0.8)',
                  border: '2px solid transparent',
                  borderRadius: '25px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.9)';
                  e.target.style.borderColor = 'rgba(167, 118, 147, 0.5)';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'rgba(242, 243, 244, 0.8)';
                  e.target.style.borderColor = 'transparent';
                }}
              />
            </form>
            
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'linear-gradient(135deg, #A77693, #174871)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
                >
                  ✨ Crear
                </button>
              </Link>
              
              <Link to="/notifications" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '8px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(167, 118, 147, 0.1)';
                  e.target.style.borderRadius = '50%';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                }}
                >
                  ♡
                </button>
              </Link>

              <button 
                onClick={() => setChatOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '8px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(167, 118, 147, 0.1)';
                  e.target.style.borderRadius = '50%';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                }}
              >
                💬
              </button>

              <div style={{ position: 'relative' }} className="profile-menu-container">
                <div 
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #174871, #0F2040)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                    e.target.style.boxShadow = '0 4px 12px rgba(167, 118, 147, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {user?.firstName?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>

                {profileMenuOpen && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      top: '40px',
                      right: '0',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                      border: '1px solid #e1e5e9',
                      minWidth: '200px',
                      zIndex: 9999,
                      overflow: 'hidden'
                    }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #e1e5e9' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#262626' }}>
                        {user?.firstName || user?.name || 'Usuario'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                        @{user?.username || 'unknown'}
                      </div>
                    </div>
                    
                    <div 
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate(`/users/${user?.username || 'unknown'}`);
                      }}
                      style={{
                        display: 'block',
                        padding: '12px 16px',
                        color: '#262626',
                        fontSize: '14px',
                        borderBottom: '1px solid #e1e5e9',
                        transition: 'background-color 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f7f7f7'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      👤 Ver perfil
                    </div>
                    
                    <div 
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate('/settings');
                      }}
                      style={{
                        display: 'block',
                        padding: '12px 16px',
                        color: '#262626',
                        fontSize: '14px',
                        borderBottom: '1px solid #e1e5e9',
                        transition: 'background-color 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f7f7f7'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      ⚙️ Configuración
                    </div>
                    
                    <div
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                      }}
                      style={{
                        padding: '12px 16px',
                        color: '#ed4956',
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#fef7f7'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      🚪 Cerrar sesión
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        
        {/* Content Area */}
        <main style={{
          maxWidth: location.pathname === '/search' ? '100%' : '600px',
          margin: '0 auto',
          padding: location.pathname === '/search' ? '0 1rem 2rem' : '0 2rem 2rem',
          flex: 1,
          minHeight: '0' // Permite que el main se adapte al espacio disponible
        }}>
          <Routes>
            <Route path="/" element={
              <div>
                <UploadPost />
                <Feed />
              </div>
            } />
            <Route path="/users/:username" element={<UserProfile currentUser={user} openChat={openChatWithUser} />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/search" element={<Search />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/friends" element={<FriendRequests />} />
            <Route path="/p/:id" element={<PostView />} />
          </Routes>
        </main>
        
        {/* Footer - Ahora queda fijo en la parte inferior */}
        <footer style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(222, 209, 198, 0.3)',
          padding: '1rem 2rem',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 20px rgba(23, 72, 113, 0.1)',
          marginTop: 'auto',
          flexShrink: 0 // Evita que el footer se comprima
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: '800px',
            margin: '0 auto',
            fontSize: '0.9rem',
            color: '#174871'
          }}>
            <div style={{display: 'flex', gap: '1rem'}}>
              <a href="/" style={{color: '#A77693', textDecoration: 'none'}}>Inicio</a>
              <a href="/search" style={{color: '#A77693', textDecoration: 'none'}}>Explorar</a>
              <a href="/notifications" style={{color: '#A77693', textDecoration: 'none'}}>Actividad</a>
              <a href="/settings" style={{color: '#A77693', textDecoration: 'none'}}>Ajustes</a>
            </div>
            
            <div style={{
              fontSize: '0.8rem',
              color: '#174871',
              opacity: 0.7
            }}>
              © 2025 Red-O - Social Network
            </div>
          </div>
        </footer>
      </div>
      
      {/* Chat Window */}
      <ChatWindow 
        isOpen={chatOpen} 
        onClose={() => {
          setChatOpen(false)
          setChatTargetUser(null)
        }}
        targetUser={chatTargetUser}
      />
    </div>
  )
}
