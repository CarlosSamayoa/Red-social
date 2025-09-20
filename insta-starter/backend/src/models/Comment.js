import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;
const CommentSchema = new Schema({
  post: { type: Types.ObjectId, ref: 'Publication', required: true },
  user: { type: Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
}, { versionKey: false });
CommentSchema.index({ post: 1, created_at: -1 });
export default model('Comment', CommentSchema);
