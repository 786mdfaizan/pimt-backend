const mongoose = require('mongoose');
const salarySchema = new mongoose.Schema({
  employee:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month:       { type: Number, required: true },
  year:        { type: Number, required: true },
  basicSalary: { type: Number, required: true },
  allowances:  { type: Number, default: 0 },
  deductions:  { type: Number, default: 0 },
  remarks:     { type: String },
  status:      { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paidDate:    { type: Date },
  slipUrl:     { type: String },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
module.exports = mongoose.model('Salary', salarySchema);