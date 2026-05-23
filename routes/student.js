// routes/student.js
const express = require('express');
const router  = express.Router();
const https   = require('https');
const http    = require('http');
const { protect, authorize } = require('../middleware/auth');
const Student = require('../models/Student');
const User    = require('../models/User');
const { generateICard } = require('../utils/pdfGenerator');
const { upload, uploadToR2 } = require('../middleware/upload');

router.use(protect, authorize('student'));

// Helper — download photo from URL into a Buffer
function fetchImageBuffer(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const client = url.startsWith('https') ? https : http;
    client.get(url, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

// GET /api/student/profile
router.get('/profile', async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    res.json({ student, user: req.user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/student/profile
router.patch('/profile', async (req, res) => {
  try {
    const allowed = ['bloodGroup', 'address', 'guardianName', 'guardianPhone'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    const student = await Student.findOneAndUpdate(
      { user: req.user._id }, updates, { new: true }
    );
    res.json({ message: 'Profile updated', student });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/student/photo
router.post('/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(req.file.mimetype))
      return res.status(400).json({ message: 'Only JPG, PNG or WEBP images are allowed' });
    if (req.file.size > 2 * 1024 * 1024)
      return res.status(400).json({ message: 'Photo must be under 2MB' });

    const photoUrl = await uploadToR2(req.file, 'student-photos');
    await User.findByIdAndUpdate(req.user._id, { profilePhoto: photoUrl });
    res.json({ message: 'Photo updated', photoUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/student/icard — generate PDF with student's photo embedded
router.get('/icard', async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student record not found' });

    // Fetch profile photo as buffer so it embeds in PDF
    const photoBuffer = await fetchImageBuffer(req.user.profilePhoto);

    const pdfBuffer = await generateICard(student, req.user, photoBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="icard-${student.rollNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/student/admission-form
router.get('/admission-form', async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    res.json({ student, user: req.user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;