const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  createSubAdmin, getSubAdmins, deleteSubAdmin,
  createStudent,  getStudents,  updateStudent, deleteStudent,
  getEnquiries,
  getGroups, createGroup, deleteGroup,
} = require('../controllers/adminController');

router.use(protect, authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Staff
router.post('/sub-admins',       createSubAdmin);
router.get('/sub-admins',        getSubAdmins);
router.delete('/sub-admins/:id', deleteSubAdmin);

// Students
router.post('/students',        createStudent);
router.get('/students',         getStudents);
router.patch('/students/:id',   updateStudent);
router.delete('/students/:id',  deleteStudent);

// Groups
router.get('/groups',         getGroups);
router.post('/groups',        createGroup);
router.delete('/groups/:id',  deleteGroup);

// Enquiries
router.get('/enquiries', getEnquiries);

module.exports = router;