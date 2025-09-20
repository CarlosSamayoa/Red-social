import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;
const ConversationParticipantSchema = new Schema({
  conversation: { type: Types.ObjectId, ref: 'Conversation', required: true },
  user: { type: Types.ObjectId, ref: 'User', required: true }
}, { versionKey:false });
ConversationParticipantSchema.index({ conversation: 1, user: 1 }, { unique: true });
export default model('ConversationParticipant', ConversationParticipantSchema);
