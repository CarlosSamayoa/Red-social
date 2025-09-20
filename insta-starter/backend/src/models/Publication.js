import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
const { Schema, model, Types } = mongoose;
const VariantSchema = new Schema({
  kind: String, s3_key: String, width: Number, height: Number
}, { _id: false });
const PublicationSchema = new Schema({
  user: { type: Types.ObjectId, ref: 'User', required: true },
  text: String,
  location: String,
  file: {
    s3_key_original: { type: String, required: true },
    mime: String, width: Number, height: Number, size_bytes: Number,
    variants: [VariantSchema]
  },
  created_at: { type: Date, default: Date.now }
}, { versionKey: false });
PublicationSchema.plugin(mongoosePaginate);
PublicationSchema.index({ user: 1, created_at: -1 });
PublicationSchema.index({ created_at: -1 }); // Para feed general
export default model('Publication', PublicationSchema);
