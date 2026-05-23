const mongoose = require('mongoose');

// Singleton document — only one settings record ever exists
const attendanceSettingsSchema = new mongoose.Schema({
  // How many minutes after shift start before punch is marked LATE
  lateThresholdMinutes: { type: Number, default: 15 },

  // Shift start time in "HH:MM" 24hr format e.g. "09:00"
  shiftStartTime: { type: String, default: '09:00' },

  // How many late marks = 1 absent deduction for salary
  latesPerAbsent: { type: Number, default: 3 },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('AttendanceSettings', attendanceSettingsSchema);