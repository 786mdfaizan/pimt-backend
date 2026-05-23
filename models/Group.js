// models/Group.js
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String },
  course:      { type: String },
  batch:       { type: String },
  headFaculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  students:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);