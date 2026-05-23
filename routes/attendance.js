// routes/attendance.js
const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getStudentAttendance,
  getMyAttendance,
  getStaffAttendanceByDate,
  getStaffAttendanceHistory,
} = require('../controllers/attendanceController');

router.use(protect);

// Student attendance
router.get('/my',                  authorize('student'),           getMyAttendance);
router.get('/student/:studentId',  authorize('admin', 'faculty'),  getStudentAttendance);

// Staff attendance
router.get('/staff',               authorize('admin'),             getStaffAttendanceByDate);
router.get('/staff/:userId',       authorize('admin'),             getStaffAttendanceHistory);

module.exports = router;