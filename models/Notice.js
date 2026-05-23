const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  content:     { type: String, required: true },
  category:    {
    type: String,
    enum: ['general', 'exam', 'holiday', 'event', 'fee', 'urgent'],
    default: 'general',
  },
  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive:    { type: Boolean, default: true },
  pinned:      { type: Boolean, default: false },
  expiresAt:   { type: Date },

  // ── Targeting ──
  // 'all'    → everyone sees it (students + staff)
  // 'staff'  → only staff roles
  // 'groups' → only specific groups (students and their faculty head)
  targetAudience: {
    type: String,
    enum: ['all', 'staff', 'groups'],
    default: 'all',
  },

  // When targetAudience = 'groups', list the Group IDs
  targetGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],

}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);