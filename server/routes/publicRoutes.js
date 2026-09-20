const express = require('express');
const { getSharedFolder, streamSharedDocument, downloadSharedDocument } = require('../controllers/publicController');

const router = express.Router();

// Deliberately no `protect` middleware anywhere in this file - these routes
// exist specifically to be reachable without logging in. Access control is
// entirely the share token in the URL, checked fresh on every request in
// publicController.js.
router.get('/folders/:token', getSharedFolder);
router.get('/documents/:token/:id/file', streamSharedDocument);
router.get('/documents/:token/:id/download', downloadSharedDocument);

module.exports = router;
