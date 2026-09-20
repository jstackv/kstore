const User = require('../models/User');
const Folder = require('../models/Folder');
const Document = require('../models/Document');
const cloudinary = require('../config/cloudinary');
const fileCache = require('../utils/fileCache');
const asyncHandler = require('../utils/asyncHandler');

// Permanently removes a user's documents (Cloudinary assets + Mongo records),
// their folders, and finally the user itself. Used by deleteUser below and
// nowhere else - deletion is total and not recoverable, by design (the
// person asked for deleted users' data to be permanently erased).
const cascadeDeleteUser = async (userId) => {
  const docs = await Document.find({ userId });
  for (const doc of docs) {
    try {
      await cloudinary.uploader.destroy(doc.storageKey, { resource_type: doc.resourceType });
    } catch (e) {
      console.error('Cloudinary delete failed for', doc.storageKey, e.message);
    }
    fileCache.remove(doc._id);
  }
  await Document.deleteMany({ userId });
  await Folder.deleteMany({ userId });
  await User.findByIdAndDelete(userId);
};

// @route GET /api/admin/users
const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, users: users.map((u) => u.toSafeObject()) });
});

// @route POST /api/admin/users
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(400).json({ success: false, message: 'An account with this email already exists' });
  }
  const user = await User.create({
    name,
    email,
    password,
    role: role === 'admin' ? 'admin' : 'user',
  });
  res.status(201).json({ success: true, user: user.toSafeObject() });
});

// @route PUT /api/admin/users/:id
// Rename, change email/role, or reset a user's password. All fields optional.
const updateUser = asyncHandler(async (req, res) => {
  const { name, email, role, password } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (role && role !== user.role && String(user._id) === String(req.user._id)) {
    return res.status(400).json({ success: false, message: "You can't change your own role" });
  }

  if (name && name.trim()) user.name = name.trim();
  if (email && email.trim()) {
    const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Another account already uses this email' });
    }
    user.email = email.trim();
  }
  if (role === 'admin' || role === 'user') user.role = role;
  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    user.password = password;
  }

  await user.save();
  res.json({ success: true, user: user.toSafeObject() });
});

// @route DELETE /api/admin/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({ success: false, message: "You can't delete your own account" });
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  await cascadeDeleteUser(user._id);
  res.json({ success: true, message: 'User and all their documents were permanently deleted' });
});

// @route POST /api/admin/bootstrap
// Unauthenticated, but self-limiting: only ever does anything if the
// database has zero users, which is only true before the very first admin
// has been created. This exists purely to bootstrap that first account,
// since normal user creation requires already being an admin.
const bootstrapAdmin = asyncHandler(async (req, res) => {
  const count = await User.countDocuments();
  if (count > 0) {
    return res.status(403).json({ success: false, message: 'Setup has already been completed' });
  }

  const name = process.env.ADMIN_NAME || 'Admin';
  const email = (process.env.ADMIN_EMAIL || 'admin@kstore.app').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@KStore2026!';

  const user = await User.create({ name, email, password, role: 'admin' });
  res.status(201).json({ success: true, message: 'Admin account created', user: user.toSafeObject() });
});

module.exports = { listUsers, createUser, updateUser, deleteUser, bootstrapAdmin };
