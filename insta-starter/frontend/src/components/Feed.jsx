import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJSON, postJSON, STATIC } from '../api';
import Avatar from './Avatar.jsx';

function PostCard({ post, likes, onToggleLike, onAddComment }) {
  const [comment, setComment] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [friends, setFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  
  const likeData = likes[post._id] || { count: 0, liked: false }
  const imageUrl = post.file?.variants?.find(v=>v.kind==='medium')?.s3_key || post.file?.s3_key_original
  
  // Cerrar menú de compartir cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showShareMenu && !e.target.closest('.share-menu-container')) {
        setShowShareMenu(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showShareMenu]);
  
  const handleComment = (e) => {
    e.preventDefault()
    if (comment.trim()) {
      onAddComment(post._id, comment.trim())
      setComment('')
      // Reload comments after adding one
      if (showComments) {
        loadComments()
      }
    }
  }

  const loadComments = async () => {
    if (loadingComments) return
    setLoadingComments(true)
    try {
      const response = await getJSON(`/posts/${post._id}/comments`)
      setComments(response.comments || [])
    } catch (err) {
      console.error('Failed to load comments:', err)
    } finally {
      setLoadingComments(false)
    }
  }

  const toggleComments = () => {
    setShowComments(!showComments)
    if (!showComments && comments.length === 0) {
      loadComments()
    }
  }

  const handleShare = async () => {
    setShowShareMenu(!showShareMenu);
    
    // Cargar amigos solo cuando se abre el menú
    if (!showShareMenu && friends.length === 0) {
      await loadFriends();
    }
  };

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const response = await getJSON('/friends');
      setFriends(response.friends || []);
    } catch (error) {
      console.error('Error loading friends:', error);
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  const shareToFriend = async (friend) => {
    try {
      // Enviar el post como mensaje directo
      const shareMessage = {
        recipient: friend.username,
        body: `🔗 Te compartí una publicación`,
        shared_post: post._id  // Solo enviar el ID de la publicación
      };

      const response = await postJSON('/dm/send', shareMessage);
      
      if (response.success) {
        alert(`📩 Post enviado a @${friend.username}!`);
        setShowShareMenu(false);
      } else {
        throw new Error('Error en el envío');
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      
      // Fallback: copiar enlace si no funciona el chat
      const postUrl = `${window.location.origin}/p/${post._id}`;
      try {
        await navigator.clipboard.writeText(postUrl);
        alert(`❌ No se pudo enviar por chat, pero se copió el enlace al portapapeles para compartir con @${friend.username}`);
      } catch (clipError) {
        alert('❌ Error al compartir el post');
      }
      setShowShareMenu(false);
    }
  };

  const copyLink = async () => {
    const postUrl = `${window.location.origin}/p/${post._id}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      
      // Mostrar feedback visual
      const button = document.querySelector('.copy-link-btn');
      if (button) {
        const originalText = button.textContent;
        button.textContent = '✅ ¡Copiado!';
        button.style.color = '#00d4aa';
        
        setTimeout(() => {
          button.textContent = originalText;
          button.style.color = '';
        }, 2000);
      }
      
      setShowShareMenu(false);
    } catch (error) {
      console.error('Error copying link:', error);
      
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = postUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('🔗 Link copiado al portapapeles!');
      } catch (fallbackError) {
        alert(`🔗 Copia este enlace: ${postUrl}`);
      } finally {
        document.body.removeChild(textArea);
      }
      setShowShareMenu(false);
    }
  };

  const focusCommentInput = () => {
    const commentInput = document.querySelector(`#comment-input-${post._id}`);
    if (commentInput) {
      commentInput.focus();
      commentInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) return `${diffDays}d`
    if (diffHours > 0) return `${diffHours}h`
    return 'now'
  }

  return (
    <article className="post-card" style={{
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(23, 72, 113, 0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(222, 209, 198, 0.3)',
      marginBottom: '24px',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      <header className="post-header" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '16px',
        gap: '12px'
      }}>
        <Avatar username={post.user?.username} name={post.user?.name} size={40} />
        <div className="post-user-info" style={{flex: 1}}>
          <h4 style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '600'
          }}>
            <Link 
              to={`/users/${post.user?.username || 'unknown'}`} 
              className="username"
              style={{
                color: '#174871',
                textDecoration: 'none'
              }}
            >
              {post.user?.username || 'unknown'}
            </Link>
          </h4>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: '#8e8e8e'
          }}>
            {formatTime(post.created_at)}
          </p>
        </div>
      </header>

      {imageUrl && (
        <img 
          src={`${STATIC}/${imageUrl}`} 
          alt={post.text || 'Post image'}
          className="post-image"
          style={{
            width: '100%',
            maxHeight: '600px',
            objectFit: 'cover',
            display: 'block'
          }}
        />
      )}

      <div className="post-actions" style={{
        display: 'flex',
        gap: '16px',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(222, 209, 198, 0.3)'
      }}>
        <button 
          className={`action-btn ${likeData.liked ? 'liked' : ''}`}
          onClick={() => onToggleLike(post._id)}
          aria-label="Like"
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: likeData.liked ? '#e74c3c' : '#666'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(167, 118, 147, 0.1)';
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'none';
            e.target.style.transform = 'scale(1)';
          }}
        >
          {likeData.liked ? '❤️' : '🤍'}
          <span style={{fontSize: '14px', fontWeight: '600'}}>
            {likeData.count > 0 && likeData.count}
          </span>
        </button>
        <button 
          className="action-btn" 
          onClick={focusCommentInput}
          aria-label="Comment"
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            transition: 'all 0.3s ease',
            color: '#666'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(23, 72, 113, 0.1)';
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'none';
            e.target.style.transform = 'scale(1)';
          }}
        >
          💬
        </button>
        <div className="share-menu-container" style={{ position: 'relative' }}>
          <button 
            className="action-btn" 
            onClick={handleShare}
            aria-label="Share"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              transition: 'all 0.3s ease',
              color: showShareMenu ? '#0095f6' : '#666'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(222, 209, 198, 0.3)';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'none';
              e.target.style.transform = 'scale(1)';
            }}
          >
            📤
          </button>
          
          {/* Share Menu */}
          {showShareMenu && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: '0',
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '8px 0',
              minWidth: '200px',
              zIndex: 1000,
              marginBottom: '8px'
            }}>
              <div style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                borderBottom: '1px solid #efefef',
                marginBottom: '4px'
              }}>
                Compartir post
              </div>
              
              {/* Lista de amigos para compartir */}
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {loadingFriends ? (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: '#8e8e8e',
                    fontSize: '14px'
                  }}>
                    Cargando amigos...
                  </div>
                ) : friends.length > 0 ? (
                  friends.map(friend => (
                    <button
                      key={friend._id}
                      onClick={() => shareToFriend(friend)}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        border: 'none',
                        background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                      onMouseLeave={(e) => e.target.style.background = 'none'}
                    >
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #A77693, #174871)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        {(friend.name || friend.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600' }}>
                          {friend.name || `@${friend.username}`}
                        </div>
                        {friend.name && (
                          <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                            @{friend.username}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: '#8e8e8e',
                    fontSize: '14px'
                  }}>
                    No tienes amigos para compartir.
                    <br />
                    <Link to="/search" style={{ color: '#A77693', textDecoration: 'none' }}>
                      Buscar amigos
                    </Link>
                  </div>
                )}
              </div>
              
              <div style={{ borderTop: '1px solid #efefef', marginTop: '4px', paddingTop: '4px' }}>
                <button
                  className="copy-link-btn"
                  onClick={copyLink}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#f5f5f5'}
                  onMouseLeave={(e) => e.target.style.background = 'none'}
                >
                  🔗 Copiar enlace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="post-info" style={{
        padding: '12px 16px',
        lineHeight: '1.4'
      }}>
        {likeData.count > 0 && (
          <div className="likes-count" style={{
            fontWeight: '600',
            fontSize: '14px',
            color: '#262626',
            marginBottom: '8px'
          }}>
            {likeData.count} {likeData.count === 1 ? 'like' : 'likes'}
          </div>
        )}
        
        {post.text && (
          <div className="post-caption" style={{
            fontSize: '14px',
            color: '#262626',
            marginBottom: '8px'
          }}>
            <Link 
              to={`/users/${post.user?.username || 'unknown'}`} 
              className="username"
              style={{
                fontWeight: '600',
                color: '#174871',
                textDecoration: 'none',
                marginRight: '6px'
              }}
            >
              {post.user?.username || 'unknown'}
            </Link>
            <span>{post.text}</span>
          </div>
        )}

        <div 
          className="comments-link" 
          onClick={toggleComments}
          style={{
            fontSize: '14px',
            color: '#8e8e8e',
            cursor: 'pointer',
            marginBottom: '8px',
            fontWeight: '500'
          }}
        >
          {showComments ? 'Hide comments' : 'View all comments'}
        </div>

        {showComments && (
          <div className="comments-section" style={{
            marginTop: '12px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {loadingComments ? (
              <div style={{ textAlign: 'center', padding: '12px', color: '#8e8e8e' }}>
                Loading comments...
              </div>
            ) : comments.length > 0 ? (
              comments.map(comment => (
                <div key={comment._id} style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '8px',
                  fontSize: '14px'
                }}>
                  <Avatar username={comment.user?.username} name={comment.user?.name} size={24} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: '600', color: '#174871', marginRight: '6px' }}>
                      {comment.user?.username || 'user'}
                    </span>
                    <span style={{ color: '#262626' }}>
                      {comment.body}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '12px', color: '#8e8e8e' }}>
                No comments yet
              </div>
            )}
          </div>
        )}

        <div className="post-time" style={{
          fontSize: '12px',
          color: '#8e8e8e',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {formatTime(post.created_at)}
        </div>
      </div>

      <div className="add-comment" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: '1px solid rgba(222, 209, 198, 0.3)',
        gap: '12px'
      }}>
        <Avatar username="you" name="You" size={32} />
        <form 
          onSubmit={handleComment} 
          style={{
            display: 'flex', 
            flex: 1, 
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <input
            type="text"
            id={`comment-input-${post._id}`}
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="comment-input"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              background: 'transparent',
              color: '#262626'
            }}
          />
          {comment.trim() && (
            <button 
              type="submit" 
              className="post-btn"
              style={{
                background: 'linear-gradient(135deg, #A77693, #174871)',
                color: 'white',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow = '0 4px 12px rgba(23, 72, 113, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Post
            </button>
          )}
        </form>
      </div>
    </article>
  )
}

export default function Feed(){
  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState({}); // postId -> {count, liked}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [algorithm, setAlgorithm] = useState(null);
  const limit = 20; // Más posts por página para mejor experiencia

  // Nuevo: Scroll infinito automático
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || isLoadingMore || !hasMore) {
        return;
      }
      loadMore();
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, hasMore]);

  async function fetchPage(pg, useInfinite = true){
    try {
      // Usar el nuevo endpoint adictivo
      const endpoint = useInfinite ? `/feed/infinite` : `/feed`;
      const j = await getJSON(`${endpoint}?page=${pg}&limit=${limit}`);
      
      let list = j.posts || [];
      setHasMore(j.pagination?.hasNextPage ?? list.length === limit);
      
      // Información del algoritmo para debugging/analytics
      if (j.algorithm) {
        setAlgorithm(j.algorithm);
        console.log('🧠 Algoritmo:', j.algorithm);
      }
      
      // merge posts (evitando duplicados)
      const newPostsToAdd = [];
      setPosts(prev => {
        if (pg === 1) {
          newPostsToAdd.push(...list);
          return list;
        }
        
        // Filtrar posts que ya existen para evitar duplicados
        const existingIds = new Set(prev.map(p => p._id));
        const newPosts = list.filter(p => !existingIds.has(p._id));
        newPostsToAdd.push(...newPosts);
        
        return [...prev, ...newPosts];
      });
      
      // fetch likes solo para posts nuevos
      if (newPostsToAdd.length > 0) {
        const results = await Promise.all(
          newPostsToAdd.map(p => getJSON(`/posts/${p._id}/likes`).catch(()=>({count:0, liked:false})))
        );
        
        setLikes(prev => {
          const next = { ...prev };
          newPostsToAdd.forEach((p, i) => next[p._id] = results[i]);
          return next;
        });
      }
    } catch (err) {
      throw err;
    }
  }

  useEffect(()=>{
    setLoading(true);
    fetchPage(1)
      .then(()=> setLoading(false))
      .catch(()=>{ 
        setError('Could not load feed'); 
        setLoading(false); 
      });
  }, []);

  const loadMore = async ()=>{
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    const next = page + 1;
    setPage(next);
    
    try {
      await fetchPage(next);
    } catch (err) {
      console.error('Error loading more posts:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleLike = async (postId) => {
    const state = likes[postId] || {count:0, liked:false};
    try {
      const API = import.meta.env.VITE_API || 'http://localhost:3001/api';
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      
      if (state.liked) {
        await fetch(`${API}/posts/${postId}/like`, { method:'DELETE', headers });
        setLikes(v => ({ ...v, [postId]: { count: Math.max(0, state.count-1), liked: false } }));
      } else {
        await fetch(`${API}/posts/${postId}/like`, { method:'POST', headers });
        setLikes(v => ({ ...v, [postId]: { count: state.count+1, liked: true } }));
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const addComment = async (postId, text) => {
    try {
      const API = import.meta.env.VITE_API || 'http://localhost:3001/api';
      const headers = { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}` 
      };
      
      const response = await fetch(`${API}/posts/${postId}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ body: text }) // Changed from 'text' to 'body'
      });
      
      if (response.ok) {
        console.log('Comment added successfully');
        // Optionally refresh the post or update comments state
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '400px',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #A77693',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#8e8e8e', fontSize: '16px' }}>
          Preparando tu feed personalizado... 🧠✨
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        color: '#e74c3c', 
        padding: '40px',
        background: 'white',
        borderRadius: '12px',
        margin: '20px 0'
      }}>
        <h3>😔 Oops!</h3>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            marginTop: '15px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #A77693, #174871)',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer'
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '0 auto',
      minHeight: '100vh'
    }}>
      {/* Indicador del algoritmo activo */}
      {algorithm && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(167, 118, 147, 0.1), rgba(23, 72, 113, 0.1))',
          padding: '12px 16px',
          margin: '0 0 20px 0',
          borderRadius: '12px',
          border: '1px solid rgba(167, 118, 147, 0.2)',
          fontSize: '14px',
          color: '#174871',
          textAlign: 'center'
        }}>
          <strong>{algorithm.message}</strong>
          <div style={{ fontSize: '12px', color: '#8e8e8e', marginTop: '4px' }}>
            Seguidos: {algorithm.followed} • Trending: {algorithm.trending} • Aleatorio: {algorithm.random}
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          color: '#8e8e8e', 
          padding: '60px 20px',
          background: 'white',
          borderRadius: '12px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>¡Tu feed está vacío! 📱</h3>
          <p>Sigue a más usuarios para ver contenido aquí.</p>
        </div>
      ) : (
        <>
          {posts.map(post => (
            <PostCard 
              key={post._id} 
              post={post} 
              likes={likes} 
              onToggleLike={toggleLike} 
              onAddComment={addComment} 
            />
          ))}

          {/* Scroll infinito - Indicador de carga */}
          {isLoadingMore && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '30px',
              gap: '15px'
            }}>
              <div style={{
                width: '30px',
                height: '30px',
                border: '3px solid #f3f3f3',
                borderTop: '3px solid #A77693',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span style={{ color: '#8e8e8e', fontSize: '14px' }}>
                Cargando más contenido adictivo... 🔥
              </span>
            </div>
          )}

          {/* Botón manual de carga (backup para cuando scroll infinito falla) */}
          {!isLoadingMore && hasMore && (
            <div style={{ textAlign: 'center', margin: '30px 0' }}>
              <button 
                onClick={loadMore}
                style={{
                  background: 'linear-gradient(135deg, #A77693, #174871)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '12px 32px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 20px rgba(23, 72, 113, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 6px 30px rgba(23, 72, 113, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 4px 20px rgba(23, 72, 113, 0.2)';
                }}
              >
                ✨ Cargar Más Posts
              </button>
            </div>
          )}

          {/* Mensaje cuando no hay más contenido */}
          {!hasMore && posts.length > 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#8e8e8e',
              background: 'rgba(167, 118, 147, 0.05)',
              borderRadius: '12px',
              margin: '20px 0'
            }}>
              <h3 style={{ marginBottom: '10px' }}>🎉 ¡Has visto todo!</h3>
              <p>Ya viste todo el contenido disponible. ¡Vuelve más tarde para más!</p>
              <div style={{ marginTop: '15px' }}>
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  style={{
                    background: 'none',
                    border: '2px solid #A77693',
                    color: '#A77693',
                    padding: '10px 20px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#A77693';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'none';
                    e.target.style.color = '#A77693';
                  }}
                >
                  ⬆️ Volver al inicio
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* CSS para la animación de carga */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
