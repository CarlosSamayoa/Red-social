import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import FriendRequest from '../models/FriendRequest.js';
import User from '../models/User.js';

const router = express.Router();

// Enviar solicitud de amistad
router.post('/send', requireAuth, async (req, res) => {
  console.log('📤 POST /api/friends/send - Solicitud recibida');
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    // Buscar el usuario receptor
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // No puedes enviarte solicitud a ti mismo
    if (receiver._id.toString() === senderId) {
      return res.status(400).json({ error: 'No puedes enviarte una solicitud a ti mismo' });
    }

    // Verificar si ya existe una solicitud pendiente
    const existingRequest = await FriendRequest.findOne({
      sender: senderId,
      receiver: receiver._id,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Ya existe una solicitud pendiente' });
    }

    // Verificar si ya son amigos (solicitud aceptada)
    const existingFriendship = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiver._id, status: 'accepted' },
        { sender: receiver._id, receiver: senderId, status: 'accepted' }
      ]
    });

    if (existingFriendship) {
      return res.status(400).json({ error: 'Ya son amigos' });
    }

    // Crear nueva solicitud
    const friendRequest = new FriendRequest({
      sender: senderId,
      receiver: receiver._id
    });

    await friendRequest.save();

    // Poblar información del sender para la respuesta
    await friendRequest.populate('sender', 'username name email');

    res.json({ 
      message: 'Solicitud de amistad enviada',
      friendRequest 
    });

  } catch (error) {
    console.error('Error sending friend request:', error);
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
    .populate('sender', 'username name email')
    .sort({ created_at: -1 });

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
    .populate('receiver', 'username name email')
    .sort({ created_at: -1 });

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

    await friendRequest.populate('sender', 'username name email');

    res.json({ 
      message: action === 'accept' ? 'Solicitud aceptada' : 'Solicitud rechazada',
      friendRequest 
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
    .populate('sender', 'username name email')
    .populate('receiver', 'username name email');

    // Extraer la información del amigo (no el usuario actual)
    const friends = friendships.map(friendship => {
      if (friendship.sender._id.toString() === userId) {
        return friendship.receiver;
      } else {
        return friendship.sender;
      }
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