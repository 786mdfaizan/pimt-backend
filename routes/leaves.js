// routes/leaves.js
const express     = require('express');
const leaveRouter = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { applyLeave, getAllLeaves, getMyLeaves, reviewLeave } = require('../controllers/leaveController');

leaveRouter.use(protect);

// All staff roles can apply for and view their own leaves
const STAFF_ROLES = ['faculty', 'counselor', 'marketing', 'office_staff'];
leaveRouter.post('/apply', authorize(...STAFF_ROLES), applyLeave);
leaveRouter.get('/my',     authorize(...STAFF_ROLES), getMyLeaves);

// Admin only
leaveRouter.get('/',              authorize('admin'), getAllLeaves);
leaveRouter.patch('/:id/review',  authorize('admin'), reviewLeave);

module.exports = leaveRouter;