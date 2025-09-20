import React, { useState, useEffect } from 'react';
import { getJSON, postJSON, postForm } from '../api';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Estados para cambio de foto de perfil
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  
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

      const response = await postForm('/users/profile-photo', formData);
      
      if (response.success) {
        // Actualizar usuario en localStorage
        const updatedUser = { ...user, image: response.imageUrl };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Limpiar preview
        setProfilePhoto(null);
        setPhotoPreview(null);
        
        alert('Foto de perfil actualizada correctamente');
        window.location.reload(); // Recargar para ver cambios
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error al subir la foto. Inténtalo de nuevo.');
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
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(23, 72, 113, 0.1)'
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
              background: user?.image ? `url(${user.image})` : 'linear-gradient(135deg, #A77693, #174871)',
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
                background: '#ffebee',
                color: '#c62828',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #ffcdd2'
              }}>
                ❌ {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div style={{
                background: '#e8f5e8',
                color: '#2e7d32',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #c8e6c9'
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
