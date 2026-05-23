// routes/subAdmin.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('teacher', 'consultant'));

// Sub-admin can view their own profile and update
router.get('/profile', (req, res) => res.json({ user: req.user }));

module.exports = router;