const { Lead } = require('../models/index');

// POST /api/leads
exports.createLead = async (req, res) => {
  try {
    const { name, email, phone, course, source, notes, followUpDate } = req.body;
    const lead = await Lead.create({
      assignedTo: req.user._id, name, email, phone, course, source, notes, followUpDate,
    });
    res.status(201).json(lead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/leads  (admin: all | sub-admin: own)
exports.getLeads = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { assignedTo: req.user._id };
    const { status } = req.query;
    if (status) filter.status = status;
    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name role')
      .sort('-createdAt');
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/leads/:id
exports.updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (req.user.role !== 'admin' && lead.assignedTo.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized to edit this lead' });

    Object.assign(lead, req.body);
    await lead.save();
    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/leads/:id  (admin only)
exports.deleteLead = async (req, res) => {
  try {
    await Lead.findByIdAndDelete(req.params.id);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};