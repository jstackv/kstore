const fs = require('fs');
const fileCache = require('../utils/fileCache');
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


// RFC 5987 encoded filename so non-ASCII names never crash the header
const contentDisposition = (type, filename) => {
  const fallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
};

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

  // Keep a local copy so the first view is instant (best effort)
  fileCache.save(document._id, req.file.buffer).catch(() => {});

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
  // Images get an optimised delivery URL (auto format/quality, max 2000px wide) so they open almost instantly
  const previewUrl =
    document.resourceType === 'image'
      ? document.fileUrl.replace('/upload/', '/upload/f_auto,q_auto,w_2000,c_limit/')
      : null;
  res.json({ success: true, url: document.fileUrl, previewUrl, fileType: document.fileType, mimeType: document.mimeType });
});


// Sends the file from the local cache (filling it from storage first if needed).
const serveDocument = async (document, res, disposition) => {
  const result = await fileCache.ensure(document._id, document.fileUrl);
  if (!result.ok) {
    const detail = result.statusCode
      ? `Storage returned ${result.statusCode}. If PDFs fail to open, enable "PDF and ZIP files delivery" in Cloudinary (Settings → Security).`
      : `Could not reach file storage (${result.error?.code || result.error?.message || 'unknown error'}). Check the server's internet connection.`;
    if (result.error) console.error('Could not fetch file from storage:', result.error.code || '', result.error.message);
    return res.status(502).json({ success: false, message: detail });
  }

  const file = fileCache.filePath(document._id);
  const { size } = await fs.promises.stat(file);
  res.setHeader('Content-Type', document.mimeType);
  res.setHeader('Content-Length', size);
  res.setHeader('Content-Disposition', contentDisposition(disposition, document.originalName));
  if (disposition === 'inline') res.setHeader('Cache-Control', 'private, max-age=86400');
  fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
};

// @route GET /api/documents/:id/file
// Streams the file for in-browser viewing (Content-Disposition: inline, no download prompt).
const streamDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  await serveDocument(document, res, 'inline');
});

// @route POST /api/documents/:id/warm
// Fire-and-forget: start caching a file so it opens instantly when the user clicks View
const warmDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
  fileCache.ensure(document._id, document.fileUrl); // intentionally not awaited
  res.status(202).json({ success: true });
});

// @route GET /api/documents/:id/download
// Streams the file through our server so the original filename is preserved on download
const downloadDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  await serveDocument(document, res, 'attachment');
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
  fileCache.remove(document._id);

  req.user.storageUsed = Math.max(0, req.user.storageUsed - document.fileSize);
  await req.user.save();

  res.json({ success: true, message: 'Document deleted' });
});

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  viewDocument,
  streamDocument,
  warmDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
};
