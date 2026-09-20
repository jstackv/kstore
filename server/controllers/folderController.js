const crypto = require('crypto');
const Folder = require('../models/Folder');
const Document = require('../models/Document');
const asyncHandler = require('../utils/asyncHandler');

// @route POST /api/folders
const createFolder = asyncHandler(async (req, res) => {
  const { name, parentFolderId } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Folder name is required' });
  }

  if (parentFolderId) {
    const parent = await Folder.findOne({ _id: parentFolderId, userId: req.user._id });
    if (!parent) {
      return res.status(404).json({ success: false, message: 'Parent folder not found' });
    }
  }

  const folder = await Folder.create({
    userId: req.user._id,
    name: name.trim(),
    parentFolderId: parentFolderId || null,
  });

  res.status(201).json({ success: true, folder });
});

// @route GET /api/folders?parentFolderId=...
const getFolders = asyncHandler(async (req, res) => {
  const { parentFolderId } = req.query;
  const filter = { userId: req.user._id };
  filter.parentFolderId = parentFolderId || null;

  const folders = await Folder.find(filter).sort({ name: 1 });
  res.json({ success: true, folders });
});

// @route GET /api/folders/:id
const getFolder = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
  if (!folder) {
    return res.status(404).json({ success: false, message: 'Folder not found' });
  }
  const subfolders = await Folder.find({ userId: req.user._id, parentFolderId: folder._id }).sort({ name: 1 });
  const documents = await Document.find({ userId: req.user._id, folderId: folder._id }).sort({ createdAt: -1 });

  res.json({ success: true, folder, subfolders, documents });
});

// @route PUT /api/folders/:id
const updateFolder = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
  if (!folder) {
    return res.status(404).json({ success: false, message: 'Folder not found' });
  }
  if (name && name.trim()) folder.name = name.trim();
  await folder.save();
  res.json({ success: true, folder });
});

// @route DELETE /api/folders/:id
// Recursively deletes subfolders and their documents (Cloudinary assets included)
const deleteFolder = asyncHandler(async (req, res) => {
  const cloudinary = require('../config/cloudinary');
  const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
  if (!folder) {
    return res.status(404).json({ success: false, message: 'Folder not found' });
  }

  const collectFolderIds = async (rootId) => {
    let ids = [rootId];
    const children = await Folder.find({ userId: req.user._id, parentFolderId: rootId });
    for (const child of children) {
      ids = ids.concat(await collectFolderIds(child._id));
    }
    return ids;
  };

  const folderIds = await collectFolderIds(folder._id);
  const docs = await Document.find({ userId: req.user._id, folderId: { $in: folderIds } });

  for (const doc of docs) {
    try {
      await cloudinary.uploader.destroy(doc.storageKey, { resource_type: doc.resourceType });
    } catch (e) {
      console.error('Cloudinary delete failed for', doc.storageKey, e.message);
    }
  }

  const freedBytes = docs.reduce((sum, d) => sum + d.fileSize, 0);
  await Document.deleteMany({ userId: req.user._id, folderId: { $in: folderIds } });
  await Folder.deleteMany({ userId: req.user._id, _id: { $in: folderIds } });

  req.user.storageUsed = Math.max(0, req.user.storageUsed - freedBytes);
  await req.user.save();

  res.json({ success: true, message: 'Folder and its contents deleted' });
});

// @route POST /api/folders/:id/share
// Creates (or returns the existing) public share token for a folder.
// Idempotent: calling it again on an already-shared folder just returns the same link.
const createShareLink = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
  if (!folder) {
    return res.status(404).json({ success: false, message: 'Folder not found' });
  }
  if (!folder.shareToken) {
    folder.shareToken = crypto.randomBytes(20).toString('hex');
    await folder.save();
  }
  res.json({ success: true, shareToken: folder.shareToken });
});

// @route DELETE /api/folders/:id/share
// Revokes a folder's public link. The folder itself is untouched.
const revokeShareLink = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
  if (!folder) {
    return res.status(404).json({ success: false, message: 'Folder not found' });
  }
  folder.shareToken = null;
  await folder.save();
  res.json({ success: true, message: 'Link revoked' });
});

module.exports = { createFolder, getFolders, getFolder, updateFolder, deleteFolder, createShareLink, revokeShareLink };
