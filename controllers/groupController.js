// controllers/groupController.js
const Group   = require('../models/Group');
const Student = require('../models/Student');

// GET /api/admin/groups
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ isActive: true })
      .populate('headFaculty', 'name email role')
      .populate({ path: 'students', populate: { path: 'user', select: 'name' } })
      .sort('-createdAt');
    res.json(groups);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /api/admin/groups
exports.createGroup = async (req, res) => {
  try {
    const { name, description, headFaculty, course, batch, studentIds } = req.body;
    const group = await Group.create({
      name, description, headFaculty, course, batch,
      students:  studentIds || [],
      createdBy: req.user._id,
    });
    res.status(201).json(group);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// DELETE /api/admin/groups/:id
exports.deleteGroup = async (req, res) => {
  try {
    await Group.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Group deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// GET /api/groups/my — faculty head sees their groups
exports.getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ headFaculty: req.user._id, isActive: true })
      .populate({ path: 'students', populate: { path: 'user', select: 'name email' } });
    res.json(groups);
  } catch (err) { res.status(500).json({ message: err.message }); }
};