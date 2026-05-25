const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── Counter model for atomic ID generation ──
const counterSchema = new mongoose.Schema({
  _id:   { type: String, required: true }, // e.g. 'employee', 'faculty', 'student'
  seq:   { type: Number, default: 0 },
});
const Counter = mongoose.model('Counter', counterSchema);

async function getNextId(role) {
  // Map role → counter key and starting number
  let counterKey, start;

  if (['office_staff', 'counselor', 'marketing'].includes(role)) {
    counterKey = 'employee';
    start      = 1000;
  } else if (role === 'faculty') {
    counterKey = 'faculty';
    start      = 2000;
  } else if (role === 'student') {
    counterKey = 'student';
    start      = 3000;
  } else {
    return null; // admin gets no device ID
  }

  // Atomic increment — guaranteed no duplicates even with concurrent requests
  const counter = await Counter.findByIdAndUpdate(
    counterKey,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return String(start + counter.seq);
  // employee: 1001, 1002, 1003 ...
  // faculty:  2001, 2002, 2003 ...
  // student:  3001, 3002, 3003 ...
}

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

userSchema.pre('save', async function (next) {
  // Assign deviceUserId atomically on new user creation
  if (this.isNew && !this.deviceUserId && this.role !== 'admin') {
    this.deviceUserId = await getNextId(this.role);
  }

  // Hash password if changed
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }

  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', userSchema);