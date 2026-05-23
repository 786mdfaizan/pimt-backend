const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createNotice, getNotices, deleteNotice } = require('../controllers/attendanceController');

router.use(protect);

// Anyone logged in can view notices (all roles)
router.get('/', getNotices);

// Only admin and faculty can POST notices
// (counselor and marketing are view-only — enforced on frontend too)
router.post('/',    authorize('admin', 'faculty'), createNotice);
router.delete('/:id', authorize('admin'),          deleteNotice);

module.exports = router;