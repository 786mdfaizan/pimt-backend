const express   = require('express');
const cors      = require('cors');
const dotenv    = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// ── CORS — allow multiple origins ──
const ALLOWED_ORIGINS = [
  'https://pimt-frontend.vercel.app',
  'https://pimt-erp.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

// Also add whatever is in FRONTEND_URL env (with https:// guaranteed)
if (process.env.FRONTEND_URL) {
  let url = process.env.FRONTEND_URL.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  if (!ALLOWED_ORIGINS.includes(url)) ALLOWED_ORIGINS.push(url);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods:  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

// Handle preflight for all routes
app.options('*', cors());

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
app.use('/api/groups',     require('./routes/groups'));

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`PIMT ERP Server running on port ${PORT}`));