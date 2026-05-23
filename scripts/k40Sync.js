/**
 * scripts/k40Sync.js
 *
 * Biometric sync service for ZKTeco K40 Pro fingerprint machine.
 * Runs on the LOCAL PC connected to the K40 device via LAN.
 * NOT deployed on Render — runs with PM2 on the office computer.
 *
 * Setup:
 *   npm install node-zklib axios node-cron dotenv
 *   node scripts/k40Sync.js          ← one-time run
 *   pm2 start scripts/k40Sync.js --name k40-sync   ← permanent background service
 *   pm2 save && pm2 startup           ← auto-start on reboot
 */

require('dotenv').config();
const ZKLib = require('node-zklib');
const axios = require('axios');
const cron  = require('node-cron');

// ── Config ────────────────────────────────────────────────
// Update these to match your environment
const DEVICE_IP   = process.env.K40_IP          || '192.168.1.201';
const DEVICE_PORT = Number(process.env.K40_PORT) || 4370;
const DEVICE_ID   = process.env.K40_DEVICE_ID   || 'K40PRO_001';

// Point to your Render production URL (not localhost)
const ERP_API_URL = process.env.ERP_API_URL      || 'https://pimt-erp-backend.onrender.com';
const API_KEY     = process.env.BIOMETRIC_API_KEY || 'pimt_biometric_secret_2026';

// Track already-sent logs to avoid duplicates (in-memory, resets on restart)
const sentLogs = new Set();

// ── Sync function ─────────────────────────────────────────
async function syncDevice() {
  const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);

  try {
    console.log(`[${new Date().toLocaleTimeString()}] Connecting to K40 Pro at ${DEVICE_IP}:${DEVICE_PORT}...`);

    await zk.createSocket();
    console.log('✓ Connected to device');

    const attendance = await zk.getAttendances();

    if (!attendance?.data?.length) {
      console.log('No attendance logs found');
      await zk.disconnect();
      return;
    }

    // Filter out already-sent logs
    const newLogs = attendance.data.filter(log => {
      const key = `${log.deviceUserId || log.uid}_${log.recordTime}`;
      if (sentLogs.has(key)) return false;
      sentLogs.add(key);
      return true;
    });

    if (!newLogs.length) {
      console.log('No new logs to send');
      await zk.disconnect();
      return;
    }

    console.log(`Found ${newLogs.length} new log(s) — sending to ERP...`);

    // Convert to ERP format
    const punches = newLogs.map(log => ({
      deviceUserId: String(log.deviceUserId || log.uid),
      punchTime:    log.recordTime,
      punchType:    log.type === 1 ? 'out' : 'in',  // 0=in, 1=out on most ZKTeco devices
      deviceId:     DEVICE_ID,
    }));

    const response = await axios.post(
      `${ERP_API_URL}/api/biometric/push`,
      { punches },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key':    API_KEY,
        },
        timeout: 15000,
      }
    );

    console.log(`✓ ERP response: ${response.data.message} (${response.data.count} processed)`);

    await zk.disconnect();

  } catch (err) {
    console.error(`✗ Sync error: ${err.message}`);
    // Try to disconnect gracefully even on error
    try { await zk.disconnect(); } catch {}
  }
}

// ── Schedule ──────────────────────────────────────────────
// Runs every 2 minutes — adjust as needed
cron.schedule('*/2 * * * *', () => {
  syncDevice();
});

// Also run once immediately on startup
syncDevice();

console.log('━'.repeat(50));
console.log('  K40 Pro Sync Service Started');
console.log(`  Device:  ${DEVICE_IP}:${DEVICE_PORT}`);
console.log(`  ERP API: ${ERP_API_URL}`);
console.log(`  Schedule: every 2 minutes`);
console.log('━'.repeat(50));