import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ModernHeader = ({ user, notificationCount = 0 }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (!user) {
    return null; // No mostrar header si no hay usuario
  }

  return (
    <header className="instagram-header">
      <div className="header-container">
        <div className="search-container">
          <form onSubmit={handleSearch}>
            <input 
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </form>
        </div>

        <div className="header-actions">
          <button className="header-create-btn">
            <span>✨</span>
            Crear
          </button>
          
          <button 
            className="header-notifications"
            onClick={() => navigate('/notifications')}
          >
            ♡
            {notificationCount > 0 && (
              <span className="badge-dot">{notificationCount}</span>
            )}
          </button>

          <a 
            href={`/u/${user?.username || 'demo'}`} 
            className="header-profile"
          >
            {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
          </a>
        </div>
      </div>
    </header>
  );
};

export default ModernHeader;