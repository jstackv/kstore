const express = require('express');
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  logout,
  getMe,
  changePassword,
  updateProfile,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.put('/profile', protect, updateProfile);

module.exports = router;
