const { Leave, Salary }   = require('../models/index');
const StaffAttendance     = require('../models/StaffAttendance');
const AttendanceSettings  = require('../models/AttendanceSettings');
const User                = require('../models/User');
const { generateSalarySlip } = require('../utils/pdfGenerator');
const { uploadToR2 }      = require('../middleware/upload');

// ===== LEAVE =====

exports.applyLeave = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;
    const leave = await Leave.create({
      applicant: req.user._id, leaveType, fromDate, toDate, reason,
    });
    res.status(201).json(leave);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllLeaves = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const leaves = await Leave.find(filter)
      .populate('applicant', 'name role email')
      .populate('reviewedBy', 'name')
      .sort('-createdAt');
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ applicant: req.user._id }).sort('-createdAt');
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.reviewLeave = async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    if (!['approved', 'rejected'].includes(status))
      return res.status(400).json({ message: 'Status must be approved or rejected' });

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status, reviewNote, reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true }
    ).populate('applicant', 'name email');

    res.json({ message: `Leave ${status}`, leave });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== SALARY =====

exports.createSalary = async (req, res) => {
  try {
    const { employee, month, year, basicSalary, allowances, deductions, remarks } = req.body;
    const existing = await Salary.findOne({ employee, month, year });
    if (existing) return res.status(400).json({ message: 'Salary record already exists for this month' });

    const salary = await Salary.create({
      employee, month, year, basicSalary, allowances, deductions, remarks,
      createdBy: req.user._id,
    });
    res.status(201).json(salary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllSalaries = async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year)  filter.year  = parseInt(year);
    const salaries = await Salary.find(filter)
      .populate('employee', 'name role email')
      .sort('-createdAt');
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.paySalary = async (req, res) => {
  try {
    // ── Include deviceUserId so PDF shows Employee ID correctly ──
    const salary = await Salary.findById(req.params.id)
      .populate('employee', 'name email role deviceUserId');
 
    if (!salary) return res.status(404).json({ message: 'Salary record not found' });
 
    salary.status   = 'paid';
    salary.paidDate = new Date();
 
    const pdfBuffer = await generateSalarySlip(salary);
    const slipUrl   = await uploadToR2(
      {
        buffer:       pdfBuffer,
        originalname: `salary-slip-${salary.employee.name}-${salary.month}-${salary.year}.pdf`,
        mimetype:     'application/pdf',
      },
      'salary-slips'
    );
    salary.slipUrl = slipUrl;
    await salary.save();
    res.json({ message: 'Salary paid and slip generated', salary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMySalaries = async (req, res) => {
  try {
    const salaries = await Salary.find({ employee: req.user._id }).sort({ year: -1, month: -1 });
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/salary/calculate
// Auto-calculate salary from biometric attendance
// Takes late marks into account (N lates = 1 absent deduction)
// ─────────────────────────────────────────────
exports.calculateSalaryFromAttendance = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year)
      return res.status(400).json({ message: 'month and year are required' });

    // Load settings for latesPerAbsent ratio
    let settings = await AttendanceSettings.findOne();
    if (!settings) settings = await AttendanceSettings.create({});
    const latesPerAbsent = settings.latesPerAbsent || 3;

    // All active staff
    const staffUsers = await User.find({
      role:     { $in: ['teacher', 'consultant'] },
      isActive: true,
    });

    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const totalWorkingDays = getWorkingDays(startDate, endDate);
    const results = [];

    for (const user of staffUsers) {
      const records = await StaffAttendance.find({
        user: user._id,
        date: { $gte: startDate, $lte: endDate },
      });

      const presentDays  = records.filter(r => r.status === 'present').length;
      const lateDays     = records.filter(r => r.status === 'late').length;
      const halfDays     = records.filter(r => r.status === 'half-day').length;

      // Convert lates to equivalent absent deduction
      // e.g. if latesPerAbsent=3: 6 lates = 2 absent-equivalents
      const lateDeductionDays = Math.floor(lateDays / latesPerAbsent);

      // Half-days count as 0.5 days
      const effectivePresentDays = presentDays + (halfDays * 0.5);

      // Absent = working days not covered by present/late/half-day
      const absentDays = Math.max(0, totalWorkingDays - presentDays - lateDays - halfDays);

      // Get base salary from existing record or User.basicSalary
      const existing    = await Salary.findOne({ employee: user._id, month, year });
      const basicSalary = existing?.basicSalary || user.basicSalary || 0;
      const allowances  = existing?.allowances  || 0;

      const perDay     = totalWorkingDays > 0 ? basicSalary / totalWorkingDays : 0;
      const deductions = Math.round(perDay * (absentDays + lateDeductionDays));

      const record = await Salary.findOneAndUpdate(
        { employee: user._id, month, year },
        {
          employee:         user._id,
          month,
          year,
          basicSalary,
          allowances,
          deductions,
          attendanceDays:   Math.round(effectivePresentDays),
          totalWorkingDays,
          status:           existing?.status === 'paid' ? 'paid' : 'pending',
          remarks: `Auto: ${presentDays} present, ${lateDays} late (${lateDeductionDays} deducted), ${absentDays} absent · ${totalWorkingDays} working days`,
          createdBy:        req.user._id,
        },
        { upsert: true, new: true }
      );

      results.push(record);
    }

    res.json({
      message:           'Salaries calculated from biometric attendance',
      month,
      year,
      totalWorkingDays,
      latesPerAbsent,
      count:             results.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper — Mon–Sat working days (excludes Sunday)
function getWorkingDays(start, end) {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (cur.getDay() !== 0) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}