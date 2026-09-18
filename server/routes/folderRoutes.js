const express = require('express');
const { protect } = require('../middleware/auth');
const {
  createFolder,
  getFolders,
  getFolder,
  updateFolder,
  deleteFolder,
} = require('../controllers/folderController');

const router = express.Router();

router.use(protect);

router.post('/', createFolder);
router.get('/', getFolders);
router.get('/:id', getFolder);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);

module.exports = router;
