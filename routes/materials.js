// routes/materials.js
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadMaterial, getMaterials, getMyMaterials } = require('../controllers/attendanceController');

router.use(protect);

// Students view their own materials
router.get('/my', authorize('student'), getMyMaterials);

// Admin and faculty can view all and upload
// (counselor and marketing have no access — blocked here and hidden on frontend)
router.get('/',  authorize('admin', 'faculty'), getMaterials);
router.post('/', authorize('admin', 'faculty'), upload.single('file'), uploadMaterial);

module.exports = router;