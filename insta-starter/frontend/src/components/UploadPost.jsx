import React, { useState } from 'react';
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

export default function UploadPost() {
  const [busy, setBusy] = useState(false);
  const [fileLabel, setFileLabel] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('original');
  const [faceData, setFaceData] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const onChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileLabel(file.name);
      setSelectedFile(file);
      
      // Crear preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        setShowFilters(true);
      };
      reader.readAsDataURL(file);
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
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setFaceData([]);
    setSelectedFilter('original');
    setShowFilters(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);

    // Agregar filtro seleccionado
    if (selectedFilter !== 'original') {
      fd.append('filter', selectedFilter);
    }

    // Agregar datos de detección facial si están disponibles
    if (faceData.length > 0) {
      fd.append('face_data', JSON.stringify(faceData));
    }

    await postForm('/uploads/local', fd).catch(() => {});
    setBusy(false);
    
    if (e.currentTarget) {
      e.currentTarget.reset();
    }
    resetForm();
    window.location.reload();
  };

  const currentFilter = IMAGE_FILTERS.find(f => f.id === selectedFilter);

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '16px',
      padding: '2rem',
      marginBottom: '2rem',
      border: '1px solid var(--border-color)',
      boxShadow: '0 2px 12px var(--shadow-color)',
      transition: 'all var(--transition-medium)'
    }} className="animate-fade-in-scale">
      <h2 style={{
        margin: '0 0 1.5rem 0',
        fontSize: '24px',
        fontWeight: '700',
        background: 'var(--gradient-primary)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'var(--text-primary)'
      }}>
        Crear Publicación
      </h2>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* File Input */}
        <div>
          <input
            name="image"
            type="file"
            accept="image/*"
            required
            onChange={onChange}
            style={{ display: 'none' }}
            id="file-upload-modern"
          />
          <label
            htmlFor="file-upload-modern"
            style={{
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
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📷</div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                {fileLabel || 'Selecciona una foto'}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Haz clic para elegir una imagen
              </div>
            </div>
          </label>
        </div>

        {/* Preview con Filtros */}
        {previewUrl && showFilters && (
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
              color: 'var(--text-primary)'
            }}>
              Vista Previa - Filtro: {currentFilter?.name}
            </div>
            
            {/* Imagen con filtro aplicado */}
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '500px',
              margin: '0 auto 1.5rem',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)'
            }}>
              <img
                src={previewUrl}
                alt="Preview"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  filter: currentFilter?.filter || 'none',
                  transition: 'filter 0.3s ease'
                }}
              />
            </div>

            {/* Selector de Filtros */}
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
                  onClick={() => setSelectedFilter(filter.id)}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: selectedFilter === filter.id 
                      ? '2px solid var(--primary)' 
                      : '1px solid var(--border-color)',
                    background: selectedFilter === filter.id 
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
                    src={previewUrl}
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
                    fontWeight: selectedFilter === filter.id ? '600' : '400',
                    color: 'var(--text-primary)'
                  }}>
                    {filter.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Face Detection */}
            <FaceDetection imageFile={selectedFile} onFacesDetected={handleFacesDetected} />
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
  );
}
