import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const ConversationSchema = new Schema({ created_at: { type: Date, default: Date.now } }, { versionKey:false });
export default model('Conversation', ConversationSchema);
