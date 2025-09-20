import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;
const MessageSchema = new Schema({
  conversation: { type: Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: Types.ObjectId, ref: 'User', required: true },
  body: String,
  media_s3_key: String,
  shared_post: { type: Types.ObjectId, ref: 'Publication' },
  created_at: { type: Date, default: Date.now }
}, { versionKey:false });
MessageSchema.index({ conversation: 1, created_at: -1 });
export default model('Message', MessageSchema);
