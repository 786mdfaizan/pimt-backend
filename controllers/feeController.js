const Fee = require('../models/Fee');
const Student = require('../models/Student');
const { generateFeeReceipt } = require('../utils/pdfGenerator');
const { generateUPIQR } = require('../utils/qrGenerator');
const { uploadToR2 } = require('../middleware/upload');

// GET /api/fees  (admin: all fees)
exports.getAllFees = async (req, res) => {
  try {
    const { status, studentId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (studentId) filter.student = studentId;
    const fees = await Fee.find(filter)
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .sort('-createdAt');
    res.json(fees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/fees  (admin: create fee record)
exports.createFee = async (req, res) => {
  try {
    const { student, amount, feeType, semester, dueDate, remarks } = req.body;
    const fee = await Fee.create({
      student, amount, feeType, semester, dueDate, remarks,
      createdBy: req.user._id,
    });
    res.status(201).json(fee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/fees/:id/mark-paid  (admin: mark fee as paid + generate receipt)
exports.markFeePaid = async (req, res) => {
  try {
    const { transactionRef, paymentMethod } = req.body;
    const fee = await Fee.findById(req.params.id).populate({
      path: 'student',
      populate: { path: 'user', select: 'name email phone' },
    });
    if (!fee) return res.status(404).json({ message: 'Fee not found' });
    if (fee.status === 'paid') return res.status(400).json({ message: 'Fee is already marked as paid' });

    fee.status        = 'paid';
    fee.paidDate      = new Date();
    fee.transactionRef = transactionRef;
    fee.paymentMethod  = paymentMethod || 'qr';

    // Generate PDF receipt and upload
    const pdfBuffer = await generateFeeReceipt(fee);
    const receiptUrl = await uploadToR2(
      {
        buffer: pdfBuffer,
        originalname: `receipt-${fee.invoiceNumber}.pdf`,
        mimetype: 'application/pdf',
      },
      'receipts'
    );
    fee.receiptUrl = receiptUrl;
    await fee.save();

    res.json({ message: 'Fee marked as paid', fee });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/fees/qr/:studentId  (student: generate UPI QR)
// Query params:
//   ?feeId=xxx  → single fee payment
//   (no feeId)  → all pending fees combined
exports.getPaymentQR = async (req, res) => {
  try {
    const { feeId } = req.query;

    const student = await Student.findById(req.params.studentId).populate('user', 'name');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    let feesToPay;

    if (feeId) {
      // Single fee payment
      const fee = await Fee.findById(feeId);
      if (!fee)
        return res.status(404).json({ message: 'Fee record not found' });
      if (fee.status === 'paid')
        return res.status(400).json({ message: 'This fee is already paid' });
      if (fee.student.toString() !== req.params.studentId)
        return res.status(403).json({ message: 'This fee does not belong to this student' });
      feesToPay = [fee];
    } else {
      // All pending + overdue fees
      feesToPay = await Fee.find({
        student: req.params.studentId,
        status: { $in: ['pending', 'overdue'] },
      });
    }

    if (!feesToPay.length)
      return res.status(400).json({ message: 'No pending fees found' });

    const totalDue = feesToPay.reduce((sum, f) => sum + f.amount, 0);

    const qrDataUrl = await generateUPIQR({
      amount: totalDue,
      name: student.user.name,
      reference: feeId
        ? `PIMT-${student.rollNumber}-${feesToPay[0].invoiceNumber}`
        : `PIMT-${student.rollNumber}`,
    });

    res.json({
      qrDataUrl,
      totalDue,
      pendingCount: feesToPay.length,
      fees: feesToPay.map(f => ({
        _id:           f._id,
        invoiceNumber: f.invoiceNumber,
        feeType:       f.feeType,
        semester:      f.semester,
        amount:        f.amount,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/fees/my  (student: own fee history)
exports.getMyFees = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student record not found' });
    const fees = await Fee.find({ student: student._id }).sort('-createdAt');
    res.json(fees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};