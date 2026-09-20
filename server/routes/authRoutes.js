const express = require('express');
const { protect } = require('../middleware/auth');
const { login, logout, getMe, changePassword, updateProfile } = require('../controllers/authController');

const router = express.Router();

// No public /register - accounts are created by an admin (see adminRoutes.js)
// or, for the very first admin account, via /api/admin/bootstrap.
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.put('/profile', protect, updateProfile);

module.exports = router;
