const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rollNumber: { type: String, unique: true },
  course: { type: String, required: true },
  batch: { type: String, required: true },
  semester: { type: Number, default: 1 },
  dob: { type: Date },
  address: { type: String },
  guardianName: { type: String },
  guardianPhone: { type: String },
  admissionDate: { type: Date, default: Date.now },
  bloodGroup: { type: String },
  idCardUrl: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Auto-generate roll number before saving
studentSchema.pre('save', async function (next) {
  if (!this.rollNumber) {
    const count = await this.constructor.countDocuments();
    this.rollNumber = `PIMT${new Date().getFullYear()}${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Student', studentSchema);