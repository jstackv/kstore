const Folder = require('../models/Folder');
const Document = require('../models/Document');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { serveDocument } = require('./documentController');

// Every handler here is intentionally unauthenticated (no `protect`), so
// each one re-derives its own scope strictly from the share token in the
// URL - never from any other request state. A valid token grants access to
// exactly the one folder it was issued for, and only to documents that live
// directly in that folder. Nothing here should ever trust a folderId or
// documentId supplied by the client without first checking it against the
// folder resolved from the token.

const findSharedFolder = (token) => Folder.findOne({ shareToken: token });

// Public callers only get the fields a viewer needs - never the storage URL
// (which can be a signed Cloudinary link), the storage key or the owner's id.
// The file itself is only reachable through the token-checked /file and
// /download routes below.
const toPublicDocument = (d) => ({
  _id: d._id,
  name: d.name,
  fileType: d.fileType,
  mimeType: d.mimeType,
  fileSize: d.fileSize,
  createdAt: d.createdAt,
});

// @route GET /api/public/folders/:token
const getSharedFolder = asyncHandler(async (req, res) => {
  const folder = await findSharedFolder(req.params.token);
  if (!folder) {
    return res.status(404).json({ success: false, message: 'This link is invalid or has been revoked' });
  }
  const documents = await Document.find({ folderId: folder._id }).sort({ createdAt: -1 });

  // Show who shared it (name only). Purely cosmetic, so a lookup failure must
  // never break the page.
  let sharedBy = null;
  try {
    const owner = await User.findById(folder.userId).select('name');
    sharedBy = owner?.name || null;
  } catch {
    /* ignore */
  }

  res.set('X-Robots-Tag', 'noindex, nofollow'); // keep share links out of search engines
  res.json({
    success: true,
    folder: { id: folder._id, name: folder.name, sharedBy, createdAt: folder.createdAt },
    documents: documents.map(toPublicDocument),
  });
});

// Resolves a document only if it belongs to the folder the token points at.
// Returns null (never throws) so callers can respond with a plain 404 -
// the caller must not distinguish "bad token" from "bad document id" in its
// response, or that becomes an oracle for probing document ids.
const resolveSharedDocument = async (token, documentId) => {
  const folder = await findSharedFolder(token);
  if (!folder) return null;
  return Document.findOne({ _id: documentId, folderId: folder._id });
};

// @route GET /api/public/documents/:token/:id/file
const streamSharedDocument = asyncHandler(async (req, res) => {
  const document = await resolveSharedDocument(req.params.token, req.params.id);
  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  await serveDocument(document, res, 'inline');
});

// @route GET /api/public/documents/:token/:id/download
const downloadSharedDocument = asyncHandler(async (req, res) => {
  const document = await resolveSharedDocument(req.params.token, req.params.id);
  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  await serveDocument(document, res, 'attachment');
});

module.exports = { getSharedFolder, streamSharedDocument, downloadSharedDocument };
