const express = require('express');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  uploadDocument,
  getDocuments,
  getDocument,
  viewDocument,
  streamDocument,
  warmDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
} = require('../controllers/documentController');

const router = express.Router();

router.use(protect);

router.post('/upload', upload.single('file'), uploadDocument);
router.get('/', getDocuments);
router.get('/:id', getDocument);
router.get('/:id/view', viewDocument);
router.get('/:id/file', streamDocument);
router.post('/:id/warm', warmDocument);
router.get('/:id/download', downloadDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

module.exports = router;
