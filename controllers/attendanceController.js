const Attendance      = require('../models/Attendance');
const StaffAttendance = require('../models/StaffAttendance');
const Student         = require('../models/Student');
const Notice          = require('../models/Notice');
const Group           = require('../models/Group');
const { Material }    = require('../models/index');
const { upload, uploadToR2 } = require('../middleware/upload');

// ═══════════════════════════════════════════
// STUDENT ATTENDANCE
// ═══════════════════════════════════════════

exports.getStudentAttendance = async (req, res) => {
  try {
    const records    = await Attendance.find({ student: req.params.studentId }).sort('-date');
    const total      = records.length;
    const present    = records.filter(r => r.status === 'present').length;
    const late       = records.filter(r => r.status === 'late').length;
    const absent     = records.filter(r => r.status === 'absent').length;
    const percentage = total > 0 ? (((present + late) / total) * 100).toFixed(1) : 0;
    res.json({ records, total, present, late, absent, percentage });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getMyAttendance = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student record not found' });
    const records    = await Attendance.find({ student: student._id }).sort('-date');
    const total      = records.length;
    const present    = records.filter(r => r.status === 'present').length;
    const late       = records.filter(r => r.status === 'late').length;
    const absent     = records.filter(r => r.status === 'absent').length;
    const percentage = total > 0 ? (((present + late) / total) * 100).toFixed(1) : 0;
    res.json({ records, total, present, late, absent, percentage });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ═══════════════════════════════════════════
// STAFF ATTENDANCE
// ═══════════════════════════════════════════

exports.getStaffAttendanceByDate = async (req, res) => {
  try {
    const d     = new Date(req.query.date || new Date());
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end   = new Date(d); end.setHours(23, 59, 59, 999);
    const records = await StaffAttendance.find({ date: { $gte: start, $lte: end } })
      .populate('user', 'name role')
      .sort('user');
    res.json(records);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getStaffAttendanceHistory = async (req, res) => {
  try {
    const records    = await StaffAttendance.find({ user: req.params.userId }).sort('-date');
    const total      = records.length;
    const present    = records.filter(r => r.status === 'present').length;
    const late       = records.filter(r => r.status === 'late').length;
    const absent     = records.filter(r => r.status === 'absent').length;
    const percentage = total > 0 ? (((present + late) / total) * 100).toFixed(1) : 0;
    res.json({ records, total, present, late, absent, percentage });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ═══════════════════════════════════════════
// NOTICES — Group-aware
// ═══════════════════════════════════════════

// POST /api/notices
exports.createNotice = async (req, res) => {
  try {
    const {
      title, content, category, pinned,
      targetAudience, targetGroups, expiresAt,
    } = req.body;

    // Faculty can only post to groups they head or to 'all'
    if (req.user.role === 'faculty' && targetAudience === 'groups') {
      const myGroups = await Group.find({ headFaculty: req.user._id, isActive: true }).select('_id');
      const myGroupIds = myGroups.map(g => g._id.toString());
      const requested  = (targetGroups || []).map(id => id.toString());
      const unauthorized = requested.filter(id => !myGroupIds.includes(id));
      if (unauthorized.length > 0)
        return res.status(403).json({ message: 'You can only post to groups you head' });
    }

    const notice = await Notice.create({
      title, content, category,
      pinned:         pinned || false,
      targetAudience: targetAudience || 'all',
      targetGroups:   targetAudience === 'groups' ? (targetGroups || []) : [],
      expiresAt,
      publishedBy:    req.user._id,
    });

    res.status(201).json(notice);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/notices
// Returns notices the current user is allowed to see
exports.getNotices = async (req, res) => {
  try {
    const role = req.user.role;
    let filter = { isActive: true };

    if (role === 'student') {
      const student = await Student.findOne({ user: req.user._id });
      const myGroups = student
        ? await Group.find({ students: student._id, isActive: true }).select('_id')
        : [];
      const myGroupIds = myGroups.map(g => g._id);

      filter.$or = [
        { targetAudience: 'all' },
        { targetAudience: 'groups', targetGroups: { $in: myGroupIds } },
      ];

    } else if (['faculty', 'counselor', 'marketing', 'office_staff'].includes(role)) {
      const myGroups = await Group.find({ headFaculty: req.user._id, isActive: true }).select('_id');
      const myGroupIds = myGroups.map(g => g._id);

      filter.$or = [
        { targetAudience: 'all' },
        { targetAudience: 'staff' },
        { targetAudience: 'groups', targetGroups: { $in: myGroupIds } },
      ];
    }
    // Admin sees all notices — no extra filter

    const notices = await Notice.find(filter)
      .populate('publishedBy', 'name role')
      .populate('targetGroups', 'name')
      .sort({ pinned: -1, createdAt: -1 });

    res.json(notices);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/notices/:id
exports.deleteNotice = async (req, res) => {
  try {
    await Notice.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Notice removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ═══════════════════════════════════════════
// STUDY MATERIALS — Group-aware
// ═══════════════════════════════════════════

// POST /api/materials
exports.uploadMaterial = async (req, res) => {
  try {
    const {
      title, description, subject, course, batch,
      targetAudience, targetGroups, isPublic,
    } = req.body;

    if (!req.file) return res.status(400).json({ message: 'File is required' });

    // Faculty can only share to their own groups
    if (req.user.role === 'faculty' && targetAudience === 'groups') {
      const myGroups    = await Group.find({ headFaculty: req.user._id, isActive: true }).select('_id');
      const myGroupIds  = myGroups.map(g => g._id.toString());
      const requested   = (targetGroups ? JSON.parse(targetGroups) : []).map(id => id.toString());
      const unauthorized = requested.filter(id => !myGroupIds.includes(id));
      if (unauthorized.length > 0)
        return res.status(403).json({ message: 'You can only share materials with your own groups' });
    }

    const fileUrl = await uploadToR2(req.file, 'materials');

    const parsedGroups = targetGroups ? JSON.parse(targetGroups) : [];

    const material = await Material.create({
      title, description, subject, course, batch,
      targetAudience: targetAudience || 'all',
      targetGroups:   targetAudience === 'groups' ? parsedGroups : [],
      isPublic:       isPublic === 'true' || isPublic === true,
      fileUrl,
      fileName:   req.file.originalname,
      fileSize:   req.file.size,
      uploadedBy: req.user._id,
    });

    res.status(201).json(material);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/materials  (admin / faculty)
exports.getMaterials = async (req, res) => {
  try {
    const { course, batch, subject } = req.query;
    const filter = {};
    if (course)  filter.course  = course;
    if (batch)   filter.batch   = batch;
    if (subject) filter.subject = subject;

    if (req.user.role === 'faculty') {
      const myGroups   = await Group.find({ headFaculty: req.user._id, isActive: true }).select('_id');
      const myGroupIds = myGroups.map(g => g._id);
      filter.$or = [
        { uploadedBy: req.user._id },
        { targetAudience: 'all' },
        { targetAudience: 'groups', targetGroups: { $in: myGroupIds } },
      ];
    }

    const materials = await Material.find(filter)
      .populate('uploadedBy', 'name role')
      .populate('targetGroups', 'name')
      .sort('-createdAt');
    res.json(materials);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/materials/my  (student)
exports.getMyMaterials = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const myGroups   = await Group.find({ students: student._id, isActive: true }).select('_id');
    const myGroupIds = myGroups.map(g => g._id);

    const materials = await Material.find({
      $or: [
        { targetAudience: 'all' },
        { isPublic: true },
        { targetAudience: 'groups', targetGroups: { $in: myGroupIds } },
        { course: student.course, batch: student.batch, targetAudience: { $ne: 'groups' } },
      ],
    })
      .populate('uploadedBy', 'name')
      .populate('targetGroups', 'name')
      .sort('-createdAt');

    res.json(materials);
  } catch (err) { res.status(500).json({ message: err.message }); }
};