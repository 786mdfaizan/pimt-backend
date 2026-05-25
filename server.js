const express   = require('express');
const cors      = require('cors');
const dotenv    = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://pimt-frontend.vercel.app',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/sub-admin',  require('./routes/subAdmin'));
app.use('/api/student',    require('./routes/student'));
app.use('/api/fees',       require('./routes/fees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/notices',    require('./routes/notices'));
app.use('/api/materials',  require('./routes/materials'));
app.use('/api/leaves',     require('./routes/leaves'));
app.use('/api/salary',     require('./routes/salary'));
app.use('/api/leads',      require('./routes/leads'));
app.use('/api/biometric',  require('./routes/biometric'));
app.use('/api/groups',     require('./routes/groups'));   // ← single registration

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`PIMT ERP Server running on port ${PORT}`));