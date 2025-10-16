import React, { useState } from 'react';
import { STATIC } from '../api';

// Filtros CSS disponibles
const IMAGE_FILTERS = {
  original: 'none',
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(100%)',
  vintage: 'sepia(50%) contrast(120%) brightness(90%)',
  cool: 'saturate(120%) hue-rotate(20deg)',
  warm: 'saturate(130%) hue-rotate(-20deg) brightness(110%)',
  contrast: 'contrast(150%) brightness(105%)',
  bright: 'brightness(130%) saturate(110%)',
  soft: 'blur(1px) brightness(110%)',
  dramatic: 'contrast(160%) saturate(80%)'
};

export default function MediaCarousel({ media = [], legacyFile = null, legacyFilter = 'original', style = {}, showControls = true }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Debug: Ver qué recibe MediaCarousel
  console.log('🎬 MediaCarousel received:', {
    mediaLength: media?.length || 0,
    hasLegacyFile: !!legacyFile,
    legacyFileKey: legacyFile?.s3_key_original
  });

  // Soporte para publicaciones antiguas (legacy) con campo file
  const mediaItems = media.length > 0 ? media : (
    legacyFile && legacyFile.s3_key_original ? [{
      s3_key_original: legacyFile.s3_key_original,
      mime: legacyFile.mime,
      variants: legacyFile.variants || [],
      filter: legacyFilter,
      media_type: 'image'
    }] : []
  );

  if (mediaItems.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        color: 'var(--text-secondary)',
        ...style
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📷</div>
          <div>No hay medios disponibles</div>
        </div>
      </div>
    );
  }

  const currentMedia = mediaItems[currentIndex];
  const isVideo = currentMedia.media_type === 'video' || currentMedia.mime?.startsWith('video/');
  const mediaKey = currentMedia.variants?.find(v => v.kind === 'medium')?.s3_key || 
                   currentMedia.variants?.find(v => v.kind === 'large')?.s3_key || 
                   currentMedia.s3_key_original;
  const mediaUrl = mediaKey ? `${STATIC}/${mediaKey}` : '';
  const filter = IMAGE_FILTERS[currentMedia.filter] || IMAGE_FILTERS.original;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaItems.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < mediaItems.length - 1 ? prev + 1 : 0));
  };

  const goToIndex = (index) => {
    setCurrentIndex(index);
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      background: 'var(--bg-secondary)',
      borderRadius: '12px',
      overflow: 'hidden',
      ...style
    }}>
      {/* Media principal */}
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000'
      }}>
        {isVideo ? (
          <video
            key={currentIndex}
            src={mediaUrl}
            controls
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '600px',
              objectFit: 'contain'
            }}
          />
        ) : (
          <img
            src={mediaUrl}
            alt={`Media ${currentIndex + 1}`}
            onError={(e) => {
              console.error('❌ Error loading image:', mediaUrl);
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '600px',
              objectFit: 'contain',
              filter: filter,
              transition: 'filter 0.3s ease'
            }}
          />
        )}
        
        {/* Mensaje de error si la imagen no carga */}
        {!isVideo && (
          <div style={{
            display: 'none',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            color: 'white',
            padding: '2rem'
          }}>
            <div style={{ fontSize: '48px' }}>🖼️</div>
            <div>Error al cargar la imagen</div>
            <div style={{ fontSize: '12px', opacity: 0.7, wordBreak: 'break-all' }}>
              {mediaUrl}
            </div>
          </div>
        )}

        {/* Indicador de tipo de media */}
        {isVideo && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            🎥 Video
          </div>
        )}

        {/* Botones de navegación */}
        {showControls && mediaItems.length > 1 && (
          <>
            <button
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
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '24px',
                transition: 'all 0.2s',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0, 0, 0, 0.8)';
                e.target.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(0, 0, 0, 0.6)';
                e.target.style.transform = 'translateY(-50%) scale(1)';
              }}
              aria-label="Anterior"
            >
              ←
            </button>
            <button
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
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '24px',
                transition: 'all 0.2s',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0, 0, 0, 0.8)';
                e.target.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(0, 0, 0, 0.6)';
                e.target.style.transform = 'translateY(-50%) scale(1)';
              }}
              aria-label="Siguiente"
            >
              →
            </button>
          </>
        )}
      </div>

      {/* Indicadores de posición (dots) */}
      {showControls && mediaItems.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(0, 0, 0, 0.5)',
          borderRadius: '20px',
          zIndex: 10
        }}>
          {mediaItems.map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              style={{
                width: currentIndex === index ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                border: 'none',
                background: currentIndex === index ? 'white' : 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0
              }}
              aria-label={`Ir a media ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Contador de medios */}
      {showControls && mediaItems.length > 1 && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          zIndex: 10
        }}>
          {currentIndex + 1} / {mediaItems.length}
        </div>
      )}
    </div>
  );
}
