const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: {
    type: String,
    enum: ['admin', 'faculty', 'counselor', 'marketing', 'office_staff', 'student'],
    required: true,
  },
  phone:        { type: String },
  isActive:     { type: Boolean, default: true },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  profilePhoto: { type: String },
  deviceUserId: { type: String, unique: true, sparse: true },
  basicSalary:  { type: Number, default: 0 },
}, { timestamps: true });

// ── Device ID ranges (pure numeric, no letters) ──────────────
// office_staff / counselor / marketing → 1001, 1002, 1003 ...
// faculty                              → 2001, 2002, 2003 ...
// student                              → 3001, 3002, 3003 ...
// admin                                → no biometric ID needed

const ROLE_RANGE = {
  office_staff: { start: 1001 },
  counselor:    { start: 1001 },
  marketing:    { start: 1001 },
  faculty:      { start: 2001 },
  student:      { start: 3001 },
};

// Returns the numeric start for a role's ID range
// e.g. faculty → 2000, student → 3000
function rangeFloor(role) {
  const map = { office_staff: 1000, counselor: 1000, marketing: 1000, faculty: 2000, student: 3000 };
  return map[role] || null;
}

userSchema.pre('save', async function (next) {
  if (this.isNew && !this.deviceUserId && this.role !== 'admin') {
    const floor   = rangeFloor(this.role);
    const ceiling = floor + 999; // e.g. 1000–1999, 2000–2999, 3000–3999

    // Count existing users in this ID range
    const count = await this.constructor.countDocuments({
      deviceUserId: {
        $gte: String(floor + 1),       // "1001"
        $lte: String(ceiling),         // "1999"
      },
    });

    // Next available ID in range
    this.deviceUserId = String(floor + 1 + count);
  }

  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);