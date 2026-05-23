const mongoose = require('mongoose');

// ── Study Material ──
// FIX: Material is now defined in models/Material.js to avoid
// "Cannot overwrite `Material` model once compiled" crash.
// We re-export it from here for backward compatibility.
const Material = require('./Material');

// ── Leave Application ──
const leaveSchema = new mongoose.Schema({
  applicant:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leaveType:  { type: String, enum: ['casual', 'sick', 'earned', 'emergency'], required: true },
  fromDate:   { type: Date, required: true },
  toDate:     { type: Date, required: true },
  reason:     { type: String, required: true },
  status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewNote: { type: String },
  reviewedAt: { type: Date },
}, { timestamps: true });

// ── Salary ──
const salarySchema = new mongoose.Schema({
  employee:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month:            { type: Number, required: true },
  year:             { type: Number, required: true },
  basicSalary:      { type: Number, required: true },
  allowances:       { type: Number, default: 0 },
  deductions:       { type: Number, default: 0 },
  attendanceDays:   { type: Number },
  totalWorkingDays: { type: Number },
  netSalary:        { type: Number },
  status:           { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paidDate:         { type: Date },
  slipUrl:          { type: String },
  remarks:          { type: String },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

salarySchema.pre('save', function (next) {
  this.netSalary = this.basicSalary + this.allowances - this.deductions;
  next();
});

// ── CRM Lead ──
const leadSchema = new mongoose.Schema({
  assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true },
  email:       { type: String },
  phone:       { type: String, required: true },
  course:      { type: String },

  source: {
    type: String,
    enum: [
      'Walk In', 'Website', 'Social Media', 'Data', 'Other',  // counselor
      'Associate', 'Direct', 'Seminar',                        // marketing
      'Referral',                                              // faculty
    ],
    default: 'Walk In',
  },

  status: {
    type: String,
    enum: ['new', 'contacted', 'interested', 'converted', 'lost'],
    default: 'new',
  },
  notes:        { type: String },
  followUpDate: { type: Date },
}, { timestamps: true });

module.exports = {
  Material,
  Leave:    mongoose.model('Leave',    leaveSchema),
  Salary:   mongoose.model('Salary',   salarySchema),
  Lead:     mongoose.model('Lead',     leadSchema),
};