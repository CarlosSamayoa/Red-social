import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJSON, postJSON } from '../api';
import Avatar from './Avatar.jsx';

export default function Messages() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [messagePollingInterval, setMessagePollingInterval] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUserId(user.id);
    loadConversations();
  }, []);

  // Cleanup polling when component unmounts
  useEffect(() => {
    return () => {
      stopMessagePolling();
    };
  }, []);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const data = await getJSON('/dm');
      console.log('Conversations loaded:', data);
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      setLoading(true);
      const data = await getJSON(`/dm/${conversationId}/messages`);
      console.log('Messages loaded:', data);
      // Invertir el orden para mostrar el más reciente al final
      const sortedMessages = (data.messages || []).reverse();
      setMessages(sortedMessages);
      setActiveConversation(conversationId);
      
      // Start polling for new messages
      startMessagePolling(conversationId);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const startMessagePolling = (conversationId) => {
    // Clear any existing polling
    if (messagePollingInterval) {
      clearInterval(messagePollingInterval);
    }
    
    // Poll for new messages every 2 seconds
    const interval = setInterval(async () => {
      try {
        const messagesResponse = await getJSON(`/dm/${conversationId}/messages`);
        const newMessages = (messagesResponse.messages || []).reverse();
        
        // Only update if there are new messages
        setMessages(currentMessages => {
          if (newMessages.length !== currentMessages.length) {
            console.log('New messages received:', newMessages.length - currentMessages.length);
            return newMessages;
          }
          return currentMessages;
        });
        
      } catch (err) {
        console.error('Failed to poll messages:', err);
      }
    }, 2000);
    
    setMessagePollingInterval(interval);
  };

  const stopMessagePolling = () => {
    if (messagePollingInterval) {
      clearInterval(messagePollingInterval);
      setMessagePollingInterval(null);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear immediately for better UX

    try {
      await postJSON(`/dm/${activeConversation}/messages`, { body: messageText });
      
      // Immediately reload messages to show the new one
      const response = await getJSON(`/dm/${activeConversation}/messages`);
      setMessages((response.messages || []).reverse());
      
    } catch (err) {
      console.error('Failed to send message:', err);
      // Restore message on error
      setNewMessage(messageText);
    }
  };

  const getOtherParticipant = (conv) => {
    if (!conv.participants) return null;
    return conv.participants.find(p => p._id !== currentUserId);
  };

  const activeConvData = conversations.find(c => c.conversation === activeConversation);
  const otherUser = activeConvData ? getOtherParticipant(activeConvData) : null;

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - var(--header-height) - 100px)',
      background: 'var(--bg-primary)',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid var(--border-color)',
      margin: '1rem'
    }}>
      {/* Conversations List */}
      <div style={{
        width: '320px',
        borderRight: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Mensajes</h2>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto'
        }}>
          {conversations.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <p>No tienes conversaciones aún</p>
              <p style={{ fontSize: '14px', marginTop: '0.5rem' }}>
                Visita un perfil y haz clic en "Message"
              </p>
            </div>
          ) : (
            conversations
              .filter(conv => {
                // Filtrar conversaciones sin participantes válidos
                if (!conv.participants || conv.participants.length === 0) return false;
                const otherParticipant = conv.participants.find(p => p._id !== currentUserId);
                return otherParticipant && otherParticipant.username;
              })
              .map((conv) => {
                const other = getOtherParticipant(conv);
                if (!other) return null;
                
                return (
                  <div
                    key={conv.conversation}
                    onClick={() => loadMessages(conv.conversation)}
                    style={{
                      padding: '1rem 1.5rem',
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      background: activeConversation === conv.conversation 
                        ? 'var(--bg-hover)' 
                        : 'transparent',
                      transition: 'background var(--transition-fast)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                  }}
                  onMouseEnter={(e) => {
                    if (activeConversation !== conv.conversation) {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeConversation !== conv.conversation) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <Avatar user={other} size={48} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {other.username}
                    </div>
                    {other.email && (
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {other.email}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)'
      }}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              background: 'var(--bg-secondary)'
            }}>
              {otherUser && (
                <>
                  <Avatar user={otherUser} size={40} />
                  <div>
                    <div style={{
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      fontSize: '16px'
                    }}>
                      {otherUser.username}
                    </div>
                    {otherUser.email && (
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)'
                      }}>
                        {otherUser.email}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner" />
                </div>
              ) : messages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'var(--text-secondary)'
                }}>
                  No hay mensajes aún. ¡Sé el primero en escribir!
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const isMine = msg.sender === currentUserId || msg.sender._id === currentUserId;
                    return (
                      <div
                        key={msg._id || idx}
                        style={{
                          display: 'flex',
                          justifyContent: isMine ? 'flex-end' : 'flex-start',
                          animation: 'fadeInScale 0.3s ease-out'
                        }}
                      >
                        <div style={{
                          maxWidth: '60%',
                          padding: '0.875rem 1.25rem',
                          borderRadius: isMine 
                            ? '18px 18px 4px 18px' 
                            : '18px 18px 18px 4px',
                          background: isMine 
                            ? 'var(--gradient-primary)' 
                            : 'var(--bg-secondary)',
                          color: isMine ? 'white' : 'var(--text-primary)',
                          boxShadow: '0 2px 8px var(--shadow-color)',
                          wordWrap: 'break-word'
                        }}>
                          {msg.body || msg.text}
                          
                          {/* Mostrar post compartido si existe */}
                          {msg.shared_post && (
                            <div style={{
                              marginTop: '10px',
                              padding: '12px',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '12px',
                              background: 'rgba(255,255,255,0.1)',
                              cursor: 'pointer',
                              transition: 'transform 0.2s',
                            }}
                            onClick={() => {
                              const postId = typeof msg.shared_post === 'object' ? msg.shared_post._id : msg.shared_post;
                              navigate(`/p/${postId}`);
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              <div style={{ 
                                fontSize: '12px', 
                                opacity: 0.8, 
                                marginBottom: '8px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px' 
                              }}>
                                📎 Publicación compartida
                                {typeof msg.shared_post === 'object' && msg.shared_post.user && (
                                  <span>de @{msg.shared_post.user.username || 'usuario'}</span>
                                )}
                              </div>
                              
                              {/* Mostrar texto de la publicación si está disponible */}
                              {typeof msg.shared_post === 'object' && msg.shared_post.text && (
                                <div style={{ 
                                  fontSize: '13px', 
                                  color: isMine ? '#e1e1e1' : 'var(--text-secondary)',
                                  marginBottom: '8px',
                                  fontStyle: 'italic',
                                  maxHeight: '60px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  "{msg.shared_post.text.substring(0, 100)}{msg.shared_post.text.length > 100 ? '...' : ''}"
                                </div>
                              )}
                              
                              <div style={{ 
                                fontSize: '12px', 
                                color: isMine ? '#c1c1c1' : 'var(--text-secondary)',
                                textAlign: 'center'
                              }}>
                                👆 Haz clic para ver la publicación completa
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Ref para auto-scroll */}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <form 
              onSubmit={sendMessage}
              style={{
                padding: '1.5rem',
                borderTop: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                display: 'flex',
                gap: '1rem'
              }}
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                style={{
                  flex: 1,
                  padding: '0.875rem 1.25rem',
                  borderRadius: '24px',
                  border: '1px solid var(--input-border)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  outline: 'none',
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
              <button
                type="submit"
                disabled={!newMessage.trim()}
                style={{
                  padding: '0.875rem 2rem',
                  borderRadius: '24px',
                  border: 'none',
                  background: 'var(--gradient-primary)',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                  opacity: newMessage.trim() ? 1 : 0.5,
                  transition: 'all var(--transition-medium)',
                  boxShadow: '0 4px 12px rgba(167, 118, 147, 0.3)'
                }}
                className={newMessage.trim() ? 'hover-lift' : ''}
              >
                Enviar
              </button>
            </form>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '1rem',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '64px' }}>💬</div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Tus mensajes</h3>
            <p style={{ margin: 0, fontSize: '15px' }}>
              Selecciona una conversación para empezar a chatear
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
