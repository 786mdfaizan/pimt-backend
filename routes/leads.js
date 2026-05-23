// routes/leads.js
const express     = require('express');
const leadsRouter = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createLead, getLeads, updateLead, deleteLead } = require('../controllers/leadController');

leadsRouter.use(protect);

// All staff roles that can access leads
const LEAD_ROLES = ['admin', 'faculty', 'counselor', 'marketing'];

leadsRouter.get('/',    authorize(...LEAD_ROLES), getLeads);
leadsRouter.post('/',   authorize(...LEAD_ROLES), createLead);
leadsRouter.patch('/:id', authorize(...LEAD_ROLES), updateLead);
leadsRouter.delete('/:id', authorize('admin'),    deleteLead);

module.exports = leadsRouter;