import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getJSON, postJSON, STATIC } from '../api';

export default function PostView(){
  const me = (()=>{ try { return JSON.parse(localStorage.getItem('me')||'{}'); } catch { return {}; } })();
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');
  const [likes, setLikes] = useState({ count: 0, liked: false });
  const [comments, setComments] = useState([]);
  const [busyLike, setBusyLike] = useState(false);
  const [busyComment, setBusyComment] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState('original');
  const [showAllVariants, setShowAllVariants] = useState(false);

  async function refresh(){
    const [p, l, c] = await Promise.all([
      getJSON(`/posts/${id}`),
      getJSON(`/posts/${id}/likes`),
      getJSON(`/posts/${id}/comments`)
    ]);
    setPost(p.post);
    setLikes(l);
    setComments(c.comments || []);
  }

  useEffect(()=>{ refresh().catch(()=> setError('No se pudo cargar el post')); }, [id]);

  const toggleLike = async ()=>{
    if (busyLike) return;
    setBusyLike(true);
    try{
      if(likes.liked){
        await fetch(`${import.meta.env.VITE_API || 'http://localhost:8080/api'}/posts/${id}/like`, { method:'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
        setLikes(v => ({ count: Math.max(0, v.count-1), liked: false }));
      } else {
        await fetch(`${import.meta.env.VITE_API || 'http://localhost:8080/api'}/posts/${id}/like`, { method:'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
        setLikes(v => ({ count: v.count+1, liked: true }));
      }
    } finally { setBusyLike(false); }
  };

  const submitComment = async (e)=>{
    e.preventDefault();
    if (busyComment) return;
    const form = e.currentTarget; // Guardar referencia al formulario
    const fd = new FormData(form);
    const body = fd.get('body');
    if(!body) return;
    setBusyComment(true);
    try{
      const j = await postJSON(`/posts/${id}/comments`, { body });
      setComments([j.comment, ...comments]);
      if (form) { // Verificar que el formulario existe antes de hacer reset
        form.reset();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally { 
      setBusyComment(false); 
    }
  };

  const del = async (commentId) => {
    try {
      await fetch(`${import.meta.env.VITE_API || 'http://localhost:8080/api'}/posts/${id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setComments(comments.filter(c => c._id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  if (error) return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: '#e74c3c', fontSize: '1.2rem' }}>❌ {error}</p>
      <Link to="/" style={{ color: '#3498db', textDecoration: 'none' }}>← Volver al inicio</Link>
    </div>
  );
  
  if (!post) return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '1.2rem', color: '#666' }}>🔄 Cargando publicación...</div>
    </div>
  );

  // Preparar todas las variantes disponibles
  const original = post.file?.s3_key_original;
  const variants = post.file?.variants || [];
  
  const allImages = [
    { 
      kind: 'original', 
      src: original, 
      name: 'Original', 
      description: 'Imagen original sin modificaciones',
      icon: '📸'
    },
    ...variants.map(v => ({
      kind: v.kind,
      src: v.s3_key,
      name: getVariantName(v.kind),
      description: v.description || getVariantDescription(v.kind),
      icon: getVariantIcon(v.kind),
      width: v.width,
      height: v.height
    }))
  ].filter(img => img.src);

  const currentImage = allImages.find(img => img.kind === selectedVariant) || allImages[0];

  return (
    <div style={{ 
      maxWidth: 1000, 
      margin: '0 auto', 
      fontFamily: 'system-ui', 
      padding: '1rem',
      background: 'linear-gradient(135deg, #F2F3F4 0%, #DED1C6 50%, #A77693 100%)',
      minHeight: '100vh'
    }}>
      {/* Navegación */}
      <div style={{ marginBottom: '2rem' }}>
        <Link 
          to="/" 
          style={{ 
            color: '#174871', 
            textDecoration: 'none', 
            fontSize: '1.1rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          ← Volver al feed
        </Link>
      </div>

      <div style={{ 
        background: 'rgba(255,255,255,0.95)', 
        borderRadius: '20px', 
        padding: '2rem',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(167,118,147,0.2)'
      }}>
        
        {/* Imagen principal */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ 
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
          }}>
            <img 
              src={`${STATIC}/${currentImage.src}`} 
              alt={post.text || 'Publicación'} 
              style={{ 
                width: '100%', 
                height: 'auto',
                display: 'block',
                maxHeight: '70vh',
                objectFit: 'contain',
                background: '#f8f9fa'
              }}
            />
            
            {/* Indicador de variante actual */}
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {currentImage.icon} {currentImage.name}
            </div>
          </div>

          {/* Descripción de la imagen */}
          {post.text && (
            <div style={{ 
              marginTop: '1rem', 
              fontSize: '1.1rem', 
              color: '#333',
              padding: '1rem',
              background: 'rgba(242,243,244,0.5)',
              borderRadius: '12px'
            }}>
              {post.text}
            </div>
          )}
        </div>

        {/* Selector de variantes */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ 
            margin: '0 0 1rem 0', 
            color: '#174871',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🎨 Transformaciones disponibles ({allImages.length})
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            {allImages.map(img => (
              <button
                key={img.kind}
                onClick={() => setSelectedVariant(img.kind)}
                style={{
                  background: selectedVariant === img.kind ? 
                    'linear-gradient(135deg, #A77693, #174871)' : 
                    'rgba(242,243,244,0.8)',
                  color: selectedVariant === img.kind ? 'white' : '#174871',
                  border: 'none',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{img.icon}</span>
                <span>{img.name}</span>
              </button>
            ))}
          </div>

          {/* Información de la variante actual */}
          <div style={{
            padding: '1rem',
            background: 'rgba(23,72,113,0.1)',
            borderRadius: '12px',
            fontSize: '0.9rem',
            color: '#174871'
          }}>
            <strong>{currentImage.name}:</strong> {currentImage.description}
            {currentImage.width && currentImage.height && (
              <span style={{ marginLeft: '1rem', opacity: 0.8 }}>
                📐 {currentImage.width}×{currentImage.height}px
              </span>
            )}
          </div>
        </div>

        {/* Galería de miniaturas */}
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => setShowAllVariants(!showAllVariants)}
            style={{
              background: 'rgba(167,118,147,0.1)',
              border: '1px solid rgba(167,118,147,0.3)',
              color: '#A77693',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              marginBottom: '1rem'
            }}
          >
            {showAllVariants ? '🔼 Ocultar galería' : '🔽 Ver todas las transformaciones'}
          </button>

          {showAllVariants && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              padding: '1rem',
              background: 'rgba(242,243,244,0.3)',
              borderRadius: '16px'
            }}>
              {allImages.map(img => (
                <div
                  key={img.kind}
                  onClick={() => setSelectedVariant(img.kind)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: selectedVariant === img.kind ? 
                      '0 4px 16px rgba(167,118,147,0.4)' : 
                      '0 2px 8px rgba(0,0,0,0.1)',
                    transform: selectedVariant === img.kind ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.3s ease',
                    background: 'white'
                  }}
                >
                  <img
                    src={`${STATIC}/${img.src}`}
                    alt={img.name}
                    style={{
                      width: '100%',
                      height: '150px',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                  <div style={{
                    padding: '0.75rem',
                    textAlign: 'center',
                    background: selectedVariant === img.kind ? 
                      'linear-gradient(135deg, #A77693, #174871)' : 
                      'white',
                    color: selectedVariant === img.kind ? 'white' : '#174871'
                  }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                      {img.icon} {img.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interacciones sociales */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          marginBottom: '2rem',
          padding: '1rem',
          background: 'rgba(222,209,198,0.3)',
          borderRadius: '12px'
        }}>
          <button 
            onClick={toggleLike} 
            disabled={busyLike}
            style={{
              background: likes.liked ? 
                'linear-gradient(135deg, #e74c3c, #c0392b)' : 
                'rgba(255,255,255,0.8)',
              color: likes.liked ? 'white' : '#174871',
              border: '1px solid rgba(167,118,147,0.3)',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: busyLike ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
          >
            {likes.liked ? '❤️ Me gusta' : '🤍 Dar like'}
          </button>
          <span style={{ color: '#174871', fontWeight: '600' }}>
            {likes.count} {likes.count === 1 ? 'me gusta' : 'me gusta'}
          </span>

          {/* Información del autor */}
          {post.user?.username && (
            <div style={{ marginLeft: 'auto' }}>
              <Link 
                to={`/u/${post.user.username}`}
                style={{
                  color: '#A77693',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}
              >
                👤 @{post.user.username}
              </Link>
            </div>
          )}
        </div>

        {/* Sección de comentarios */}
        <div>
          <h3 style={{ 
            margin: '0 0 1rem 0', 
            color: '#174871',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            💬 Comentarios ({comments.length})
          </h3>
          
          <form onSubmit={submitComment} style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            marginBottom: '1.5rem' 
          }}>
            <input 
              name="body" 
              placeholder="Escribe un comentario…" 
              style={{ 
                flex: 1,
                padding: '0.75rem',
                border: '1px solid rgba(167,118,147,0.3)',
                borderRadius: '12px',
                fontSize: '0.9rem',
                background: 'rgba(255,255,255,0.8)'
              }}
            />
            <button 
              disabled={busyComment}
              style={{
                background: 'linear-gradient(135deg, #A77693, #174871)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                cursor: busyComment ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            >
              {busyComment ? '📤 Enviando…' : '📤 Comentar'}
            </button>
          </form>
          
          {!comments.length ? (
            <p style={{ 
              color: '#666', 
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '2rem',
              background: 'rgba(242,243,244,0.5)',
              borderRadius: '12px'
            }}>
              💭 Aún no hay comentarios. ¡Sé el primero en comentar!
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {comments.map(c => (
                <div 
                  key={c._id} 
                  style={{ 
                    padding: '1rem', 
                    background: 'rgba(255,255,255,0.8)', 
                    borderRadius: '12px',
                    border: '1px solid rgba(222,209,198,0.5)'
                  }}
                >
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#666', 
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>📅 {new Date(c.created_at).toLocaleString()}</span>
                    {String(c.user) === String(me.id) && (
                      <button 
                        onClick={() => del(c._id)} 
                        style={{ 
                          fontSize: '0.8rem',
                          color: '#e74c3c',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px'
                        }}
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                  <div style={{ color: '#333', lineHeight: '1.4' }}>
                    {c.body}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Funciones auxiliares para las variantes
function getVariantName(kind) {
  const names = {
    thumb: 'Miniatura',
    medium: 'Medio',
    large: 'Grande',
    small: 'Pequeño',
    bw: 'Blanco y Negro',
    sepia: 'Sepia',
    vintage: 'Vintage',
    enhanced: 'Mejorado',
    contrast: 'Alto Contraste',
    soft: 'Suave',
    cool: 'Tonos Fríos',
    warm: 'Tonos Cálidos',
    square: 'Cuadrado'
  };
  return names[kind] || kind.charAt(0).toUpperCase() + kind.slice(1);
}

function getVariantDescription(kind) {
  const descriptions = {
    thumb: 'Miniatura optimizada para vista previa',
    medium: 'Tamaño medio para visualización general',
    large: 'Alta resolución para vista detallada',
    small: 'Tamaño reducido para carga rápida',
    bw: 'Conversión a escala de grises artística',
    sepia: 'Efecto vintage en tonos sepia',
    vintage: 'Estilo retro con tonos cálidos',
    enhanced: 'Mejora automática de brillo y saturación',
    contrast: 'Incremento de contraste para mayor impacto',
    soft: 'Efecto suave y difuminado',
    cool: 'Tonalidad fría con matices azulados',
    warm: 'Tonalidad cálida con matices dorados',
    square: 'Formato cuadrado para redes sociales'
  };
  return descriptions[kind] || 'Transformación personalizada';
}

function getVariantIcon(kind) {
  const icons = {
    thumb: '🔍',
    medium: '📱',
    large: '🖥️',
    small: '📦',
    bw: '⚫',
    sepia: '🟤',
    vintage: '📸',
    enhanced: '✨',
    contrast: '🔆',
    soft: '🌸',
    cool: '❄️',
    warm: '🔥',
    square: '⬜'
  };
  return icons[kind] || '🖼️';
}
