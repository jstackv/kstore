const Document = require('../models/Document');
const Folder = require('../models/Folder');
const asyncHandler = require('../utils/asyncHandler');

// @route GET /api/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const [totalDocuments, totalFolders, recentDocuments] = await Promise.all([
    Document.countDocuments({ userId: req.user._id }),
    Folder.countDocuments({ userId: req.user._id }),
    Document.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(5),
  ]);

  res.json({
    success: true,
    stats: {
      totalDocuments,
      totalFolders,
      storageUsed: req.user.storageUsed,
    },
    recentDocuments,
  });
});

module.exports = { getDashboard };
