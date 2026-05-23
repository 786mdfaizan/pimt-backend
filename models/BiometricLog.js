const mongoose = require('mongoose');

const biometricLogSchema = new mongoose.Schema({
  deviceUserId: { type: String, required: true },   // ID enrolled in fingerprint machine
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // resolved user
  punchTime:    { type: Date, required: true },
  punchType:    { type: String, enum: ['in', 'out'], default: 'in' },
  deviceId:     { type: String },                   // machine serial number
  synced:       { type: Boolean, default: false },  // processed into attendance?
}, { timestamps: true });

// Prevent duplicate punches from same device user at same exact time
biometricLogSchema.index({ deviceUserId: 1, punchTime: 1 }, { unique: true });

module.exports = mongoose.model('BiometricLog', biometricLogSchema);