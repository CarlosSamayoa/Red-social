import React, { useState, useEffect } from 'react';
import { getJSON, postJSON, postForm, STATIC } from '../api';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Estados para cambio de foto de perfil
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  
  // Estados para cambio de username
  const [usernameForm, setUsernameForm] = useState({
    newUsername: '',
    password: ''
  });
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');
  
  // Estados para cambio de contraseña
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Cargar datos del usuario
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Manejar selección de foto
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Subir nueva foto de perfil
  const handlePhotoUpload = async () => {
    if (!profilePhoto) return;

    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('profile_image', profilePhoto);

      console.log('📤 Enviando foto de perfil...');
      const response = await postForm('/users/profile-photo', formData);
      console.log('📥 Respuesta del servidor:', response);
      
      if (response.success) {
        // Actualizar usuario en localStorage con TODOS los campos
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { 
          ...currentUser, 
          image: response.imageUrl,
          profile_image: response.imageUrl  // También agregamos profile_image por si acaso
        };
        
        console.log('✅ Usuario actual:', currentUser);
        console.log('✅ Usuario actualizado:', updatedUser);
        console.log('✅ ImageUrl recibida:', response.imageUrl);
        
        // Primero guardar en localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('✅ Guardado en localStorage:', JSON.parse(localStorage.getItem('user')));
        
        // Luego actualizar el state
        setUser(updatedUser);
        
        // Limpiar preview
        setProfilePhoto(null);
        setPhotoPreview(null);
        
        // Mostrar mensaje de éxito
        alert('✅ Foto de perfil actualizada correctamente. La página se recargará para mostrar los cambios.');
        
        // Forzar recarga después de actualizar localStorage
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        console.error('❌ Error en respuesta:', response);
        alert(response.error || 'Error al subir la foto');
      }
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      alert('Error al subir la foto: ' + (error.message || 'Inténtalo de nuevo'));
    } finally {
      setPhotoUploading(false);
    }
  };

  // Manejar cambio de contraseña
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar errores al escribir
    if (passwordError) setPasswordError('');
    if (passwordSuccess) setPasswordSuccess('');
  };

  // Manejar cambio de username
  const handleUsernameChange = (e) => {
    const { name, value } = e.target;
    setUsernameForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (usernameError) setUsernameError('');
    if (usernameSuccess) setUsernameSuccess('');
  };

  // Enviar cambio de username
  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (usernameForm.newUsername.length < 3) {
      setUsernameError('El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }
    
    if (!usernameForm.password) {
      setUsernameError('Debes ingresar tu contraseña actual para confirmar');
      return;
    }

    setUsernameLoading(true);
    setUsernameError('');
    
    try {
      const response = await postJSON('/users/change-username', {
        newUsername: usernameForm.newUsername,
        password: usernameForm.password
      });

      if (response.success) {
        // Actualizar usuario en localStorage
        const updatedUser = { ...user, username: usernameForm.newUsername };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setUsernameSuccess('Nombre de usuario cambiado correctamente');
        setUsernameForm({
          newUsername: '',
          password: ''
        });
        
        // Recargar después de 2 segundos
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Error changing username:', error);
      setUsernameError(error.message || 'Error al cambiar el nombre de usuario. El nombre puede estar en uso o la contraseña es incorrecta.');
    } finally {
      setUsernameLoading(false);
    }
  };

  // Enviar cambio de contraseña
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    
    try {
      const response = await postJSON('/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (response.success) {
        setPasswordSuccess('Contraseña cambiada correctamente');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError('Error al cambiar la contraseña. Verifica tu contraseña actual.');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        fontSize: '18px',
        color: '#666'
      }}>
        Cargando configuraciones...
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      background: 'var(--bg-card)',
      borderRadius: '20px',
      boxShadow: '0 8px 32px var(--shadow-color)'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '2px solid rgba(167, 118, 147, 0.2)',
        paddingBottom: '20px',
        marginBottom: '30px'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #A77693, #174871)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          margin: '0 0 10px 0'
        }}>
          Configuración
        </h1>
        <p style={{
          color: '#666',
          fontSize: '1rem',
          margin: 0
        }}>
          Gestiona tu cuenta y preferencias
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(167, 118, 147, 0.2)',
        marginBottom: '30px'
      }}>
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'profile' ? 'linear-gradient(135deg, #A77693, #174871)' : 'transparent',
            color: activeTab === 'profile' ? 'white' : '#666',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'profile' ? 'bold' : 'normal',
            transition: 'all 0.3s ease'
          }}
        >
          👤 Perfil
        </button>
        <button
          onClick={() => setActiveTab('security')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'security' ? 'linear-gradient(135deg, #A77693, #174871)' : 'transparent',
            color: activeTab === 'security' ? 'white' : '#666',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'security' ? 'bold' : 'normal',
            transition: 'all 0.3s ease',
            marginLeft: '4px'
          }}
        >
          🔒 Seguridad
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div>
          <h2 style={{
            fontSize: '1.5rem',
            color: '#174871',
            marginBottom: '20px',
            fontWeight: '600'
          }}>
            Foto de Perfil
          </h2>

          {/* Current Profile Photo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '30px',
            padding: '20px',
            background: 'rgba(167, 118, 147, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(167, 118, 147, 0.2)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundImage: user?.image ? `url(${user.image.startsWith('http://') || user.image.startsWith('https://') ? user.image : `${STATIC}/${user.image}`})` : 'linear-gradient(135deg, #A77693, #174871)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '2rem',
              fontWeight: 'bold'
            }}>
              {!user?.image && (user?.username?.charAt(0)?.toUpperCase() || 'U')}
            </div>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#174871' }}>
                {user?.name || user?.username}
              </h3>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                @{user?.username}
              </p>
            </div>
          </div>

          {/* Photo Upload */}
          <div style={{
            border: '2px dashed rgba(167, 118, 147, 0.3)',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            {photoPreview ? (
              <div>
                <img
                  src={photoPreview}
                  alt="Preview"
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    marginBottom: '15px'
                  }}
                />
                <div style={{ marginTop: '15px' }}>
                  <button
                    onClick={handlePhotoUpload}
                    disabled={photoUploading}
                    style={{
                      background: 'linear-gradient(135deg, #A77693, #174871)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: photoUploading ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      fontWeight: '600',
                      marginRight: '10px'
                    }}
                  >
                    {photoUploading ? '⏳ Subiendo...' : '✅ Guardar Foto'}
                  </button>
                  <button
                    onClick={() => {
                      setPhotoPreview(null);
                      setProfilePhoto(null);
                    }}
                    style={{
                      background: 'transparent',
                      color: '#666',
                      border: '1px solid #ddd',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  fontSize: '3rem',
                  marginBottom: '15px',
                  color: '#A77693'
                }}>
                  📷
                </div>
                <p style={{
                  fontSize: '1.1rem',
                  color: '#666',
                  marginBottom: '15px'
                }}>
                  Selecciona una nueva foto de perfil
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  style={{
                    background: 'linear-gradient(135deg, #A77693, #174871)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'inline-block'
                  }}
                >
                  📁 Seleccionar Imagen
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div>
          {/* Sección: Cambiar Nombre de Usuario */}
          <h2 style={{
            fontSize: '1.5rem',
            color: '#174871',
            marginBottom: '20px',
            fontWeight: '600'
          }}>
            Cambiar Nombre de Usuario
          </h2>

          <form onSubmit={handleUsernameSubmit} style={{
            background: 'rgba(167, 118, 147, 0.05)',
            padding: '30px',
            borderRadius: '12px',
            border: '1px solid rgba(167, 118, 147, 0.2)',
            marginBottom: '40px'
          }}>
            {/* Current Username */}
            <div style={{ 
              marginBottom: '20px',
              padding: '15px',
              background: 'rgba(23, 72, 113, 0.1)',
              borderRadius: '8px'
            }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: '500',
                color: '#666',
                fontSize: '0.9rem'
              }}>
                Nombre de usuario actual
              </label>
              <div style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                color: '#174871'
              }}>
                @{user?.username}
              </div>
            </div>

            {/* New Username */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#174871'
              }}>
                Nuevo Nombre de Usuario
              </label>
              <input
                type="text"
                name="newUsername"
                value={usernameForm.newUsername}
                onChange={handleUsernameChange}
                placeholder="nuevo_usuario"
                required
                minLength={3}
                pattern="[a-zA-Z0-9_]+"
                title="Solo letras, números y guiones bajos"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid rgba(167, 118, 147, 0.2)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(167, 118, 147, 0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(167, 118, 147, 0.2)'}
              />
              <small style={{ 
                display: 'block', 
                marginTop: '5px', 
                color: '#666',
                fontSize: '0.85rem'
              }}>
                Mínimo 3 caracteres. Solo letras, números y guiones bajos.
              </small>
            </div>

            {/* Password Confirmation */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#174871'
              }}>
                Contraseña Actual (para confirmar)
              </label>
              <input
                type="password"
                name="password"
                value={usernameForm.password}
                onChange={handleUsernameChange}
                placeholder="Tu contraseña actual"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid rgba(167, 118, 147, 0.2)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(167, 118, 147, 0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(167, 118, 147, 0.2)'}
              />
            </div>

            {/* Error/Success Messages */}
            {usernameError && (
              <div style={{
                padding: '12px',
                marginBottom: '15px',
                background: 'rgba(231, 76, 60, 0.1)',
                border: '1px solid rgba(231, 76, 60, 0.3)',
                borderRadius: '8px',
                color: '#c0392b',
                fontSize: '0.95rem'
              }}>
                ⚠️ {usernameError}
              </div>
            )}

            {usernameSuccess && (
              <div style={{
                padding: '12px',
                marginBottom: '15px',
                background: 'rgba(39, 174, 96, 0.1)',
                border: '1px solid rgba(39, 174, 96, 0.3)',
                borderRadius: '8px',
                color: '#27ae60',
                fontSize: '0.95rem'
              }}>
                ✅ {usernameSuccess}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={usernameLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: usernameLoading ? '#ccc' : 'linear-gradient(135deg, #A77693, #174871)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: usernameLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {usernameLoading ? '⏳ Cambiando...' : '💾 Cambiar Nombre de Usuario'}
            </button>
          </form>

          {/* Sección: Cambiar Contraseña */}
          <h2 style={{
            fontSize: '1.5rem',
            color: '#174871',
            marginBottom: '20px',
            fontWeight: '600'
          }}>
            Cambiar Contraseña
          </h2>

          <form onSubmit={handlePasswordSubmit} style={{
            background: 'rgba(167, 118, 147, 0.05)',
            padding: '30px',
            borderRadius: '12px',
            border: '1px solid rgba(167, 118, 147, 0.2)'
          }}>
            {/* Current Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#174871'
              }}>
                Contraseña Actual
              </label>
              <input
                type="password"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid rgba(167, 118, 147, 0.2)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(167, 118, 147, 0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(167, 118, 147, 0.2)'}
              />
            </div>

            {/* New Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#174871'
              }}>
                Nueva Contraseña
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid rgba(167, 118, 147, 0.2)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(167, 118, 147, 0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(167, 118, 147, 0.2)'}
              />
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#174871'
              }}>
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid rgba(167, 118, 147, 0.2)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(167, 118, 147, 0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(167, 118, 147, 0.2)'}
              />
            </div>

            {/* Error/Success Messages */}
            {passwordError && (
              <div style={{
                background: 'var(--bg-error, rgba(220, 38, 38, 0.1))',
                color: 'var(--text-error, #ef4444)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid var(--border-error, rgba(220, 38, 38, 0.3))'
              }}>
                ❌ {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div style={{
                background: 'var(--bg-success, rgba(34, 197, 94, 0.1))',
                color: 'var(--text-success, #22c55e)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid var(--border-success, rgba(34, 197, 94, 0.3))'
              }}>
                ✅ {passwordSuccess}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={passwordLoading}
              style={{
                background: passwordLoading ? '#ccc' : 'linear-gradient(135deg, #A77693, #174871)',
                color: 'white',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '8px',
                cursor: passwordLoading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                width: '100%'
              }}
            >
              {passwordLoading ? '⏳ Cambiando...' : '🔒 Cambiar Contraseña'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
