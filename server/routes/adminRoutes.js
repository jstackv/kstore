const express = require('express');
const { protect, requireAdmin } = require('../middleware/auth');
const { listUsers, createUser, updateUser, deleteUser, bootstrapAdmin } = require('../controllers/adminController');

const router = express.Router();

// Unauthenticated on purpose - see bootstrapAdmin's own comment for why
// this is safe (it's a no-op once any user exists).
router.post('/bootstrap', bootstrapAdmin);

router.use(protect, requireAdmin);
router.get('/users', listUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
