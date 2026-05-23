// routes/salary.js
const express      = require('express');
const salaryRouter = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createSalary, getAllSalaries, paySalary,
  getMySalaries, calculateSalaryFromAttendance,
} = require('../controllers/leaveController');

salaryRouter.use(protect);

// All staff roles can view their own salary slips
salaryRouter.get('/my', authorize('faculty', 'counselor', 'marketing', 'office_staff'), getMySalaries);

// Admin only
salaryRouter.get('/',           authorize('admin'), getAllSalaries);
salaryRouter.post('/',          authorize('admin'), createSalary);
salaryRouter.post('/calculate', authorize('admin'), calculateSalaryFromAttendance);
salaryRouter.post('/:id/pay',   authorize('admin'), paySalary);

module.exports = salaryRouter;