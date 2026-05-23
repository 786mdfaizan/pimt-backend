const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student:  { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  date:     { type: Date, required: true },
  status:   { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true },
  punchIn:  { type: Date },   // actual punch time from biometric
  remarks:  { type: String },
}, { timestamps: true });

attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);