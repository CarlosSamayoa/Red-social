import React, { useState, useEffect } from 'react';
import { postForm } from '../api';
import FaceDetection from './FaceDetection.jsx';

// Filtros de imagen disponibles
const IMAGE_FILTERS = [
  { id: 'original', name: 'Original', filter: 'none' },
  { id: 'grayscale', name: 'B&W', filter: 'grayscale(100%)' },
  { id: 'sepia', name: 'Sepia', filter: 'sepia(100%)' },
  { id: 'vintage', name: 'Vintage', filter: 'sepia(50%) contrast(120%) brightness(90%)' },
  { id: 'cool', name: 'Cool', filter: 'saturate(120%) hue-rotate(20deg)' },
  { id: 'warm', name: 'Warm', filter: 'saturate(130%) hue-rotate(-20deg) brightness(110%)' },
  { id: 'contrast', name: 'Contrast', filter: 'contrast(150%) brightness(105%)' },
  { id: 'bright', name: 'Bright', filter: 'brightness(130%) saturate(110%)' },
  { id: 'soft', name: 'Soft', filter: 'blur(1px) brightness(110%)' },
  { id: 'dramatic', name: 'Dramatic', filter: 'contrast(160%) saturate(80%)' }
];

export default function UploadPostModal({ isOpen, onClose }) {
  const [busy, setBusy] = useState(false);
  const [fileLabel, setFileLabel] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); // Array de archivos
  const [previewUrls, setPreviewUrls] = useState([]); // Array de previews
  const [selectedFilters, setSelectedFilters] = useState([]); // Array de filtros, uno por archivo
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0); // Índice del media actual en el carousel
  const [faceData, setFaceData] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  // Efecto para actualizar el video cuando cambia el stream
  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Efecto para limpiar el stream al cerrar el modal
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Efecto para limpiar al cerrar el modal
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const onChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Validar número de archivos
      if (files.length > 10) {
        alert('⚠️ Máximo 10 archivos por publicación');
        e.target.value = '';
        return;
      }
      
      // Validar tamaño de archivos (50MB máximo)
      const maxSize = 50 * 1024 * 1024; // 50MB en bytes
      const oversizedFiles = files.filter(f => f.size > maxSize);
      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`).join(', ');
        alert(`⚠️ Los siguientes archivos exceden el límite de 50MB:\n${fileNames}`);
        e.target.value = '';
        return;
      }
      
      const fileNames = files.map(f => f.name).join(', ');
      setFileLabel(fileNames);
      setSelectedFiles(files);
      
      // Crear preview URLs para todos los archivos
      const previews = [];
      const filters = [];
      let loadedCount = 0;
      
      files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          previews[index] = {
            url: reader.result,
            type: file.type.startsWith('video/') ? 'video' : 'image',
            name: file.name
          };
          filters[index] = 'original';
          loadedCount++;
          
          if (loadedCount === files.length) {
            setPreviewUrls(previews);
            setSelectedFilters(filters);
            setShowFilters(true);
            setCurrentMediaIndex(0);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      resetForm();
    }
  };

  const handleFacesDetected = (faces) => {
    setFaceData(faces);
    console.log('Faces detected:', faces);
  };

  const resetForm = () => {
    setFileLabel('');
    setSelectedFiles([]);
    setPreviewUrls([]);
    setCaption('');
    setFaceData([]);
    setSelectedFilters([]);
    setShowFilters(false);
    setCurrentMediaIndex(0);
    stopCamera();
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: false
      });
      setStream(mediaStream);
      setShowCamera(true);
      // El useEffect se encargará de asignar el srcObject
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      let errorMessage = 'No se pudo acceder a la cámara.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Permiso denegado. Por favor permite el acceso a la cámara en la configuración de tu navegador.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No se encontró ninguna cámara en tu dispositivo.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación.';
      }
      
      alert(errorMessage);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedFiles([file]);
          setPreviewUrls([{
            url: reader.result,
            type: 'image',
            name: file.name
          }]);
          setSelectedFilters(['original']);
          setShowFilters(true);
          setCurrentMediaIndex(0);
          setFileLabel(file.name);
          stopCamera();
        };
        reader.readAsDataURL(file);
      }, 'image/jpeg', 0.95);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData();

    // Agregar caption
    fd.append('caption', caption);

    // Agregar todos los archivos
    selectedFiles.forEach((file, index) => {
      fd.append('files', file);
    });

    // Agregar filtros para cada archivo
    fd.append('filters', JSON.stringify(selectedFilters));

    // Agregar datos de detección facial si están disponibles
    if (faceData.length > 0) {
      fd.append('face_data', JSON.stringify(faceData));
    }

    try {
      const response = await postForm('/uploads/local-multiple', fd);
      console.log('✅ Upload successful:', response);
      
      setBusy(false);
      resetForm();
      onClose();
      
      // Recargar para mostrar la nueva publicación
      window.location.reload();
    } catch (error) {
      console.error('❌ Upload failed:', error);
      setBusy(false);
      alert('Error al subir la publicación: ' + (error.message || 'Error desconocido'));
    }
  };

  const currentPreview = previewUrls[currentMediaIndex];
  const currentFilter = IMAGE_FILTERS.find(f => f.id === selectedFilters[currentMediaIndex]) || IMAGE_FILTERS[0];

  const handleFilterChange = (filterId) => {
    const newFilters = [...selectedFilters];
    newFilters[currentMediaIndex] = filterId;
    setSelectedFilters(newFilters);
  };

  const goToPrevious = () => {
    setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : previewUrls.length - 1));
  };

  const goToNext = () => {
    setCurrentMediaIndex((prev) => (prev < previewUrls.length - 1 ? prev + 1 : 0));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 9998,
          animation: 'fadeIn 0.3s ease'
        }}
      />
      
      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--bg-card)',
        borderRadius: '20px',
        padding: '2rem',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        zIndex: 9999,
        border: '1px solid var(--border-color)',
        boxShadow: '0 20px 60px var(--shadow-color)',
        animation: 'modalSlideIn 0.3s ease'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'var(--text-primary)'
          }}>
            Crear Publicación
          </h2>
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'var(--bg-hover)';
              e.target.style.transform = 'rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'none';
              e.target.style.transform = 'rotate(0deg)';
            }}
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* File Input y Cámara */}
          <div>
            <input
              name="files"
              type="file"
              accept="image/*,video/*"
              multiple
              required={!showCamera && selectedFiles.length === 0}
              onChange={onChange}
              style={{ display: 'none' }}
              id="file-upload-modal"
            />
            
            {!showCamera && selectedFiles.length === 0 && (
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <label
                  htmlFor="file-upload-modal"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3rem',
                    border: '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: 'var(--bg-secondary)',
                    transition: 'all var(--transition-medium)',
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '1rem' }}>�</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      Selecciona archivos
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      Fotos o videos desde tu dispositivo
                    </div>
                  </div>
                </label>
                
                <button
                  type="button"
                  onClick={startCamera}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3rem',
                    border: '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: 'var(--bg-secondary)',
                    transition: 'all var(--transition-medium)',
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📸</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      Usar cámara
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      Toma una foto ahora
                    </div>
                  </div>
                </button>
              </div>
            )}
            
            {showCamera && (
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    background: '#000'
                  }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      background: 'var(--gradient-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    📷 Capturar Foto
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    style={{
                      padding: '1rem 2rem',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      fontSize: '16px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            
            {selectedFiles.length > 0 && !showCamera && (
              <div style={{
                padding: '1rem',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                marginBottom: '1rem'
              }}>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  ✅ {selectedFiles.length} archivo(s) seleccionado(s)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {fileLabel}
                </div>
              </div>
            )}
          </div>

          {/* Preview con Filtros y Carousel */}
          {previewUrls.length > 0 && showFilters && (
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{
                marginBottom: '1rem',
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Vista Previa {previewUrls.length > 1 ? `(${currentMediaIndex + 1}/${previewUrls.length})` : ''} - {currentPreview?.type === 'video' ? 'Video' : `Filtro: ${currentFilter?.name}`}</span>
              </div>
              
              {/* Media con filtro aplicado y controles de navegación */}
              <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '500px',
                margin: '0 auto 1.5rem',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--border-color)'
              }}>
                {currentPreview?.type === 'video' ? (
                  <video
                    src={currentPreview.url}
                    controls
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block'
                    }}
                  />
                ) : (
                  <img
                    src={currentPreview?.url}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      filter: currentFilter?.filter || 'none',
                      transition: 'filter 0.3s ease'
                    }}
                  />
                )}
                
                {/* Botones de navegación si hay múltiples medios */}
                {previewUrls.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goToPrevious}
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '20px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.8)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.6)'}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={goToNext}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '20px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.8)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.6)'}
                    >
                      →
                    </button>
                  </>
                )}
              </div>

              {/* Selector de Filtros - Solo para imágenes */}
              {currentPreview?.type === 'image' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}>
                  {IMAGE_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => handleFilterChange(filter.id)}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: selectedFilters[currentMediaIndex] === filter.id 
                          ? '2px solid var(--primary)' 
                          : '1px solid var(--border-color)',
                        background: selectedFilters[currentMediaIndex] === filter.id 
                          ? 'var(--bg-hover)' 
                          : 'var(--bg-tertiary)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                      className="hover-lift"
                    >
                      <img
                        src={currentPreview.url}
                        alt={filter.name}
                        style={{
                          width: '60px',
                          height: '60px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          filter: filter.filter
                        }}
                      />
                      <span style={{
                        fontSize: '11px',
                        fontWeight: selectedFilters[currentMediaIndex] === filter.id ? '600' : '400',
                      color: 'var(--text-primary)'
                    }}>
                      {filter.name}
                    </span>
                  </button>
                ))}
                </div>
              )}

              {/* Face Detection - Solo para la imagen actual si es imagen */}
              {currentPreview?.type === 'image' && selectedFiles[currentMediaIndex] && (
                <FaceDetection imageFile={selectedFiles[currentMediaIndex]} onFacesDetected={handleFacesDetected} />
              )}
            </div>
          )}

          {/* Caption */}
          <textarea
            name="text"
            placeholder="Escribe una descripción..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            style={{
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid var(--input-border)',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontFamily: 'inherit',
              resize: 'vertical',
              transition: 'all var(--transition-fast)'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--primary)';
              e.target.style.boxShadow = '0 0 0 3px rgba(167, 118, 147, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--input-border)';
              e.target.style.boxShadow = 'none';
            }}
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy || !fileLabel}
            style={{
              padding: '1rem 2rem',
              borderRadius: '12px',
              border: 'none',
              background: busy || !fileLabel 
                ? 'var(--bg-tertiary)' 
                : 'var(--gradient-primary)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: busy || !fileLabel ? 'not-allowed' : 'pointer',
              opacity: busy || !fileLabel ? 0.5 : 1,
              transition: 'all var(--transition-medium)',
              boxShadow: '0 4px 12px rgba(167, 118, 147, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            className={busy || !fileLabel ? '' : 'hover-lift'}
          >
            {busy ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px' }} />
                <span>Compartiendo...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Compartir</span>
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  );
}
