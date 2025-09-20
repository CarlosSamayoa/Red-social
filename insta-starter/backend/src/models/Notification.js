import mongoose from 'mongoose';
const { Schema, model, Types } = mongoose;
const NotificationSchema = new Schema({
  user: { type: Types.ObjectId, ref: 'User', required: true }, // receptor
  kind: { type: String, enum: ['follow','like','comment','mention','message'], required: true },
  actor: { type: Types.ObjectId, ref: 'User' },
  entity: { type: String, enum: ['post','comment','follow','message'] },
  entity_id: { type: Types.ObjectId },
  is_read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
}, { versionKey: false });
NotificationSchema.index({ user: 1, created_at: -1 });
export default model('Notification', NotificationSchema);
