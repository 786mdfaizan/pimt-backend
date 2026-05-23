const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: require('path').join(__dirname, '../.env') });


async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: 'admin@pimt.edu' });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit();
  }

  const admin = await User.create({
    name: 'Super Admin',
    email: 'admin@pimt.edu',
    password: 'Admin@2026',
    role: 'admin',
    phone: '9000000000',
  });

  console.log('✅ Admin created:', admin.email, '| Password: Admin@2026');
  process.exit();
}

createAdmin().catch(err => { console.error(err); process.exit(1); });