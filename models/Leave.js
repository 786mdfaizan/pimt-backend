const mongoose = require('mongoose');
const leaveSchema = new mongoose.Schema({
  applicant:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leaveType:  { type: String, enum: ['sick', 'casual', 'earned', 'other'], default: 'casual' },
  fromDate:   { type: Date, required: true },
  toDate:     { type: Date, required: true },
  reason:     { type: String },
  status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewNote: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true });
module.exports = mongoose.model('Leave', leaveSchema);