import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ModernHeader = ({ 
  user, 
  searchValue = '', 
  onSearchChange, 
  onSearchSubmit, 
  notificationCount = 0,
  darkMode = false,
  onToggleTheme,
  onOpenUploadModal,
  onOpenChat,
  onLogout
}) => {
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  // Cerrar menú cuando se hace clic fuera
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuOpen && !event.target.closest('.profile-menu-container')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <header 
      className="modern-header glass-effect animate-fade-in"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 999,
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border-color)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 2px 10px var(--shadow-color)',
        transition: 'all var(--transition-medium)'
      }}
    >
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>
        <form 
          onSubmit={onSearchSubmit}
          style={{
            flex: 1,
            maxWidth: '450px',
            position: 'relative'
          }}
        >
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{
              position: 'absolute',
              left: '1rem',
              fontSize: '18px',
              pointerEvents: 'none',
              opacity: 0.6
            }}>
              🔍
            </span>
            <input
              type="text"
              value={searchValue}
              onChange={onSearchChange}
              placeholder="Buscar usuarios, posts, amigos..."
              style={{
                width: '100%',
                padding: '0.875rem 1rem 0.875rem 3rem',
                background: 'var(--bg-secondary)',
                border: '2px solid transparent',
                borderRadius: '25px',
                fontSize: '14px',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'all var(--transition-medium)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 0 0 4px rgba(167, 118, 147, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'transparent';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </form>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <button
            onClick={onOpenUploadModal}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all var(--transition-medium)',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
            className="hover-lift"
            title="Crear publicación"
          >
            <span style={{ fontSize: '16px' }}>✨</span>
            <span>Crear</span>
          </button>

          <button
            onClick={() => navigate('/notifications')}
            style={{
              position: 'relative',
              width: '44px',
              height: '44px',
              background: 'var(--bg-secondary)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              transition: 'all var(--transition-medium)'
            }}
            className="hover-lift"
          >
            ♡
            {notificationCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '10px',
                minWidth: '18px',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(250, 112, 154, 0.4)'
              }} className="animate-pulse">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          <button
            onClick={onToggleTheme}
            style={{
              width: '44px',
              height: '44px',
              background: 'var(--bg-secondary)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              transition: 'all var(--transition-medium)'
            }}
            className="hover-lift"
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          <button
            onClick={() => {
              if (onOpenChat) {
                onOpenChat();
              } else {
                navigate('/messages');
              }
            }}
            style={{
              width: '44px',
              height: '44px',
              background: 'var(--bg-secondary)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              transition: 'all var(--transition-medium)'
            }}
            className="hover-lift"
            title="Mensajes"
          >
            💬
          </button>

          <div style={{ position: 'relative' }} className="profile-menu-container">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                width: '44px',
                height: '44px',
                backgroundImage: user?.image 
                  ? `url(http://localhost:3002${user.image})` 
                  : 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '2px solid var(--bg-secondary)',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                color: 'white',
                transition: 'all var(--transition-medium)',
                boxShadow: '0 2px 8px rgba(168, 237, 234, 0.3)'
              }}
              className="hover-lift"
              title={`${user?.firstName} ${user?.lastName}`}
            >
              {!user?.image && (user?.firstName?.charAt(0)?.toUpperCase() || '👤')}
            </button>
            
            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                minWidth: '220px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px var(--shadow-color)',
                overflow: 'hidden',
                zIndex: 1000,
                animation: 'slideDown 0.2s ease'
              }}>
                {/* User Info */}
                <div style={{
                  padding: '1rem',
                  borderBottom: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)'
                }}>
                  <div style={{
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '4px'
                  }}>
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)'
                  }}>
                    @{user?.username}
                  </div>
                </div>
                
                {/* Menu Items */}
                <div style={{ padding: '0.5rem 0' }}>
                  <button
                    onClick={() => {
                      navigate(`/u/${user?.username}`);
                      setUserMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      background: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'background var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    <span>👤</span>
                    <span>Mi Perfil</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setUserMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      background: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'background var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    <span>⚙️</span>
                    <span>Configuración</span>
                  </button>
                </div>
                
                {/* Logout Button */}
                <div style={{
                  padding: '0.5rem',
                  borderTop: '1px solid var(--border-color)'
                }}>
                  <button
                    onClick={() => {
                      onLogout?.();
                      setUserMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                      color: 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      transition: 'all var(--transition-fast)'
                    }}
                    className="hover-lift"
                  >
                    <span>🚪</span>
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </header>
  );
};

export default ModernHeader;