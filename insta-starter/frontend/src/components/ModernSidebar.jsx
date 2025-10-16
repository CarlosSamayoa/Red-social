import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function ModernSidebar({ 
  user, 
  isCollapsed, 
  onToggle, 
  onLogout, 
  notificationCount = 0 
}) {
  const location = useLocation();
  
  const menuItems = [
    { path: '/', icon: '🏠', label: 'Inicio', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { path: '/search', icon: '🔍', label: 'Buscar', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { path: '/search', icon: '✨', label: 'Explorar', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { path: '/messages', icon: '💬', label: 'Mensajes', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { path: '/notifications', icon: '♡', label: 'Notificaciones', badge: notificationCount, gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    { path: '/friends', icon: '👥', label: 'Amigos', gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' },
    { path: `/u/${user?.username}`, icon: '👤', label: 'Perfil', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div 
      className="modern-sidebar animate-slide-right"
      style={{
        width: isCollapsed ? '80px' : '260px',
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-color)',
        padding: isCollapsed ? '1.5rem 0.75rem' : '1.5rem 1rem',
        zIndex: 1000,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxShadow: '4px 0 20px var(--shadow-color)'
      }}
    >
      {/* Logo */}
      <div style={{
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        minHeight: '40px'
      }}>
        <Link 
          to="/" 
          style={{
            textDecoration: 'none',
            fontFamily: "'Lobster Two', cursive",
            fontSize: isCollapsed ? '32px' : '32px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 'bold',
            transition: 'all var(--transition-medium)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isCollapsed ? '100%' : 'auto'
          }}
        >
          {isCollapsed ? 'R' : 'Red-O'}
        </Link>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          right: '-14px',
          top: '80px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: '2px solid var(--border-color)',
          background: 'var(--bg-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          transition: 'all var(--transition-fast)',
          boxShadow: '0 2px 12px var(--shadow-color)',
          zIndex: 10,
          color: 'var(--text-primary)'
        }}
        className="hover-lift"
      >
        {isCollapsed ? '→' : '←'}
      </button>

      {/* Navigation */}
      <nav style={{ flex: 1, marginTop: '1rem' }}>
        {menuItems.map((item, index) => (
          <Link
            key={item.path + index}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '1rem',
              padding: isCollapsed ? '1rem 0.5rem' : '1rem 1rem',
              marginBottom: '0.75rem',
              textDecoration: 'none',
              color: 'var(--text-primary)',
              borderRadius: '14px',
              position: 'relative',
              overflow: 'visible',
              background: isActive(item.path) 
                ? 'var(--bg-secondary)' 
                : 'transparent',
              transition: 'all var(--transition-medium)',
              fontWeight: isActive(item.path) ? '600' : '400'
            }}
            className="hover-lift"
            onMouseEnter={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {/* Icon with gradient - Container relativo para badge */}
            <div style={{
              position: 'relative',
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: item.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              flexShrink: 0,
              boxShadow: isActive(item.path) 
                ? '0 4px 16px rgba(0,0,0,0.2)' 
                : '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all var(--transition-medium)'
            }}>
              {item.icon}
              
              {/* Badge visible en modo colapsado - posición absoluta */}
              {item.badge > 0 && isCollapsed && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  color: 'white',
                  padding: '3px 7px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  minWidth: '22px',
                  textAlign: 'center',
                  border: '2px solid var(--bg-primary)',
                  boxShadow: '0 2px 8px rgba(250, 112, 154, 0.4)',
                  zIndex: 1
                }} className="animate-pulse">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            
            {/* Label */}
            {!isCollapsed && (
              <span style={{
                fontSize: '15px',
                whiteSpace: 'nowrap',
                opacity: isCollapsed ? 0 : 1,
                transition: 'opacity var(--transition-medium)',
                flex: 1
              }}>
                {item.label}
              </span>
            )}

            {/* Badge expandido */}
            {item.badge > 0 && !isCollapsed && (
              <span style={{
                marginLeft: 'auto',
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                minWidth: '24px',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(250, 112, 154, 0.3)'
              }} className="animate-pulse">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}

            {/* Active indicator */}
            {isActive(item.path) && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: '4px',
                height: '70%',
                background: item.gradient,
                borderRadius: '0 4px 4px 0'
              }} />
            )}
          </Link>
        ))}
      </nav>

      {/* User Section */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '1.5rem',
        borderTop: '1px solid var(--border-color)'
      }}>
        {!isCollapsed && user && (
          <div 
            className="animate-fade-in"
            style={{
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '14px',
              marginBottom: '1rem',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{
              fontSize: '15px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '6px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              @{user?.username}
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: isCollapsed ? '1rem' : '1rem 1.25rem',
            background: 'linear-gradient(135deg, #A77693, #174871)',
            color: 'white',
            border: 'none',
            borderRadius: '14px',
            fontSize: isCollapsed ? '24px' : '15px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all var(--transition-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 16px rgba(167, 118, 147, 0.4)'
          }}
          className="hover-lift"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(167, 118, 147, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(167, 118, 147, 0.4)';
          }}
        >
          <span style={{ fontSize: isCollapsed ? '24px' : '18px' }}>🚪</span>
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );
}
