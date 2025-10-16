import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getJSON, postJSON, STATIC, API } from '../api';
import MediaCarousel from './MediaCarousel.jsx';

// Mapa de filtros CSS
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

export default function PostView(){
  // usar clave uniforme 'user'
  const me = (()=>{ try { return JSON.parse(localStorage.getItem('user')||'{}'); } catch { return {}; } })();
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');
  const [likes, setLikes] = useState({ count: 0, liked: false });
  const [comments, setComments] = useState([]);
  const [busyLike, setBusyLike] = useState(false);
  const [busyComment, setBusyComment] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState('original');
  const [showAllVariants, setShowAllVariants] = useState(false);
  
  // Determinar si el post tiene múltiples medios o formato legacy
  const hasMultipleMedia = post && post.media && post.media.length > 0;
  const mediaCount = hasMultipleMedia ? post.media.length : (post && post.file ? 1 : 0);

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
        await fetch(`${API}/posts/${id}/like`, { method:'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
        setLikes(v => ({ count: Math.max(0, v.count-1), liked: false }));
      } else {
        await fetch(`${API}/posts/${id}/like`, { method:'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
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
      await fetch(`${API}/posts/${id}/comments/${commentId}`, {
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
        
        {/* Media principal (imágenes/videos) */}
        {mediaCount > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <MediaCarousel 
              media={post.media || []}
              legacyFile={post.file}
              legacyFilter={post.filter}
              style={{
                borderRadius: '16px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                maxHeight: '70vh'
              }}
              showControls={true}
            />
          </div>
        )}

        {/* Descripción del post */}
        {post.text && (
          <div style={{ 
            marginBottom: '2rem',
            fontSize: '1.1rem', 
            color: '#333',
            padding: '1rem',
            background: 'rgba(242,243,244,0.5)',
            borderRadius: '12px'
          }}>
            {post.text}
          </div>
        )}

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
