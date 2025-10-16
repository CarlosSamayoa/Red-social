import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
const { Schema, model, Types } = mongoose;
const VariantSchema = new Schema({
  kind: String, s3_key: String, width: Number, height: Number
}, { _id: false });

const MediaItemSchema = new Schema({
  s3_key_original: { type: String, required: true },
  mime: String, 
  width: Number, 
  height: Number, 
  size_bytes: Number,
  duration: Number, // Para videos
  variants: [VariantSchema],
  filter: { type: String, default: 'original' }, // Filtro CSS para esta imagen específica
  media_type: { type: String, enum: ['image', 'video'], default: 'image' }
}, { _id: false });

const PublicationSchema = new Schema({
  user: { type: Types.ObjectId, ref: 'User', required: true },
  text: String,
  location: String,
  // Soporte legacy para publicaciones antiguas con un solo archivo
  file: {
    s3_key_original: String,
    mime: String, width: Number, height: Number, size_bytes: Number,
    variants: [VariantSchema]
  },
  filter: { type: String, default: 'original' }, // Filtro legacy
  // Nuevo campo para múltiples archivos (imágenes/videos)
  media: [MediaItemSchema],
  created_at: { type: Date, default: Date.now }
}, { versionKey: false });
PublicationSchema.plugin(mongoosePaginate);
PublicationSchema.index({ user: 1, created_at: -1 });
PublicationSchema.index({ created_at: -1 }); // Para feed general
export default model('Publication', PublicationSchema);
