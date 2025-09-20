import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getJSON, postJSON, deleteJSON, STATIC } from '../api';

export default function Search(){
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(q);
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ sent: [], received: [] });
  
  // Nuevos estados para exploración adictiva
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [algorithm, setAlgorithm] = useState(null);
  const limit = 36; // Grid layout con más posts para llenar pantallas grandes

  useEffect(()=>{
    // Cargar usuario actual y sus relaciones
    loadCurrentUserData();
    
    // Cargar contenido inicial
    if (q) {
      searchUsers(q);
    } else {
      loadExploreContent();
    }
  }, []);

  // Scroll infinito para exploración
  useEffect(() => {
    if (!q) { // Solo para exploración, no para búsqueda
      const handleScroll = () => {
        if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || isLoadingMore || !hasMore) {
          return;
        }
        loadMoreExploreContent();
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [isLoadingMore, hasMore, q]);

  const loadCurrentUserData = async () => {
    try {
      // Obtener usuario actual desde localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        
        // Cargar amigos
        const friendsResponse = await getJSON('/friends');
        setFriends(friendsResponse.friends || []);
        
        // Cargar solicitudes enviadas
        const sentResponse = await getJSON('/friends/sent');
        
        // Cargar solicitudes recibidas
        const receivedResponse = await getJSON('/friends/received');
        
        setFriendRequests({
          sent: sentResponse.requests || [],
          received: receivedResponse.requests || []
        });
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  useEffect(()=>{
    if (q) {
      searchUsers(q);
    } else {
      // Reset y cargar exploración desde el inicio
      setPage(1);
      setHasMore(true);
      setPosts([]);
      loadExploreContent();
    }
  }, [q]);

  const loadExploreContent = async () => {
    setLoading(true);
    try {
      await fetchExplorePage(1);
    } catch (err) {
      setError('No se pudieron cargar las publicaciones de exploración');
      console.error('Failed to load explore content:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreExploreContent = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    
    try {
      await fetchExplorePage(nextPage);
    } catch (err) {
      console.error('Error loading more explore content:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  async function fetchExplorePage(pg) {
    try {
      // Usar el endpoint de exploración adictiva
      const endpoint = `/explore/infinite`;
      const response = await getJSON(`${endpoint}?page=${pg}&limit=${limit}&category=mixed`);
      
      let list = response.posts || [];
      setHasMore(response.pagination?.hasNextPage ?? list.length === limit);
      
      // Información del algoritmo para debugging/analytics
      if (response.algorithm) {
        setAlgorithm(response.algorithm);
        console.log('🧠 Algoritmo de Exploración:', response.algorithm);
      }
      
      // Merge posts para scroll infinito
      setPosts(prev => pg === 1 ? list : [...prev, ...list]);
      
      // Cargar stats de likes para los nuevos posts
      const results = await Promise.all(
        list.map(p => getJSON(`/posts/${p._id}/likes`).catch(() => ({ count: 0, liked: false })))
      );
      
      // Actualizar posts con stats de likes
      const postsWithStats = list.map((post, i) => ({
        ...post,
        likes_count: results[i]?.count || 0,
        liked: results[i]?.liked || false
      }));
      
      // Actualizar solo los nuevos posts con stats
      if (pg === 1) {
        setPosts(postsWithStats);
      } else {
        setPosts(prev => [...prev.slice(0, -list.length), ...postsWithStats]);
      }
      
    } catch (err) {
      throw err;
    }
  }

  const searchUsers = async (query) => {
    setLoading(true);
    try {
      const endpoint = `/search/users?q=${encodeURIComponent(query)}`;
      const response = await getJSON(endpoint);
      console.log('Search response:', response);
      
      setUsers(response.users || []);
      setPosts([]);
      setError('');
    } catch (err) {
      console.error('Failed to search users:', err);
      setError('No se pudieron cargar los resultados de búsqueda');
      setUsers([]);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setParams({ q: searchInput });
    } else {
      setParams({});
    }
  };

  const openModal = (post) => {
    console.log('🔄 Opening modal for post:', post._id, 'with likes:', post.likes_count, 'comments:', post.comments_count);
    setSelectedPost(post);
  };

  const closeModal = () => {
    setSelectedPost(null);
  };

  return (
    <div style={{ 
      padding: '15px', 
      maxWidth: '100%', 
      margin: '0 auto', 
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(167, 118, 147, 0.1), rgba(23, 72, 113, 0.1))',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(167, 118, 147, 0.2)',
        boxShadow: '0 8px 32px rgba(167, 118, 147, 0.15)'
      }}>
        <h2 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '24px', 
          fontWeight: '700',
          background: 'linear-gradient(135deg, #A77693, #174871)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {q ? `Resultados para "${q}"` : 'Explorar Publicaciones'}
        </h2>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar en publicaciones..."
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '2px solid rgba(167, 118, 147, 0.3)',
              borderRadius: '12px',
              fontSize: '16px',
              background: 'rgba(255, 255, 255, 0.9)',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#A77693';
              e.target.style.boxShadow = '0 0 0 3px rgba(167, 118, 147, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(167, 118, 147, 0.3)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, #A77693, #174871)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              minWidth: '100px'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 4px 16px rgba(167, 118, 147, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Buscar
          </button>
        </form>
      </div>

      {error && (
        <div style={{ 
          color: '#d32f2f', 
          background: 'rgba(211, 47, 47, 0.1)',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid rgba(211, 47, 47, 0.3)',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          color: '#A77693',
          fontSize: '16px'
        }}>
          {q ? 'Buscando usuarios...' : 'Cargando publicaciones...'}
        </div>
      )}

      {/* Mostrar grid de posts cuando NO hay búsqueda (Exploración) */}
      {!loading && !q && (
        <>
          {/* Información del algoritmo */}
          {algorithm && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(167, 118, 147, 0.1), rgba(23, 72, 113, 0.1))',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid rgba(167, 118, 147, 0.2)'
            }}>
              <div style={{
                fontSize: '14px',
                color: '#A77693',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                🧠 Algoritmo de Exploración Activo
              </div>
              <div style={{
                fontSize: '12px',
                color: '#666',
                display: 'flex',
                gap: '15px',
                flexWrap: 'wrap'
              }}>
                <span>📊 Trending: {algorithm.trendingWeight || 30}%</span>
                <span>🔥 Populares: {algorithm.popularWeight || 40}%</span>
                <span>✨ Nuevos: {algorithm.recentWeight || 20}%</span>
                <span>🎲 Sorpresa: {algorithm.randomWeight || 10}%</span>
              </div>
            </div>
          )}

          {posts.length > 0 ? (
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '15px',
                padding: '10px 0',
                width: '100%'
              }}>
                {posts.map(post => (
                  <PostCard key={post._id} post={post} onClick={() => openModal(post)} />
                ))}
              </div>

              {/* Indicador de carga para más contenido */}
              {isLoadingMore && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '30px',
                  gap: '15px'
                }}>
                  <div className="loading" style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #f3f3f3',
                    borderTop: '2px solid #A77693',
                    borderRadius: '50%',
                    display: 'inline-block'
                  }}></div>
                  <span style={{ color: '#8e8e8e', fontSize: '14px' }}>
                    Descubriendo más contenido adictivo... 🔍✨
                  </span>
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
                  <h3 style={{ marginBottom: '10px' }}>🎯 ¡Has explorado todo!</h3>
                  <p>Has visto todo el contenido disponible para explorar.</p>
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
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#8e8e8e'
            }}>
              <h3 style={{ marginBottom: '16px', color: '#A77693' }}>🔍 No hay contenido para explorar</h3>
              <p>No se encontraron publicaciones para mostrar en este momento.</p>
            </div>
          )}
        </>
      )}

      {/* Mostrar lista de usuarios cuando HAY búsqueda */}
      {!loading && q && users.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '16px',
          border: '1px solid rgba(167, 118, 147, 0.2)',
          padding: '20px',
          margin: '20px 0'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#174871'
          }}>
            Usuarios encontrados ({users.length})
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {users.map(user => (
              <UserCard 
                key={user._id} 
                user={user} 
                currentUser={currentUser}
                friends={friends}
                friendRequests={friendRequests}
                onFriendRequestSent={() => loadCurrentUserData()} // Recargar datos cuando se envía solicitud
              />
            ))}
          </div>
        </div>
      )}

      {/* Mensajes de estado vacío */}
      {!loading && !q && posts.length === 0 && !error && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          color: '#666',
          fontSize: '16px',
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '16px',
          border: '1px solid rgba(167, 118, 147, 0.2)'
        }}>
          No hay publicaciones para mostrar
        </div>
      )}

      {!loading && q && users.length === 0 && !error && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          color: '#666',
          fontSize: '16px',
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '16px',
          border: '1px solid rgba(167, 118, 147, 0.2)'
        }}>
          No se encontraron usuarios para "{q}"
        </div>
      )}

      {/* Modal for selected post */}
      {selectedPost && (
        <PostModal post={selectedPost} onClose={closeModal} />
      )}
    </div>
  );
}

function PostCard({ post, onClick }) {
  console.log('PostCard received post:', {
    id: post._id,
    file: post.file,
    likes_count: post.likes_count,
    likesCount: post.likesCount,
    comments_count: post.comments_count,
    commentsCount: post.commentsCount,
    user: post.user
  });
  
  const imageUrl = post.file?.variants?.find(v=>v.kind==='medium')?.s3_key || post.file?.s3_key_original;
  const fullImageUrl = imageUrl ? `${STATIC}/${imageUrl}` : null;
  console.log('Image URL for post:', imageUrl);
  console.log('Full image URL for post:', fullImageUrl);
  console.log('Final likes count:', post.likes_count || post.likesCount || 0);
  console.log('Final comments count:', post.comments_count || post.commentsCount || 0);
  
  return (
    <div
      onClick={onClick}
      style={{
        width: '100%',
        aspectRatio: '1',
        background: '#f5f5f5',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
      onMouseEnter={(e) => {
        console.log('🐭 Mouse ENTER on post:', post.id);
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.zIndex = '10';
        const overlay = e.currentTarget.querySelector('.user-overlay');
        const statsOverlay = e.currentTarget.querySelector('.stats-overlay');
        if (overlay) {
          overlay.style.opacity = '1';
          console.log('✅ User overlay shown');
        }
        if (statsOverlay) {
          statsOverlay.style.opacity = '1';
          console.log('✅ Stats overlay shown');
        }
      }}
      onMouseLeave={(e) => {
        console.log('🐭 Mouse LEAVE on post:', post.id);
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.zIndex = '1';
        const overlay = e.currentTarget.querySelector('.user-overlay');
        const statsOverlay = e.currentTarget.querySelector('.stats-overlay');
        if (overlay) {
          overlay.style.opacity = '0';
          console.log('❌ User overlay hidden');
        }
        if (statsOverlay) {
          statsOverlay.style.opacity = '0';
          console.log('❌ Stats overlay hidden');
        }
      }}
    >
      {fullImageUrl ? (
        <img
          src={fullImageUrl}
          alt="Post"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(167, 118, 147, 0.1), rgba(23, 72, 113, 0.1))',
          color: '#A77693',
          fontSize: '24px'
        }}>
          📝
        </div>
      )}
      
      {/* Stats overlay - likes y comentarios */}
      <div 
        className="stats-overlay"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          opacity: 0,
          transition: 'opacity 0.2s ease',
          fontSize: '16px',
          fontWeight: 'bold',
          pointerEvents: 'none'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255,255,255,0.2)',
          padding: '4px 8px',
          borderRadius: '12px'
        }}>
          <span style={{ fontSize: '18px' }}>❤️</span>
          <span>{post.likes_count || post.likesCount || 0}</span>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255,255,255,0.2)',
          padding: '4px 8px',
          borderRadius: '12px'
        }}>
          <span style={{ fontSize: '18px' }}>💬</span>
          <span>{post.comments_count || post.commentsCount || 0}</span>
        </div>
      </div>
      
      {/* User overlay (username en la parte inferior) */}
      <div 
        className="user-overlay"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
          color: 'white',
          padding: '8px',
          fontSize: '11px',
          fontWeight: '600',
          opacity: 0,
          transition: 'opacity 0.2s ease'
        }}
      >
        @{post.user?.username || 'unknown'}
      </div>
    </div>
  );
}

function PostModal({ post, onClose }) {
  const imageUrl = post.file?.variants?.find(v=>v.kind==='medium')?.s3_key || post.file?.s3_key_original;
  const fullImageUrl = imageUrl ? `${STATIC}/${imageUrl}` : null;
  console.log('🖼️ Modal imageUrl:', imageUrl);
  console.log('🖼️ Modal STATIC:', STATIC);
  console.log('🖼️ Modal complete URL:', fullImageUrl);
  
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || post.likesCount || 0);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
        setShowShareMenu(false);
      }
    };
    
    const handleClickOutside = (e) => {
      if (showShareMenu && !e.target.closest('.share-menu-container')) {
        setShowShareMenu(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose, showShareMenu]);

  // Cargar datos reales del post cuando se abre el modal
  useEffect(() => {
    const loadPostData = async () => {
      setLoading(true);
      try {
        console.log('🔄 Loading post data for modal:', post._id);
        
        // Cargar likes reales
        const likesResponse = await getJSON(`/posts/${post._id}/likes`);
        const realLikesCount = likesResponse.count || 0;
        const userLiked = likesResponse.liked || false;
        
        console.log('👍 Likes response for post', post._id, ':', likesResponse);
        console.log('👍 Likes loaded:', realLikesCount, 'User liked:', userLiked);
        console.log('👍 User ID:', getCurrentUserId());
        setLikesCount(realLikesCount);
        setLiked(userLiked);
        
        // Cargar comentarios reales
        try {
          const commentsResponse = await getJSON(`/posts/${post._id}/comments`);
          const realComments = commentsResponse.comments || [];
          console.log('💬 Comments loaded:', realComments.length);
          setComments(realComments);
        } catch (commentsError) {
          console.log('ℹ️ No comments endpoint, using fallback');
          setComments([]);
        }
        
      } catch (error) {
        console.error('❌ Error loading post data:', error);
        setLikesCount(post.likes_count || 0);
        setLiked(false);
        setComments([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadPostData();
  }, [post._id]);

  // Helper para obtener ID del usuario actual
  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
      }
    } catch (e) {
      console.error('Error getting user ID:', e);
    }
    return null;
  };

  const handleLike = async () => {
    try {
      const newLiked = !liked;
      setLiked(newLiked);
      setLikesCount(prev => newLiked ? prev + 1 : prev - 1);
      
      // Llamada real al API
      if (newLiked) {
        await postJSON(`/posts/${post._id}/like`, {});
        console.log('✅ Post liked');
      } else {
        await deleteJSON(`/posts/${post._id}/like`);
        console.log('❌ Post unliked');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revertir el cambio en caso de error
      setLiked(!liked);
      setLikesCount(prev => liked ? prev + 1 : prev - 1);
    }
  };

  const handleAddComment = async () => {
    if (comment.trim()) {
      try {
        // Llamada real al API para agregar comentario
        const response = await postJSON(`/posts/${post._id}/comments`, { body: comment.trim() });
        console.log('✅ Comment API response:', response);
        
        // Agregar el comentario a la lista local
        const newComment = response.comment;
        setComments(prev => [...prev, newComment]);
        setComment('');
        console.log('💬 Comment added:', newComment);
      } catch (error) {
        console.error('❌ Error adding comment:', error);
        // Fallback: agregar localmente si falla el API
        const newComment = {
          _id: Date.now(),
          user: {
            username: 'current_user',
            name: 'Usuario Actual'
          },
          body: comment.trim(),
          created_at: new Date().toISOString()
        };
        
        setComments(prev => [...prev, newComment]);
        setComment('');
      }
    }
  };

  const handleShare = () => {
    setShowShareMenu(!showShareMenu);
  };

  const shareToFriend = async (friendUsername) => {
    try {
      // Aquí enviarías el post como mensaje directo
      // await postJSON('/dm/send', {
      //   recipient: friendUsername,
      //   type: 'post_share',
      //   content: `Te compartí este post: ${post.text || 'Post compartido'}`,
      //   shared_post: post._id
      // });
      
      console.log(`Post compartido con ${friendUsername}`);
      alert(`Post enviado a @${friendUsername}!`);
      setShowShareMenu(false);
    } catch (error) {
      console.error('Error sharing post:', error);
      alert('Error al compartir el post');
    }
  };

  const copyLink = () => {
    const postUrl = `${window.location.origin}/post/${post._id}`;
    navigator.clipboard.writeText(postUrl).then(() => {
      alert('Link copiado al portapapeles!');
      setShowShareMenu(false);
    }).catch(() => {
      alert('No se pudo copiar el link');
    });
  };

  const focusCommentInput = () => {
    // Hacer scroll y focus al input de comentario
    const commentInput = document.querySelector('.comment-input');
    if (commentInput) {
      commentInput.focus();
      commentInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '900px',
          maxHeight: '90vh',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: window.innerWidth > 768 ? 'row' : 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left side - Image */}
        <div style={{ 
          flex: window.innerWidth > 768 ? '1.2' : 'none',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#000',
          minHeight: window.innerWidth > 768 ? '500px' : '300px'
        }}>
          {fullImageUrl ? (
            <img
              src={fullImageUrl}
              alt="Post"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
              onLoad={() => console.log('✅ Modal image loaded successfully')}
              onError={(e) => {
                console.error('❌ Modal image failed to load:', e.target.src);
                console.error('❌ Error details:', e);
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(167, 118, 147, 0.1), rgba(23, 72, 113, 0.1))',
              color: '#A77693',
              fontSize: '48px'
            }}>
              📝
            </div>
          )}
        </div>

        {/* Right side - Content */}
        <div style={{
          flex: window.innerWidth > 768 ? '1' : 'none',
          display: 'flex',
          flexDirection: 'column',
          minWidth: window.innerWidth > 768 ? '320px' : 'auto'
        }}>
          {/* Header with user info */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #efefef',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #A77693, #174871)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                {post.user?.name?.charAt(0)?.toUpperCase() || post.user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <Link 
                to={`/users/${post.user?.username || 'unknown'}`}
                style={{ 
                  fontWeight: '600', 
                  color: '#000', 
                  textDecoration: 'none',
                  fontSize: '14px'
                }}
              >
                {post.user?.username || 'demo'}
              </Link>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px',
                color: '#666'
              }}
            >
              ✕
            </button>
          </div>

          {/* Comments section */}
          <div style={{
            flex: 1,
            padding: '16px 20px',
            overflowY: 'auto',
            maxHeight: '300px'
          }}>
            {/* Post caption */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontWeight: '600', marginRight: '8px', fontSize: '14px' }}>
                {post.user?.username || 'demo'}
              </span>
              <span style={{ fontSize: '14px', color: '#000' }}>
                {post.text || `Post de ${post.user?.username || 'demo'}`}
              </span>
            </div>

            {/* Comments list */}
            <div style={{ marginBottom: '16px' }}>
              {comments.length > 0 ? (
                comments.map((commentItem, index) => (
                  <div key={commentItem._id || commentItem.id || `comment-${index}`} style={{ marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', marginRight: '8px', fontSize: '14px' }}>
                      {commentItem.user?.username || commentItem.username || 'usuario'}
                    </span>
                    <span style={{ fontSize: '14px', color: '#000' }}>
                      {commentItem.body || commentItem.text}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ 
                  color: '#8e8e8e', 
                  fontSize: '14px', 
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: '20px 0'
                }}>
                  No hay comentarios aún. ¡Sé el primero en comentar!
                </div>
              )}
            </div>

            {/* View all comments link - solo si hay comentarios */}
            {comments.length > 0 && (
              <button 
                onClick={focusCommentInput}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8e8e8e',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '0',
                  marginBottom: '12px'
                }}
              >
                View all comments
              </button>
            )}
          </div>

          {/* Actions section */}
          <div style={{
            borderTop: '1px solid #efefef',
            padding: '12px 20px'
          }}>
            {/* Like and share buttons */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              marginBottom: '8px'
            }}>
              <button
                onClick={handleLike}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  padding: '0',
                  color: liked ? '#ff3040' : '#262626',
                  transition: 'transform 0.1s ease'
                }}
                onMouseDown={(e) => e.target.style.transform = 'scale(0.9)'}
                onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                {liked ? '❤️' : '🤍'}
              </button>
              <button 
                onClick={focusCommentInput}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  padding: '0',
                  color: '#262626',
                  transition: 'transform 0.1s ease'
                }}
                onMouseDown={(e) => e.target.style.transform = 'scale(0.9)'}
                onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                💬
              </button>
              <div className="share-menu-container" style={{ position: 'relative' }}>
                <button 
                  onClick={handleShare}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '24px',
                    padding: '0',
                    color: showShareMenu ? '#0095f6' : '#262626',
                    transition: 'transform 0.1s ease'
                  }}
                  onMouseDown={(e) => e.target.style.transform = 'scale(0.9)'}
                  onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
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
                      {['demo', 'usuario1', 'amigo1', 'amigo2'].map(friend => (
                        <button
                          key={friend}
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
                            {friend.charAt(0).toUpperCase()}
                          </div>
                          @{friend}
                        </button>
                      ))}
                    </div>
                    
                    <div style={{ borderTop: '1px solid #efefef', marginTop: '4px', paddingTop: '4px' }}>
                      <button
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
                          gap: '8px'
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

            {/* Likes count */}
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', fontSize: '14px' }}>
                {likesCount} likes
              </span>
            </div>

            {/* Time */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ 
                fontSize: '12px', 
                color: '#8e8e8e',
                textTransform: 'uppercase'
              }}>
                {new Date(post.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long'
                }).toUpperCase()}
              </span>
            </div>

            {/* Comment input */}
            <div style={{
              borderTop: '1px solid #efefef',
              paddingTop: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                className="comment-input"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  padding: '0'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddComment();
                  }
                }}
              />
              {comment.trim() && (
                <button
                  onClick={handleAddComment}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0095f6',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                  Post
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserCard({ user, currentUser, friends, friendRequests, onFriendRequestSent }) {
  const [requestSent, setRequestSent] = useState(false);

  // Determinar el estado de la relación con este usuario
  const getRelationshipStatus = () => {
    if (!currentUser) return 'add';
    
    console.log('Comparing users:', {
      current: currentUser._id,
      search: user._id,
      currentUsername: currentUser.username,
      searchUsername: user.username,
      isEqual: user._id === currentUser._id || user.username === currentUser.username
    });
    
    // Si es el mismo usuario (comparar por ID y username para mayor seguridad)
    if (user._id === currentUser._id || user.username === currentUser.username) {
      return 'self';
    }
    
    // Si ya es amigo
    const isFriend = friends.some(friend => friend._id === user._id);
    if (isFriend) return 'friend';
    
    // Si ya se envió solicitud
    const requestAlreadySent = friendRequests.sent.some(req => req.receiver._id === user._id);
    if (requestAlreadySent || requestSent) return 'sent';
    
    // Si hay solicitud pendiente del otro usuario
    const hasReceivedRequest = friendRequests.received.some(req => req.sender._id === user._id);
    if (hasReceivedRequest) return 'received';
    
    return 'add';
  };

  const status = getRelationshipStatus();

  const sendFriendRequest = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (status !== 'add') return;
    
    try {
      const response = await postJSON('/friends/send', { receiverId: user._id });
      setRequestSent(true);
      if (onFriendRequestSent) {
        onFriendRequestSent(user._id);
      }
      console.log('Friend request sent successfully:', response);
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const renderButton = () => {
    switch (status) {
      case 'self':
        return null; // No mostrar botón para uno mismo
      case 'friend':
        return (
          <div style={{
            padding: '6px 12px',
            background: 'linear-gradient(135deg, #10B981, #06B6D4)',
            color: 'white',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '500',
            minWidth: '80px',
            textAlign: 'center'
          }}>
            ✓ Amigo
          </div>
        );
      case 'sent':
        return (
          <div style={{
            padding: '6px 12px',
            background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
            color: 'white',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '500',
            minWidth: '80px',
            textAlign: 'center'
          }}>
            ⏳ Enviada
          </div>
        );
      case 'received':
        return (
          <div style={{
            padding: '6px 12px',
            background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
            color: 'white',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '500',
            minWidth: '80px',
            textAlign: 'center'
          }}>
            💌 Pendiente
          </div>
        );
      case 'add':
      default:
        return (
          <button
            onClick={sendFriendRequest}
            style={{
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '80px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            + Agregar
          </button>
        );
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      background: 'rgba(255, 255, 255, 0.7)',
      borderRadius: '12px',
      border: '1px solid rgba(167, 118, 147, 0.1)',
      transition: 'all 0.2s ease'
    }}>
      <Link 
        to={`/users/${user.username}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flex: 1,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #A77693, #174871)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '600',
          fontSize: '18px',
          flexShrink: 0
        }}>
          {user.name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: '600',
            fontSize: '16px',
            color: '#174871',
            marginBottom: '2px'
          }}>
            @{user.username}
          </div>
          
          {user.name && (
            <div style={{
              fontSize: '14px',
              color: '#666',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {user.name}
            </div>
          )}
          
          {user.email && (
            <div style={{
              fontSize: '12px',
              color: '#8e8e8e',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {user.email}
            </div>
          )}
        </div>
      </Link>
      
      {renderButton()}
    </div>
  );
}