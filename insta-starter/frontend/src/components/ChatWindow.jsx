import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJSON, postJSON } from '../api';
import Avatar from './Avatar.jsx';

function ChatWindow({ isOpen, onClose, targetUser }) {
  console.log('ChatWindow props:', { isOpen, targetUser });
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [messagePollingInterval, setMessagePollingInterval] = useState(null);
  const [typingInterval, setTypingInterval] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesContainerRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Get current user ID from localStorage or user data
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || user._id;
    console.log('ChatWindow - Setting currentUserId:', userId, 'from user:', user);
    setCurrentUserId(userId);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

    // Cleanup polling when component unmounts or chat closes
  useEffect(() => {
    return () => {
      stopMessagePolling();
    };
  }, []);

  // Stop polling when chat closes
  useEffect(() => {
    if (!isOpen) {
      stopMessagePolling();
    }
  }, [isOpen]);

  // Efecto para cargar conversaciones cuando se abre el chat
  useEffect(() => {
    console.log('useEffect targetUser:', { isOpen, targetUser, isCreatingConversation });
    
    if (isOpen && targetUser && !isCreatingConversation) {
      console.log('Creating new conversation with:', targetUser);
      createConversationWithUser(targetUser);
    }
  }, [isOpen, targetUser]); // Solo depende de isOpen y targetUser

  const loadConversations = async () => {
    try {
      const response = await getJSON('/dm');
      setConversations(response.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadMessages = async (conversationId) => {
    setLoading(true);
    try {
      const response = await getJSON(`/dm/${conversationId}/messages`);
      console.log('Raw messages from backend:', response.messages?.length);
      if (response.messages?.length > 0) {
        console.log('First message created_at:', response.messages[0].created_at);
        console.log('Last message created_at:', response.messages[response.messages.length - 1].created_at);
      }
      
      // Ordenar mensajes por fecha (más viejos primero)
      const sortedMessages = (response.messages || []).sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt).getTime();
        const dateB = new Date(b.created_at || b.createdAt).getTime();
        return dateA - dateB; // Ascendente: viejos primero
      });
      
      console.log('After sorting - First:', sortedMessages[0]?.created_at, 'Last:', sortedMessages[sortedMessages.length - 1]?.created_at);
      setMessages(sortedMessages);
      setActiveConversation(conversationId);
      
      // Start polling for new messages
      startMessagePolling(conversationId);
      
      // Scroll to bottom after loading messages
      setTimeout(() => scrollToBottom(), 100);
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
    
    // Poll for new messages and typing indicators every 2 seconds
    const interval = setInterval(async () => {
      try {
        // Poll messages
        const messagesResponse = await getJSON(`/dm/${conversationId}/messages`);
        const newMessages = messagesResponse.messages || [];
        
        // Only update if there are new messages
        setMessages(currentMessages => {
          if (newMessages.length !== currentMessages.length) {
            console.log('New messages received:', newMessages.length - currentMessages.length);
            // Ordenar mensajes por fecha (más viejos primero)
            const sortedMessages = [...newMessages].sort((a, b) => {
              const dateA = new Date(a.created_at || a.createdAt).getTime();
              const dateB = new Date(b.created_at || b.createdAt).getTime();
              return dateA - dateB; // Ascendente: viejos primero
            });
            return sortedMessages;
          }
          return currentMessages;
        });

        // Poll typing indicators
        const typingResponse = await getJSON(`/dm/${conversationId}/typing`);
        setOtherUserTyping(typingResponse.typingUsers?.length > 0);
        
      } catch (err) {
        console.error('Failed to poll messages/typing:', err);
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

  const handleTyping = async () => {
    if (!activeConversation) return;
    
    try {
      // Send typing indicator
      await postJSON(`/dm/${activeConversation}/typing`, {});
      
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Set new timeout to stop typing indicator after 3 seconds
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 3000);
      
      setTypingTimeout(timeout);
      setIsTyping(true);
    } catch (err) {
      console.error('Failed to send typing indicator:', err);
    }
  };

  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear immediately for better UX

    try {
      await postJSON(`/dm/${activeConversation}/messages`, {
        body: messageText
      });
      
      // Immediately reload messages to show the new one
      const response = await getJSON(`/dm/${activeConversation}/messages`);
      // Ordenar mensajes por fecha (más viejos primero)
      const sortedMessages = (response.messages || []).sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt).getTime();
        const dateB = new Date(b.created_at || b.createdAt).getTime();
        return dateA - dateB; // Ascendente: viejos primero
      });
      console.log('After sending - Messages sorted:', sortedMessages.length);
      setMessages(sortedMessages);
      
    } catch (err) {
      console.error('Failed to send message:', err);
      // Restore message on error
      setNewMessage(messageText);
    }
  };

  const startNewChat = async (userId) => {
    try {
      const response = await postJSON('/dm', { userId });
      const conversationId = response.conversationId;
      loadMessages(conversationId);
      loadConversations(); // Refresh conversations list
    } catch (err) {
      console.error('Failed to start chat:', err);
    }
  };

  const createConversationWithUser = async (username) => {
    if (isCreatingConversation) {
      console.log('Already creating conversation, skipping...');
      return;
    }
    
    console.log('createConversationWithUser called with:', username);
    setIsCreatingConversation(true);
    
    try {
      // Primero obtener el ID del usuario por username
      console.log('Getting user ID for:', username);
      const userResponse = await getJSON(`/users/${username}`);
      console.log('User response:', userResponse);
      
      // Check different possible response structures
      const userId = userResponse._id || userResponse.user?._id || userResponse.id || userResponse.user?.id;
      console.log('User ID found:', userId);
      
      if (!userId) {
        console.error('No user ID found in response:', userResponse);
        return;
      }
      
      // Crear conversación con el userId
      console.log('Creating conversation with userId:', userId);
      const response = await postJSON('/dm', { userId });
      console.log('Conversation created:', response);
      const conversationId = response.conversationId;
      setActiveConversation(conversationId);
      loadMessages(conversationId);
      loadConversations(); // Refresh conversations list
    } catch (err) {
      console.error('Failed to create conversation:', err);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 60%, 100% { 
              opacity: 0.3; 
              transform: scale(0.8); 
            }
            30% { 
              opacity: 1; 
              transform: scale(1); 
            }
          }
        `}
      </style>
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '20px',
        width: '80%',
        maxWidth: '800px',
        height: '70%',
        display: 'flex',
        overflow: 'hidden',
        boxShadow: '0 20px 60px var(--shadow-color)',
        border: '1px solid var(--border-color)'
      }}>
        {/* Conversations List */}
        <div style={{
          width: '300px',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-secondary)'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-card)'
          }}>
            <h3 style={{ margin: 0, color: 'var(--primary)' }}>Mensajes</h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
            >
              ✕
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-secondary)'
              }}>
                No conversations yet
              </div>
            ) : (
              conversations
                .filter(conv => {
                  // Filtrar conversaciones sin participantes válidos
                  if (!conv.participants || conv.participants.length === 0) return false;
                  const otherParticipant = conv.participants.find(p => p._id !== currentUserId);
                  return otherParticipant && otherParticipant.username;
                })
                .map(conv => {
                  // Find the other participant (not the current user)
                  const otherParticipant = conv.participants.find(p => p._id !== currentUserId);
                  
                  return (
                    <div
                      key={conv.conversation}
                      onClick={() => {
                        setActiveConversation(conv.conversation);
                        loadMessages(conv.conversation);
                      }}
                      style={{
                        padding: '15px 20px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color)',
                        background: activeConversation === conv.conversation ? 'var(--bg-hover)' : 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'background 0.2s'
                      }}
                    >
                      <Avatar 
                        username={otherParticipant?.username} 
                        size={40}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: '600', 
                          marginBottom: '4px',
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {otherParticipant?.username}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {otherParticipant?.firstName && otherParticipant?.lastName 
                            ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
                            : 'Click to chat'}
                        </div>
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
          flexDirection: 'column'
        }}>
          {activeConversation ? (
            <>
              {/* Messages Header */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {(() => {
                  const activeConv = conversations.find(conv => conv.conversation === activeConversation);
                  const otherParticipant = activeConv?.participants?.find(p => p._id !== currentUserId);
                  return (
                    <>
                      <Avatar 
                        username={otherParticipant?.username || 'Unknown'} 
                        size={40}
                      />
                      <h4 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: '600' }}>
                        @{otherParticipant?.username || 'Unknown User'}
                      </h4>
                    </>
                  );
                })()}
              </div>

              {/* Messages List */}
              <div 
                ref={messagesContainerRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--bg-primary)'
                }}
              >
                {loading ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                    ⏳ Cargando mensajes...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                    📭 No hay mensajes aún. ¡Empieza la conversación!
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => {
                      const isMine = String(message.sender) === String(currentUserId) || 
                                     String(message.sender?._id) === String(currentUserId);
                      
                      // Log solo el primer mensaje para ver estructura
                      if (index === 0) {
                        console.log('First message structure:', message);
                        console.log('Available date fields:', {
                          createdAt: message.createdAt,
                          created_at: message.created_at,
                          timestamp: message.timestamp,
                          date: message.date,
                          _id: message._id
                        });
                      }
                      
                      return (
                      <div
                        key={message._id}
                        style={{
                          marginBottom: '15px',
                          display: 'flex',
                          justifyContent: isMine ? 'flex-end' : 'flex-start',
                          animation: 'fadeIn 0.3s ease-in'
                        }}
                      >
                        <div style={{
                          maxWidth: '70%',
                          padding: '12px 16px',
                          borderRadius: '18px',
                          background: isMine 
                            ? 'linear-gradient(135deg, #A77693, #174871)'
                            : 'var(--bg-tertiary)',
                          color: isMine ? 'white' : 'var(--text-primary)',
                          boxShadow: '0 2px 8px var(--shadow-color)',
                          wordWrap: 'break-word'
                        }}>
                        <div>{message.body}</div>
                        {/* Timestamp para debug */}
                        <div style={{ 
                          fontSize: '10px', 
                          opacity: 0.6, 
                          marginTop: '4px',
                          textAlign: isMine ? 'right' : 'left'
                        }}>
                          {new Date(message.created_at || message.createdAt).toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                        
                        {/* Mostrar post compartido si existe */}
                        {message.shared_post && (
                          <div style={{
                            marginTop: '10px',
                            padding: '12px',
                            border: isMine 
                              ? '1px solid rgba(255,255,255,0.3)' 
                              : '1px solid var(--border-color)',
                            borderRadius: '12px',
                            background: isMine 
                              ? 'rgba(255,255,255,0.15)' 
                              : 'var(--bg-hover)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onClick={() => {
                            const postId = typeof message.shared_post === 'object' ? message.shared_post._id : message.shared_post;
                            onClose(); // Cerrar el chat
                            navigate(`/p/${postId}`); // Navegar al post
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.02)';
                            e.target.style.boxShadow = '0 4px 12px var(--shadow-color)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = 'none';
                          }}
                          >
                            <div style={{ 
                              fontSize: '12px', 
                              opacity: 0.9, 
                              marginBottom: '8px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px',
                              fontWeight: '600'
                            }}>
                              📎 Publicación compartida
                              {typeof message.shared_post === 'object' && message.shared_post.user && (
                                <span>de @{message.shared_post.user.username || 'usuario'}</span>
                              )}
                            </div>
                            
                            {/* Mostrar texto de la publicación si está disponible */}
                            {typeof message.shared_post === 'object' && message.shared_post.text && (
                              <div style={{ 
                                fontSize: '13px', 
                                color: isMine ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)',
                                marginBottom: '8px',
                                fontStyle: 'italic',
                                maxHeight: '60px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: '1.4'
                              }}>
                                "{message.shared_post.text.substring(0, 100)}{message.shared_post.text.length > 100 ? '...' : ''}"
                              </div>
                            )}
                            
                            <div style={{ 
                              fontSize: '11px', 
                              color: isMine ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)',
                              textAlign: 'center',
                              marginTop: '8px'
                            }}>
                              👆 Haz clic para ver la publicación completa
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                    })}
                  </>
                )}
                
                {/* Typing Indicator */}
                {otherUserTyping && (
                  <div style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '4px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }}></div>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        animation: 'pulse 1.5s ease-in-out infinite 0.2s'
                      }}></div>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary)',
                        animation: 'pulse 1.5s ease-in-out infinite 0.4s'
                      }}></div>
                    </div>
                    escribiendo...
                  </div>
                )}
              </div>

              {/* Send Message Form */}
              <form onSubmit={sendMessage} style={{
                padding: '20px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '10px',
                background: 'var(--bg-card)'
              }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleMessageChange}
                  placeholder="Escribe un mensaje..."
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '1px solid var(--input-border)',
                    borderRadius: '25px',
                    outline: 'none',
                    fontSize: '14px',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--input-border)'}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  style={{
                    background: newMessage.trim() 
                      ? 'linear-gradient(135deg, #A77693, #174871)' 
                      : 'var(--bg-tertiary)',
                    color: newMessage.trim() ? 'white' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '25px',
                    padding: '12px 24px',
                    cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    boxShadow: newMessage.trim() ? '0 4px 12px var(--shadow-color)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (newMessage.trim()) {
                      e.target.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  📤 Enviar
                </button>
              </form>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              gap: '16px',
              padding: '40px'
            }}>
              <div style={{ fontSize: '48px' }}>💬</div>
              <div style={{ fontSize: '16px', textAlign: 'center' }}>
                Selecciona una conversación para comenzar a chatear
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

export default ChatWindow;