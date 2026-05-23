const mongoose = require('mongoose');

const staffAttendanceSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:     { type: Date, required: true },
  status:   {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'leave'],
    default: 'absent',
  },
  punchIn:  { type: Date },
  punchOut: { type: Date },
  remarks:  { type: String },
}, { timestamps: true });

staffAttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('StaffAttendance', staffAttendanceSchema);