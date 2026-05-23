const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  receivePunch,
  syncAttendance,
  getLogs,
  getSettings,
  updateSettings,
} = require('../controllers/biometricController');

// Machine bridge calls this — no JWT, uses API key instead
router.post('/push', receivePunch);

// Admin/super-admin routes
router.get('/logs',      protect, authorize('admin'), getLogs);
router.post('/sync',     protect, authorize('admin'), syncAttendance);
router.get('/settings',  protect, authorize('admin'), getSettings);
router.put('/settings',  protect, authorize('admin'), updateSettings);

module.exports = router;