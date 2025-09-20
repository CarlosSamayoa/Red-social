import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;

const FriendRequestSchema = new Schema({
  sender: { type: Types.ObjectId, ref: 'User', required: true },      // quien envía la solicitud
  receiver: { type: Types.ObjectId, ref: 'User', required: true },   // quien recibe la solicitud
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'declined'], 
    default: 'pending' 
  },
  created_at: { type: Date, default: Date.now },
  responded_at: { type: Date }
}, { versionKey: false });

// Índice único para evitar solicitudes duplicadas
FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

// Índices para consultas eficientes
FriendRequestSchema.index({ receiver: 1, status: 1 });
FriendRequestSchema.index({ sender: 1, status: 1 });

export default model('FriendRequest', FriendRequestSchema);