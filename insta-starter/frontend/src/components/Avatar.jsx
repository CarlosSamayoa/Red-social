import React from 'react';

// Componente Avatar reutilizable que genera avatares con iniciales
function Avatar({ username, name, size = 40, className = '' }) {
  // Convertir size a número si es string
  const avatarSize = typeof size === 'string' ? parseInt(size) || 40 : size || 40;
  
  // Generar iniciales del nombre de usuario o nombre
  const getInitials = () => {
    if (name) {
      return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
    }
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Generar color de fondo basado en el username para consistencia
  const getBackgroundColor = () => {
    const colors = [
      '#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888',
      '#0095f6', '#1877f2', '#42a5f5', '#26c6da', '#66bb6a',
      '#ab47bc', '#7e57c2', '#5c6bc0', '#ef5350', '#ff7043'
    ];
    
    let hash = 0;
    const str = username || name || 'default';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div 
      className={`profile-pic ${className}`}
      style={{
        width: avatarSize,
        height: avatarSize,
        borderRadius: '50%',
        background: getBackgroundColor(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: '600',
        fontSize: Math.max(10, avatarSize * 0.4),
        flexShrink: 0
      }}
    >
      {getInitials()}
    </div>
  );
}

export default Avatar;
