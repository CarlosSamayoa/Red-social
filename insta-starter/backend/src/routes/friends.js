import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Enviar solicitud de amistad
router.post('/send', requireAuth, async (req, res) => {
  console.log('📤 POST /api/friends/send - Solicitud recibida');
  console.log('📤 Body:', req.body);
  console.log('📤 User:', req.user);
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;
    
    console.log('📤 SenderId:', senderId, 'ReceiverId:', receiverId);

    // Buscar el usuario receptor
    const receiver = await User.findById(receiverId);
    console.log('📤 Receiver found:', receiver ? receiver.username : 'null');
    if (!receiver) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // No puedes enviarte solicitud a ti mismo
    if (receiver._id.toString() === senderId) {
      return res.status(400).json({ error: 'No puedes enviarte una solicitud a ti mismo' });
    }

    // Verificar si ya existe una solicitud pendiente
    console.log('📤 Checking existing request...');
    const existingRequest = await FriendRequest.findOne({
      sender: senderId,
      receiver: receiver._id,
      status: 'pending'
    });
    console.log('📤 Existing request:', existingRequest ? 'found' : 'none');

    if (existingRequest) {
      return res.status(400).json({ error: 'Ya existe una solicitud pendiente' });
    }

    // Verificar si ya son amigos (solicitud aceptada)
    console.log('📤 Checking existing friendship...');
    const existingFriendship = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiver._id, status: 'accepted' },
        { sender: receiver._id, receiver: senderId, status: 'accepted' }
      ]
    });
    console.log('📤 Existing friendship:', existingFriendship ? 'found' : 'none');

    if (existingFriendship) {
      return res.status(400).json({ error: 'Ya son amigos' });
    }

    // Crear nueva solicitud
    console.log('📤 Creating friend request...');
    const friendRequest = new FriendRequest({
      sender: senderId,
      receiver: receiver._id
    });

    await friendRequest.save();
    console.log('📤 Friend request saved:', friendRequest._id);

    // Poblar información del sender para la respuesta
    await friendRequest.populate('sender', 'username name email profile_image');
    console.log('📤 Populated sender:', friendRequest.sender?.username);
    
    // Mapear profile_image a image
    const friendRequestObj = friendRequest.toObject();
    if (friendRequestObj.sender && friendRequestObj.sender.profile_image) {
      friendRequestObj.sender.image = friendRequestObj.sender.profile_image;
    }

    // Crear notificación para el receptor
    console.log('📤 Creating notification...');
    await Notification.create({
      user: receiver._id,
      kind: 'follow',  // Usar 'follow' como tipo de notificación de amistad
      actor: senderId,
      entity: 'follow',
      entity_id: friendRequest._id
    });
    console.log('📤 Notification created');

    res.json({ 
      message: 'Solicitud de amistad enviada',
      friendRequest: friendRequestObj
    });

  } catch (error) {
    console.error('❌ Error sending friend request:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener solicitudes recibidas (pendientes)
router.get('/received', requireAuth, async (req, res) => {
  console.log('📥 GET /api/friends/received - Solicitud recibida');
  try {
    const userId = req.user._id;

    const requests = await FriendRequest.find({
      receiver: userId,
      status: 'pending'
    })
    .populate('sender', 'username name email profile_image')
    .sort({ created_at: -1 })
    .lean();
    
    // Mapear profile_image a image para compatibilidad con frontend
    requests.forEach(req => {
      if (req.sender && req.sender.profile_image) {
        req.sender.image = req.sender.profile_image;
      }
    });

    res.json({ requests });

  } catch (error) {
    console.error('Error fetching received requests:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener solicitudes enviadas
router.get('/sent', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await FriendRequest.find({
      sender: userId
    })
    .populate('receiver', 'username name email profile_image')
    .sort({ created_at: -1 })
    .lean();
    
    // Mapear profile_image a image
    requests.forEach(req => {
      if (req.receiver && req.receiver.profile_image) {
        req.receiver.image = req.receiver.profile_image;
      }
    });

    res.json({ requests });

  } catch (error) {
    console.error('Error fetching sent requests:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Responder a solicitud (aceptar/rechazar)
router.post('/respond/:requestId', requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' o 'decline'
    const userId = req.user._id;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Acción inválida' });
    }

    const friendRequest = await FriendRequest.findOne({
      _id: requestId,
      receiver: userId,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    // Actualizar estado
    friendRequest.status = action === 'accept' ? 'accepted' : 'declined';
    friendRequest.responded_at = new Date();

    await friendRequest.save();

    await friendRequest.populate('sender', 'username name email profile_image');
    
    // Mapear profile_image a image
    const friendRequestObj = friendRequest.toObject();
    if (friendRequestObj.sender && friendRequestObj.sender.profile_image) {
      friendRequestObj.sender.image = friendRequestObj.sender.profile_image;
    }

    // Si se acepta, crear notificación para quien envió la solicitud
    if (action === 'accept') {
      await Notification.create({
        user: friendRequest.sender._id,
        kind: 'follow',  // Usar 'follow' para aceptación de amistad
        actor: userId,
        entity: 'follow',
        entity_id: friendRequest._id
      });
    }

    res.json({ 
      message: action === 'accept' ? 'Solicitud aceptada' : 'Solicitud rechazada',
      friendRequest: friendRequestObj 
    });

  } catch (error) {
    console.error('Error responding to friend request:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener lista de amigos
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Buscar todas las solicitudes aceptadas donde el usuario esté involucrado
    const friendships = await FriendRequest.find({
      $or: [
        { sender: userId, status: 'accepted' },
        { receiver: userId, status: 'accepted' }
      ]
    })
    .populate('sender', 'username name email profile_image')
    .populate('receiver', 'username name email profile_image')
    .lean();

    // Extraer la información del amigo (no el usuario actual)
    const friends = friendships.map(friendship => {
      const friend = friendship.sender._id.toString() === userId.toString() 
        ? friendship.receiver 
        : friendship.sender;
      
      // Mapear profile_image a image
      if (friend.profile_image) {
        friend.image = friend.profile_image;
      }
      
      return friend;
    });

    res.json({ friends });

  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar amistad
router.delete('/unfriend/:friendId', requireAuth, async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user._id;

    const friendship = await FriendRequest.findOneAndDelete({
      $or: [
        { sender: userId, receiver: friendId, status: 'accepted' },
        { sender: friendId, receiver: userId, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Amistad no encontrada' });
    }

    res.json({ message: 'Amistad eliminada' });

  } catch (error) {
    console.error('Error unfriending:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;