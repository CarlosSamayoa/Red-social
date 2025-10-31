import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getJSON, STATIC, API } from '../api';
import './grid.css';
import Avatar from './Avatar.jsx';

export default function UserProfile({ currentUser, openChat }) {
  const { username } = useParams();
  const [info, setInfo] = useState(null);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');
      const [page, setPage] = useState(1);
      const [hasMore, setHasMore] = useState(true);
      const limit = 12;
  const [busy, setBusy] = useState(false);

  async function load(){
    const [u, p] = await Promise.all([
      getJSON(`/users/${username}`),
      getJSON(`/users/${username}/posts`)
    ]);
    setInfo(u.user);
    setPosts(p.posts || []);
  }

  useEffect(()=>{
    load().catch(()=> setError('No se pudo cargar el perfil'));
  }, [username]);

  const toggleFollow = async ()=>{
    if(!info) return;
    setBusy(true);
    try{
      const base = API;
      if(info.isFollowing){
        await fetch(`${base}/follows/${username}`, { method:'DELETE', headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` }});
        setInfo({...info, isFollowing:false, stats:{...info.stats, followers: Math.max(0, info.stats.followers-1)}});
      }else{
        await fetch(`${base}/follows/${username}`, { method:'POST', headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` }});
        setInfo({...info, isFollowing:true, stats:{...info.stats, followers: info.stats.followers+1}});
      }
    } finally { setBusy(false); }
  };

  if (error) return <p style={{color:'crimson'}}>{error}</p>;
  if (!info) return <p>Cargando…</p>;

  return (
    <div style={{
      fontFamily: 'system-ui',
      padding: '24px',
      maxWidth: 1000,
      margin: '0 auto',
      background: 'var(--bg-card)',
      borderRadius: '20px',
      boxShadow: '0 8px 32px var(--shadow-color)',
      backdropFilter: 'blur(20px)'
    }}>
      <header style={{
        display: 'flex',
        gap: 24,
        alignItems: 'center',
        marginBottom: 32,
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(167, 118, 147, 0.1), rgba(23, 72, 113, 0.1))',
        borderRadius: '15px',
        border: '1px solid rgba(222, 209, 198, 0.3)'
      }}>
        <Avatar 
          username={info.username} 
          name={info.name} 
          image={info.image}
          size={100} 
        />
        <div style={{flex: 1}}>
          <h2 style={{
            margin: '0 0 8px',
            fontSize: '24px',
            fontWeight: '700',
            color: 'var(--secondary)'
          }}>
            @{info.username}
          </h2>
          <div style={{
            display: 'flex',
            gap: 24,
            fontSize: 16,
            color: 'var(--text-primary)',
            marginBottom: 12
          }}>
            <span style={{
              padding: '4px 12px',
              background: 'rgba(167, 118, 147, 0.1)',
              borderRadius: '12px',
              fontWeight: '600'
            }}>
              <strong>{info.stats?.posts||0}</strong> publicaciones
            </span>
            <span style={{
              padding: '4px 12px',
              background: 'rgba(23, 72, 113, 0.1)',
              borderRadius: '12px',
              fontWeight: '600'
            }}>
              <strong>{info.stats?.followers||0}</strong> seguidores
            </span>
            <span style={{
              padding: '4px 12px',
              background: 'rgba(222, 209, 198, 0.3)',
              borderRadius: '12px',
              fontWeight: '600'
            }}>
              <strong>{info.stats?.following||0}</strong> seguidos
            </span>
          </div>
          {info.bio && (
            <p style={{
              margin: '0',
              fontSize: '15px',
              color: '#666',
              lineHeight: '1.4'
            }}>
              {info.bio}
            </p>
          )}
        </div>
        <div style={{display: 'flex', gap: '12px'}}>
          {/* Solo mostrar botón de seguir si no es el usuario actual */}
          {currentUser?.username !== info.username && (
            <button 
              onClick={toggleFollow} 
              disabled={busy}
              style={{
                background: info.isFollowing 
                  ? 'var(--bg-tertiary)' 
                  : 'linear-gradient(135deg, #A77693, #174871)',
                color: info.isFollowing ? 'var(--text-primary)' : 'white',
              border: info.isFollowing ? '2px solid var(--border-color)' : 'none',
              padding: '10px 20px',
              borderRadius: '25px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: busy ? 'not-allowed' : 'pointer',
              minWidth: '100px',
              opacity: busy ? 0.7 : 1,
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 10px var(--shadow-color)'
            }}
            onMouseEnter={(e) => {
              if (!busy) {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!busy) {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
              }
            }}
          >
            {busy ? '...' : (info.isFollowing ? '✓ Siguiendo' : '+ Seguir')}
          </button>
          )}
          
          <button 
            onClick={() => {
              console.log('Message button clicked, username:', username);
              openChat(username);
            }}
            style={{
              background: 'linear-gradient(135deg, #174871, #A77693)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '25px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            }}
          >
            💬 Message
          </button>
        </div>
      </header>

      <div className="grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
        marginTop: '24px'
      }}>
        {posts.map(p => {
          // Determinar si tiene múltiples medios
          const hasMultipleMedia = p.media && p.media.length > 0;
          const mediaCount = hasMultipleMedia ? p.media.length : (p.file ? 1 : 0);
          
          // Obtener thumbnail: priorizar primer media si existe, sino usar file legacy
          let thumb;
          let isVideo = false;
          
          if (hasMultipleMedia && p.media[0]) {
            // Nuevo formato con array media
            const firstMedia = p.media[0];
            isVideo = firstMedia.media_type === 'video';
            
            if (isVideo) {
              // Para videos, usar el original (no hay variants)
              thumb = firstMedia.s3_key_original;
            } else {
              // Para imágenes, buscar thumb variant
              thumb = firstMedia.variants?.find(v => v.kind === 'thumb')?.s3_key || firstMedia.s3_key_original;
            }
          } else {
            // Formato legacy con file único
            thumb = p.file?.variants?.find(v => v.kind === 'thumb')?.s3_key || p.file?.s3_key_original;
          }
          
          return (
            <Link 
              key={p._id} 
              to={`/p/${p._id}`} 
              className="card"
              style={{
                display: 'block',
                position: 'relative',
                aspectRatio: '1',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px var(--shadow-color)',
                transition: 'transform 0.3s ease, boxShadow 0.3s ease',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 30px var(--shadow-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 20px var(--shadow-color)';
              }}
            >
              <img 
                src={thumb ? (thumb.startsWith('http://') || thumb.startsWith('https://') ? thumb : `${STATIC}/${thumb}`) : ''} 
                alt={p.text||'post'} 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              
              {/* Indicador de múltiples medios */}
              {mediaCount > 1 && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backdropFilter: 'blur(4px)'
                }}>
                  📷 {mediaCount}
                </div>
              )}
              
              {/* Indicador de video */}
              {isVideo && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  backdropFilter: 'blur(4px)'
                }}>
                  ▶️
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
