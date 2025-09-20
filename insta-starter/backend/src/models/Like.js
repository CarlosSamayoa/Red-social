import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;
const LikeSchema = new Schema({
  post: { type: Types.ObjectId, ref: 'Publication', required: true },
  user: { type: Types.ObjectId, ref: 'User', required: true },
  created_at: { type: Date, default: Date.now }
}, { versionKey: false });
LikeSchema.index({ post: 1, user: 1 }, { unique: true });
export default model('Like', LikeSchema);
