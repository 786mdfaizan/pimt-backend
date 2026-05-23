/**
 * scripts/assignDeviceIds.js
 *
 * Lists all users and lets you assign deviceUserId to each one.
 * This maps your DB users to the enrollment IDs on the fingerprint machine.
 *
 * Run: node scripts/assignDeviceIds.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  const users = await User.find({ isActive: true }).select('name email role deviceUserId');

  console.log('Current users and their deviceUserIds:');
  console.log('─'.repeat(70));
  users.forEach((u, i) => {
    console.log(
      `${String(i + 1).padStart(2)}. [${u.role.toUpperCase().padEnd(10)}] ${u.name.padEnd(25)} → deviceUserId: ${u.deviceUserId || '(not set)'}`
    );
  });
  console.log('─'.repeat(70));

  // ── Auto-assign IDs if none are set ──
  const unassigned = users.filter(u => !u.deviceUserId);

  if (unassigned.length === 0) {
    console.log('\n✅ All users already have deviceUserIds assigned.');
  } else {
    console.log(`\n${unassigned.length} user(s) have no deviceUserId. Auto-assigning...`);

    let staffCounter   = 1;
    let studentCounter = 1;

    for (const u of unassigned) {
      let deviceUserId;

      if (u.role === 'student') {
        deviceUserId = `STU${String(studentCounter).padStart(3, '0')}`;
        studentCounter++;
      } else {
        deviceUserId = `EMP${String(staffCounter).padStart(3, '0')}`;
        staffCounter++;
      }

      await User.findByIdAndUpdate(u._id, { deviceUserId });
      console.log(`  ✓ ${u.name} (${u.role}) → ${deviceUserId}`);
    }

    console.log('\n✅ Done! Update your fingerprint machine enrollments to match these IDs.');
    console.log('   Or update testBiometric.js TEST_USERS array with these IDs to test.');
  }

  // Show final state
  const updated = await User.find({ isActive: true }).select('name role deviceUserId');
  console.log('\nFinal deviceUserId assignments:');
  updated.forEach(u => {
    console.log(`  ${u.deviceUserId?.padEnd(10)} → ${u.name} (${u.role})`);
  });

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });