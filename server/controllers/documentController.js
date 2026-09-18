const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const asyncHandler = require('../utils/asyncHandler');

// Cloudinary only knows image/video/raw - everything non-image goes up as 'raw'
const IMAGE_TYPES = new Set(['jpg', 'jpeg', 'png']);
const extFromMime = require('../middleware/upload').ALLOWED_MIME_TYPES;

const streamUpload = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

// @route POST /api/documents/upload
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file provided' });
  }

  const { folderId } = req.body;
  if (folderId) {
    const folder = await Folder.findOne({ _id: folderId, userId: req.user._id });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
  }

  const fileType = extFromMime[req.file.mimetype];
  const resourceType = IMAGE_TYPES.has(fileType) ? 'image' : 'raw';

  const result = await streamUpload(req.file.buffer, {
    resource_type: resourceType,
    folder: `kstore/${req.user._id}`,
    use_filename: true,
    unique_filename: true,
  });

  const document = await Document.create({
    userId: req.user._id,
    folderId: folderId || null,
    name: req.file.originalname,
    originalName: req.file.originalname,
    fileUrl: result.secure_url,
    storageKey: result.public_id,
    fileType,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    resourceType,
  });

  req.user.storageUsed += req.file.size;
  await req.user.save();

  res.status(201).json({ success: true, document });
});

// @route GET /api/documents?search=&fileType=&folderId=&sortBy=&order=
const getDocuments = asyncHandler(async (req, res) => {
  const { search, fileType, folderId, sortBy = 'createdAt', order = 'desc' } = req.query;

  const filter = { userId: req.user._id };
  if (folderId !== undefined) filter.folderId = folderId === 'null' || folderId === '' ? null : folderId;
  if (fileType) filter.fileType = fileType;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const sortField = ['name', 'fileSize', 'createdAt'].includes(sortBy) ? sortBy : 'createdAt';
  const sortOrder = order === 'asc' ? 1 : -1;

  const documents = await Document.find(filter).sort({ [sortField]: sortOrder });
  res.json({ success: true, documents, count: documents.length });
});

// @route GET /api/documents/:id
const getDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  res.json({ success: true, document });
});

// @route GET /api/documents/:id/view
// Returns a URL suitable for inline browser viewing
const viewDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  res.json({ success: true, url: document.fileUrl, fileType: document.fileType, mimeType: document.mimeType });
});

// @route GET /api/documents/:id/download
// Streams the file through our server so the original filename is preserved on download
const downloadDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  const downloadUrl = cloudinary.utils.private_download_url(document.storageKey, document.fileType, {
    resource_type: document.resourceType,
    type: 'upload',
    attachment: true,
  });

  const response = await fetch(document.fileUrl);
  if (!response.ok) {
    return res.status(502).json({ success: false, message: 'Failed to fetch file from storage' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
  res.setHeader('Content-Type', document.mimeType);
  const arrayBuffer = await response.arrayBuffer();
  res.send(Buffer.from(arrayBuffer));
});

// @route PUT /api/documents/:id  (rename / move)
const updateDocument = asyncHandler(async (req, res) => {
  const { name, folderId } = req.body;
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  if (folderId !== undefined) {
    if (folderId) {
      const folder = await Folder.findOne({ _id: folderId, userId: req.user._id });
      if (!folder) return res.status(404).json({ success: false, message: 'Target folder not found' });
    }
    document.folderId = folderId || null;
  }
  if (name && name.trim()) document.name = name.trim();

  await document.save();
  res.json({ success: true, document });
});

// @route DELETE /api/documents/:id
const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  await cloudinary.uploader.destroy(document.storageKey, { resource_type: document.resourceType });
  await document.deleteOne();

  req.user.storageUsed = Math.max(0, req.user.storageUsed - document.fileSize);
  await req.user.save();

  res.json({ success: true, message: 'Document deleted' });
});

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  viewDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
};
