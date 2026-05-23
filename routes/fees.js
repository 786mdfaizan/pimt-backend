// ========== routes/fees.js ==========
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getAllFees, createFee, markFeePaid, getPaymentQR, getMyFees } = require('../controllers/feeController');

router.use(protect);
router.get('/my', authorize('student'), getMyFees);
router.get('/qr/:studentId', getPaymentQR);
router.get('/', authorize('admin'), getAllFees);
router.post('/', authorize('admin'), createFee);
router.patch('/:id/mark-paid', authorize('admin'), markFeePaid);

module.exports = router;