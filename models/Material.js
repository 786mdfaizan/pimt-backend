// models/Material.js
// Single source of truth for the Material model.
// models/index.js imports and re-exports this — do NOT define
// another materialSchema in index.js or Mongoose will throw
// "Cannot overwrite `Material` model once compiled".
const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  subject:     { type: String },
  course:      { type: String },
  batch:       { type: String },
  fileUrl:     { type: String, required: true },
  fileName:    { type: String },
  fileSize:    { type: Number },
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ── Targeting (group-aware) ──
  // 'all'    → all students can see it
  // 'groups' → only students in targetGroups can see it
  targetAudience: {
    type: String,
    enum: ['all', 'groups'],
    default: 'all',
  },
  targetGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],

  isPublic:    { type: Boolean, default: false },

  // kept for backward compat
  sharedWith:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
}, { timestamps: true });

module.exports = mongoose.model('Material', materialSchema);