// routes/groups.js
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Group   = require('../models/Group');

// GET /api/groups/my — faculty gets groups they head
router.get('/my', protect, authorize('faculty'), async (req, res) => {
  try {
    const groups = await Group.find({ headFaculty: req.user._id, isActive: true })
      .populate({ path: 'students', populate: { path: 'user', select: 'name' } })
      .sort('-createdAt');
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
