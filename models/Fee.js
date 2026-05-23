const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  invoiceNumber: { type: String, unique: true },
  amount: { type: Number, required: true },
  feeType: {
    type: String,
    enum: ['tuition', 'exam', 'library', 'hostel', 'transport', 'other'],
    default: 'tuition',
  },
  semester: { type: Number },
  dueDate: { type: Date },
  paidDate: { type: Date },
  status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
  paymentMethod: { type: String, enum: ['qr', 'cash', 'bank_transfer'], default: 'qr' },
  transactionRef: { type: String },
  receiptUrl: { type: String },
  remarks: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

feeSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await this.constructor.countDocuments();
    this.invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Fee', feeSchema);