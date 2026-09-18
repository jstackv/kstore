const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null, index: true },
    name: { type: String, required: true, trim: true }, // display name, editable
    originalName: { type: String, required: true }, // original uploaded filename
    fileUrl: { type: String, required: true }, // secure delivery URL (may be signed)
    storageKey: { type: String, required: true }, // Cloudinary public_id
    fileType: { type: String, required: true }, // extension, e.g. 'pdf'
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true }, // bytes
    resourceType: { type: String, required: true }, // cloudinary resource_type: image | raw
  },
  { timestamps: true }
);

documentSchema.index({ userId: 1, name: 'text' });

module.exports = mongoose.model('Document', documentSchema);
