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
import Messages from './components/Messages.jsx'
import UploadPost from './components/UploadPost.jsx'
import UploadPostModal from './components/UploadPostModal.jsx'
import ModernSidebar from './components/ModernSidebar.jsx'
import ModernHeader from './components/ModernHeader.jsx'
import { postJSON, postForm, STATIC } from './api'
import './styles/instagram.css'
import './styles/modern-theme.css'

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

// UploadPost component moved to ./components/UploadPost.jsx with image filters support

export default function App(){
  const [authed, setAuthed] = useState(!!localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login') // 'login', 'register', 'dev'
  const [notificationCount, setNotificationCount] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatTargetUser, setChatTargetUser] = useState(null)
  const [headerSearch, setHeaderSearch] = useState('')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })
  const navigate = useNavigate()
  const location = useLocation()

  const API = import.meta.env.VITE_API || 'http://localhost:3001/api'
  
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

  // Aplicar tema oscuro/claro
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

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

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed)
  const toggleTheme = () => setDarkMode(!darkMode)

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
    <div className="gradient-bg" style={{display: 'flex', minHeight: '100vh'}}>
      {/* Modern Sidebar */}
      <ModernSidebar 
        user={user}
        isCollapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        onLogout={logout}
        notificationCount={notificationCount}
      />

      
      {/* Main Content */}
      <div 
        className="animate-slide-left"
        style={{
          marginLeft: sidebarCollapsed ? '80px' : '260px',
          flex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left var(--transition-medium)'
        }}
      >
        {/* Modern Header */}
        <ModernHeader 
          user={user}
          searchValue={headerSearch}
          onSearchChange={(e) => setHeaderSearch(e.target.value)}
          onSearchSubmit={handleHeaderSearch}
          notificationCount={notificationCount}
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
          onOpenUploadModal={() => setUploadModalOpen(true)}
          onOpenChat={() => setChatOpen(true)}
          onLogout={logout}
        />
        
        {/* Content Area */}
        <main 
          className="animate-fade-in"
          style={{
            maxWidth: location.pathname === '/search' ? '100%' : '900px',
            margin: '0 auto',
            padding: location.pathname === '/search' ? '1rem' : '2rem',
            flex: 1,
            minHeight: '0',
            width: '100%'
          }}
        >
          <Routes>
            <Route path="/" element={
              <div className="animate-fade-in-scale">
                <Feed />
              </div>
            } />
            <Route path="/u/:username" element={<UserProfile currentUser={user} openChat={openChatWithUser} />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/search" element={<Search />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/friends" element={<FriendRequests />} />
            <Route path="/p/:id" element={<PostView />} />
          </Routes>
        </main>
        
        {/* Modern Footer */}
        <footer 
          className="glass-effect"
          style={{
            borderTop: '1px solid var(--border-color)',
            padding: '1.5rem 2rem',
            marginTop: 'auto',
            flexShrink: 0
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: '900px',
            margin: '0 auto',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)'
          }}>
            <div style={{display: 'flex', gap: '1.5rem', flexWrap: 'wrap'}}>
              <Link to="/" style={{color: 'var(--primary)', textDecoration: 'none', fontWeight: '500'}}>Inicio</Link>
              <Link to="/search" style={{color: 'var(--primary)', textDecoration: 'none', fontWeight: '500'}}>Explorar</Link>
              <Link to="/notifications" style={{color: 'var(--primary)', textDecoration: 'none', fontWeight: '500'}}>Actividad</Link>
              <Link to="/settings" style={{color: 'var(--primary)', textDecoration: 'none', fontWeight: '500'}}>Ajustes</Link>
            </div>
            
            <div style={{
              fontSize: '0.75rem',
              opacity: 0.7,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>© 2025 Red-O</span>
              <span>•</span>
              <span>Social Network</span>
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
      
      {/* Upload Post Modal */}
      <UploadPostModal 
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </div>
  )
}
