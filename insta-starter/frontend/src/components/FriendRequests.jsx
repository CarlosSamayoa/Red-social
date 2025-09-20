import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import { getJSON, postJSON, deleteJSON } from '../api';

function FriendRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received'); // 'received', 'sent', 'friends'

  useEffect(() => {
    loadFriendData();
  }, []);

  const loadFriendData = async () => {
    try {
      // Cargar solicitudes recibidas
      const receivedData = await getJSON('/friends/received');
      setRequests(Array.isArray(receivedData.requests) ? receivedData.requests : []);

      // Cargar solicitudes enviadas
      const sentData = await getJSON('/friends/sent');
      setSentRequests(Array.isArray(sentData.requests) ? sentData.requests : []);

      // Cargar lista de amigos
      const friendsData = await getJSON('/friends');
      setFriends(Array.isArray(friendsData.friends) ? friendsData.friends : []);

      setLoading(false);
    } catch (error) {
      console.error('Error loading friend data:', error);
      setRequests([]);
      setSentRequests([]);
      setFriends([]);
      setLoading(false);
    }
  };

  const handleRequest = async (requestId, action) => {
    try {
      await postJSON(`/friends/respond/${requestId}`, { action });
      // Recargar datos después de responder
      loadFriendData();
    } catch (error) {
      console.error('Error responding to friend request:', error);
    }
  };

  const sendFriendRequest = async (userId) => {
    try {
      await postJSON('/friends/send', { receiverId: userId });
      console.log('Friend request sent successfully');
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const unfriend = async (friendId) => {
    try {
      await deleteJSON(`/friends/unfriend/${friendId}`);
      loadFriendData();
    } catch (error) {
      console.error('Error unfriending:', error);
    }
  };

  const goToProfile = (username) => {
    navigate(`/users/${username}`);
  };

  if (loading) {
    return (
      <div className="friend-requests-loading">
        <div className="loading-spinner"></div>
        <p>Cargando solicitudes...</p>
      </div>
    );
  }

  return (
    <div className="friend-requests-container">
      <div className="friend-requests-header">
        <h2>Amigos</h2>
        <div className="friend-tabs">
          <button 
            className={`tab-button ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            Solicitudes ({requests.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            Enviadas ({sentRequests.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Amigos ({friends.length})
          </button>
        </div>
      </div>

      <div className="friend-requests-content">
        {activeTab === 'received' && (
          <div className="requests-list">
            {requests.length === 0 ? (
              <div className="empty-state">
                <p>No tienes solicitudes de amistad pendientes</p>
              </div>
            ) : (
              requests.map(request => (
                <div key={request._id} className="request-item">
                  <div className="request-user">
                    <Avatar 
                      username={request.sender.username}
                      name={request.sender.fullName}
                      size={50}
                    />
                    <div className="request-info">
                      <span className="username">{request.sender.username}</span>
                      <span className="full-name">{request.sender.fullName}</span>
                      <span className="request-time">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button 
                      className="accept-btn"
                      onClick={() => handleRequest(request._id, 'accept')}
                    >
                      Aceptar
                    </button>
                    <button 
                      className="decline-btn"
                      onClick={() => handleRequest(request._id, 'decline')}
                    >
                      Declinar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="requests-list">
            {sentRequests.length === 0 ? (
              <div className="empty-state">
                <p>No has enviado solicitudes de amistad</p>
              </div>
            ) : (
              sentRequests.map(request => (
                <div key={request._id} className="request-item">
                  <div className="request-user">
                    <Avatar 
                      username={request.receiver.username}
                      name={request.receiver.fullName}
                      size={50}
                    />
                    <div className="request-info">
                      <span className="username">{request.receiver.username}</span>
                      <span className="full-name">{request.receiver.fullName}</span>
                      <span className="request-status">
                        Estado: {request.status === 'pending' ? 'Pendiente' : request.status}
                      </span>
                    </div>
                  </div>
                  <div className="request-actions">
                    <span className="pending-status">Enviada</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="friends-list">
            {friends.length === 0 ? (
              <div className="empty-state">
                <p>Aún no tienes amigos. ¡Busca personas para agregar!</p>
              </div>
            ) : (
              friends.map(friend => (
                <div key={friend._id} className="friend-item">
                  <div 
                    className="friend-user"
                    onClick={() => goToProfile(friend.username)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Avatar 
                      username={friend.username}
                      name={friend.fullName}
                      size={50}
                    />
                    <div className="friend-info">
                      <span className="username">{friend.username}</span>
                      <span className="full-name">{friend.fullName}</span>
                    </div>
                  </div>
                  <div className="friend-actions">
                    <button 
                      className="unfriend-btn"
                      onClick={() => unfriend(friend._id)}
                    >
                      Eliminar amigo
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FriendRequests;