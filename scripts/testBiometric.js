/**
 * scripts/testBiometric.js
 *
 * Simulates a biometric machine pushing punches to your API.
 * Run from backend/ folder:
 *   node scripts/testBiometric.js
 *
 * Before running:
 *   1. Make sure backend server is running (npm run start / npm run dev)
 *   2. Set deviceUserId on a User in MongoDB (e.g. "EMP001")
 *   3. Update TEST_USERS below with real deviceUserIds from your DB
 */

const http = require('http');

const API_URL  = 'http://localhost:5000';
const API_KEY  = process.env.BIOMETRIC_API_KEY || 'pimt_biometric_secret_2026';

// ── Update these with real deviceUserIds set on your User documents ──
const TEST_USERS = [
  { deviceUserId: 'EMP001', name: 'Teacher 1',   role: 'teacher'    },
  { deviceUserId: 'EMP002', name: 'Consultant 1', role: 'consultant' },
  { deviceUserId: 'STU001', name: 'Student 1',    role: 'student'    },
  { deviceUserId: 'STU002', name: 'Student 2',    role: 'student'    },
];

// ── Simulate different scenarios ──
function buildPunches(scenario) {
  const now  = new Date();
  const today = now.toISOString().split('T')[0];

  if (scenario === 'on-time') {
    // Everyone punches in at 08:55 (before 09:00 shift start → present)
    return TEST_USERS.map(u => ({
      deviceUserId: u.deviceUserId,
      punchTime:    `${today}T08:55:00.000Z`,
      punchType:    'in',
      deviceId:     'DEVICE_001',
    }));
  }

  if (scenario === 'late') {
    // Everyone punches in at 09:30 (30 min late → late if threshold < 30)
    return TEST_USERS.map(u => ({
      deviceUserId: u.deviceUserId,
      punchTime:    `${today}T09:30:00.000Z`,
      punchType:    'in',
      deviceId:     'DEVICE_001',
    }));
  }

  if (scenario === 'mixed') {
    // Mix: first two on-time, last two late
    const times = ['08:50', '08:58', '09:25', '09:45'];
    return TEST_USERS.map((u, i) => ({
      deviceUserId: u.deviceUserId,
      punchTime:    `${today}T${times[i]}:00.000Z`,
      punchType:    'in',
      deviceId:     'DEVICE_001',
    }));
  }

  if (scenario === 'punch-out') {
    // Punch-out at 17:30
    return TEST_USERS.map(u => ({
      deviceUserId: u.deviceUserId,
      punchTime:    `${today}T17:30:00.000Z`,
      punchType:    'out',
      deviceId:     'DEVICE_001',
    }));
  }

  if (scenario === 'custom') {
    // Add your own punches here for manual testing
    return [
      {
        deviceUserId: 'EMP001',
        punchTime:    new Date().toISOString(), // right now
        punchType:    'in',
        deviceId:     'DEVICE_001',
      },
    ];
  }

  return [];
}

async function sendPunches(scenario) {
  const punches = buildPunches(scenario);
  if (punches.length === 0) {
    console.log('No punches to send for scenario:', scenario);
    return;
  }

  console.log(`\n── Scenario: ${scenario.toUpperCase()} ──`);
  console.log(`Sending ${punches.length} punch(es)...`);
  punches.forEach(p => console.log(`  ${p.deviceUserId} → ${p.punchTime} [${p.punchType}]`));

  const body = JSON.stringify({ punches });

  const options = {
    hostname: 'localhost',
    port:     5000,
    path:     '/api/biometric/push',
    method:   'POST',
    headers: {
      'Content-Type':  'application/json',
      'Content-Length': Buffer.byteLength(body),
      'x-api-key':      API_KEY,
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log(`✅ Success: ${json.message} (${json.count} processed)`);
          } else {
            console.log(`❌ Error ${res.statusCode}: ${json.message}`);
          }
          resolve(json);
        } catch {
          console.log('Raw response:', data);
          resolve(data);
        }
      });
    });

    req.on('error', err => {
      console.error('❌ Request failed:', err.message);
      console.error('   Is your backend server running on port 5000?');
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

async function testSync() {
  console.log('\n── Testing manual sync ──');
  const options = {
    hostname: 'localhost',
    port:     5000,
    path:     '/api/biometric/sync',
    method:   'POST',
    headers: {
      'Content-Type': 'application/json',
      // NOTE: sync requires JWT — skip this test or add your token below
      // 'Authorization': 'Bearer YOUR_JWT_TOKEN',
    },
  };

  return new Promise((resolve) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        console.log(`Sync response (${res.statusCode}):`, data);
        resolve();
      });
    });
    req.on('error', () => resolve());
    req.end();
  });
}

// ── Main ──
async function main() {
  const scenario = process.argv[2] || 'mixed';

  const validScenarios = ['on-time', 'late', 'mixed', 'punch-out', 'custom'];
  if (!validScenarios.includes(scenario)) {
    console.log('Usage: node scripts/testBiometric.js [scenario]');
    console.log('Scenarios:', validScenarios.join(', '));
    process.exit(1);
  }

  try {
    await sendPunches(scenario);
    console.log('\nDone! Check your MongoDB or admin dashboard to verify attendance was created.');
    console.log('Go to: http://localhost:3000/admin/biometric to see the punch logs');
    console.log('Go to: http://localhost:3000/admin/attendance to see the processed records');
  } catch {
    process.exit(1);
  }
}

main();