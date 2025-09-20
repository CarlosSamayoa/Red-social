import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;
const FollowSchema = new Schema({
  user: { type: Types.ObjectId, ref: 'User', required: true },      // follower
  followed: { type: Types.ObjectId, ref: 'User', required: true },  // followee
  created_at: { type: Date, default: Date.now }
}, { versionKey: false });
FollowSchema.index({ user: 1, followed: 1 }, { unique: true });
export default model('Follow', FollowSchema);
