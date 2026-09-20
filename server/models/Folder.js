const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Folder name is required'], trim: true },
    parentFolderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    // Present only once the folder has been shared; a random token, not the
    // folder's own _id, so a share link can be revoked/rotated independently
    // of the folder itself and doesn't reveal the internal document id.
    shareToken: { type: String, default: null, index: true, unique: true, sparse: true },
  },
  { timestamps: true }
);

folderSchema.index({ userId: 1, parentFolderId: 1, name: 1 });

module.exports = mongoose.model('Folder', folderSchema);
