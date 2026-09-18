const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Folder name is required'], trim: true },
    parentFolderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  },
  { timestamps: true }
);

folderSchema.index({ userId: 1, parentFolderId: 1, name: 1 });

module.exports = mongoose.model('Folder', folderSchema);
