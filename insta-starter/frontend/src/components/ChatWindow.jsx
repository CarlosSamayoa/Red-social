import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Get current user ID from localStorage or user data
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUserId(user.id);
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
      setMessages(response.messages || []);
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
            return newMessages;
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
      setMessages(response.messages || []);
      
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
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        width: '80%',
        maxWidth: '800px',
        height: '70%',
        display: 'flex',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Conversations List */}
        <div style={{
          width: '300px',
          borderRight: '1px solid #e0e0e0',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, color: '#174871' }}>Messages</h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#8e8e8e'
              }}>
                No conversations yet
              </div>
            ) : (
              conversations.map(conv => {
                // Find the other participant (not the current user)
                const otherParticipant = conv.participants?.find(p => p._id !== currentUserId);
                
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
                      borderBottom: '1px solid #f0f0f0',
                      background: activeConversation === conv.conversation ? '#f8f9fa' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <Avatar 
                      username={otherParticipant?.username || 'Unknown'} 
                      size={40}
                    />
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {otherParticipant?.username || 'Unknown User'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                        Click to chat
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
                borderBottom: '1px solid #e0e0e0',
                background: '#f8f9fa',
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
                      <h4 style={{ margin: 0, color: '#174871' }}>
                        {otherParticipant?.username || 'Unknown User'}
                      </h4>
                    </>
                  );
                })()}
              </div>

              {/* Messages List */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column-reverse'
              }}>
                {loading ? (
                  <div style={{ textAlign: 'center', color: '#8e8e8e' }}>
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#8e8e8e' }}>
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map(message => (
                    <div
                      key={message._id}
                      style={{
                        marginBottom: '15px',
                        display: 'flex',
                        justifyContent: message.sender === currentUserId ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        padding: '10px 15px',
                        borderRadius: '18px',
                        background: message.sender === currentUserId 
                          ? 'linear-gradient(135deg, #A77693, #174871)'
                          : '#f0f0f0',
                        color: message.sender === currentUserId ? 'white' : '#333'
                      }}>
                        {message.body}
                        
                        {/* Mostrar post compartido si existe */}
                        {message.shared_post && (
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
                            const postId = typeof message.shared_post === 'object' ? message.shared_post._id : message.shared_post;
                            onClose(); // Cerrar el chat
                            navigate(`/p/${postId}`); // Navegar al post
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                          >
                            <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              📎 Publicación compartida
                              {typeof message.shared_post === 'object' && message.shared_post.user && (
                                <span>de @{message.shared_post.user.username || 'usuario'}</span>
                              )}
                            </div>
                            
                            {/* Mostrar texto de la publicación si está disponible */}
                            {typeof message.shared_post === 'object' && message.shared_post.text && (
                              <div style={{ 
                                fontSize: '13px', 
                                color: message.sender === currentUserId ? '#e1e1e1' : '#555',
                                marginBottom: '8px',
                                fontStyle: 'italic',
                                maxHeight: '60px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                "{message.shared_post.text.substring(0, 100)}{message.shared_post.text.length > 100 ? '...' : ''}"
                              </div>
                            )}
                            
                            <div style={{ 
                              fontSize: '12px', 
                              color: message.sender === currentUserId ? '#c1c1c1' : '#777',
                              textAlign: 'center'
                            }}>
                              👆 Haz clic para ver la publicación completa
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                
                {/* Typing Indicator */}
                {otherUserTyping && (
                  <div style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    color: '#8e8e8e',
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
                        backgroundColor: '#8e8e8e',
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }}></div>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#8e8e8e',
                        animation: 'pulse 1.5s ease-in-out infinite 0.2s'
                      }}></div>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#8e8e8e',
                        animation: 'pulse 1.5s ease-in-out infinite 0.4s'
                      }}></div>
                    </div>
                    is typing...
                  </div>
                )}
              </div>

              {/* Send Message Form */}
              <form onSubmit={sendMessage} style={{
                padding: '20px',
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                gap: '10px'
              }}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleMessageChange}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '25px',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  style={{
                    background: newMessage.trim() 
                      ? 'linear-gradient(135deg, #A77693, #174871)' 
                      : '#e0e0e0',
                    color: newMessage.trim() ? 'white' : '#999',
                    border: 'none',
                    borderRadius: '25px',
                    padding: '12px 20px',
                    cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: '600'
                  }}
                >
                  Send
                </button>
              </form>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8e8e8e'
            }}>
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

export default ChatWindow;