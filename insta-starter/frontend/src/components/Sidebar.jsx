import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ user, onLogout, notificationCount = 0 }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  // Iconos modernos usando Unicode más sofisticados
  const navigationItems = [
    { 
      path: '/', 
      icon: '⌂', 
      text: 'Inicio',
      active: location.pathname === '/'
    },
    { 
      path: '/search', 
      icon: '⌕', 
      text: 'Buscar',
      active: location.pathname === '/search'
    },
    { 
      path: '/explore', 
      icon: '◈', 
      text: 'Explorar',
      active: location.pathname === '/explore'
    },
    { 
      path: '/reels', 
      icon: '▶', 
      text: 'Reels',
      active: location.pathname === '/reels'
    },
    { 
      path: '/messages', 
      icon: '✉', 
      text: 'Mensajes',
      active: location.pathname === '/messages'
    },
    { 
      path: '/notifications', 
      icon: '♡', 
      text: 'Notificaciones',
      active: location.pathname === '/notifications',
      hasNotification: notificationCount > 0,
      notificationCount
    },
    { 
      path: '/create', 
      icon: '✚', 
      text: 'Crear',
      active: location.pathname === '/create'
    },
  ];

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (!user) {
    return null; // No mostrar sidebar si no hay usuario
  }

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {isCollapsed ? '❯' : '❮'}
      </button>

      <Link to="/" className="sidebar-logo">
        {isCollapsed ? 'R' : 'Red-O'}
      </Link>

      <nav>
        <ul className="sidebar-nav">
          {navigationItems.map((item) => (
            <li key={item.path} className="sidebar-nav-item">
              <Link 
                to={item.path} 
                className={`sidebar-nav-link ${item.active ? 'active' : ''}`}
              >
                <span className={`sidebar-nav-icon ${item.hasNotification ? 'sidebar-notification-badge' : ''}`}>
                  {item.icon}
                  {item.hasNotification && (
                    <span className="badge-dot">{item.notificationCount}</span>
                  )}
                </span>
                <span className="sidebar-nav-text">{item.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-info">
          <div className="sidebar-user-avatar">
            {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-details">
            <p className="sidebar-user-name">
              {user?.firstName || ''} {user?.lastName || ''}
            </p>
            <p className="sidebar-user-username">
              @{user?.username || 'usuario'}
            </p>
          </div>
          <button 
            className="sidebar-logout" 
            onClick={onLogout}
            title="Cerrar sesión"
          >
            ⌘
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;