const BiometricLog        = require('../models/BiometricLog');
const Attendance          = require('../models/Attendance');
const StaffAttendance     = require('../models/StaffAttendance');
const AttendanceSettings  = require('../models/AttendanceSettings');
const User                = require('../models/User');
const Student             = require('../models/Student');

// ─────────────────────────────────────────────
// Helper — get or create the singleton settings
// ─────────────────────────────────────────────
async function getSettings() {
  let settings = await AttendanceSettings.findOne();
  if (!settings) settings = await AttendanceSettings.create({});
  return settings;
}

// ─────────────────────────────────────────────
// Helper — determine status from punch time
// Returns 'present' | 'late'
// ─────────────────────────────────────────────
function resolveStatus(punchTime, settings) {
  const [shiftHour, shiftMin] = settings.shiftStartTime.split(':').map(Number);

  const shiftStart = new Date(punchTime);
  shiftStart.setHours(shiftHour, shiftMin, 0, 0);

  const diffMinutes = (punchTime - shiftStart) / 60000; // positive = late

  if (diffMinutes > settings.lateThresholdMinutes) return 'late';
  return 'present';
}

// ─────────────────────────────────────────────
// Internal — process a list of BiometricLog docs
// into Attendance / StaffAttendance records
// ─────────────────────────────────────────────
async function processLogs(logs) {
  const settings = await getSettings();

  for (const log of logs) {
    // Skip if no user mapped to this device ID
    if (!log.user) {
      console.warn(`[Biometric] Skipping log ${log._id} — deviceUserId "${log.deviceUserId}" not mapped to any user`);
      continue;
    }

    const user = await User.findById(log.user);
    if (!user || !user.isActive) {
      console.warn(`[Biometric] Skipping log ${log._id} — user not found or deactivated`);
      continue;
    }

    const punchTime = new Date(log.punchTime);
    const dateOnly  = new Date(punchTime);
    dateOnly.setHours(0, 0, 0, 0);

    const status = resolveStatus(punchTime, settings);

    if (user.role === 'student') {
      // ── Student attendance ──
      const student = await Student.findOne({ user: user._id });
      if (!student) {
        console.warn(`[Biometric] Skipping — no Student record for user ${user._id}`);
        continue;
      }

      // FIX: Only use fields that exist in the Attendance schema
      // (removed 'subject' and 'markedBy' which don't exist in the model)
      await Attendance.findOneAndUpdate(
        { student: student._id, date: dateOnly },
        {
          $set: {
            status,
            punchIn: punchTime,
            remarks: `Auto-synced from biometric · Punch: ${punchTime.toLocaleTimeString('en-IN')}`,
          },
        },
        { upsert: true, new: true }
      );

    } else {
      // ── Staff attendance (faculty / counselor / marketing / office_staff) ──
      const existing = await StaffAttendance.findOne({ user: user._id, date: dateOnly });

      if (!existing) {
        // First punch of the day → punch-in
        await StaffAttendance.create({
          user:    user._id,
          date:    dateOnly,
          status,
          punchIn: punchTime,
          remarks: `Auto-synced · Punch-in: ${punchTime.toLocaleTimeString('en-IN')}`,
        });
      } else if (log.punchType === 'out' || punchTime > (existing.punchIn || 0)) {
        // Later punch → punch-out (update only, keep original status)
        await StaffAttendance.findOneAndUpdate(
          { user: user._id, date: dateOnly },
          {
            $set: {
              punchOut: punchTime,
              remarks: `${existing.remarks || ''} · Punch-out: ${punchTime.toLocaleTimeString('en-IN')}`,
            },
          }
        );
      }
    }

    // Mark log as synced
    await BiometricLog.findByIdAndUpdate(log._id, { synced: true });
  }
}

// ─────────────────────────────────────────────
// POST /api/biometric/push
// Called by bridge script from fingerprint machine
// Header: x-api-key: <BIOMETRIC_API_KEY>
// Body: { punches: [{ deviceUserId, punchTime, punchType, deviceId }] }
// ─────────────────────────────────────────────
exports.receivePunch = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.BIOMETRIC_API_KEY)
      return res.status(401).json({ message: 'Unauthorized' });

    const { punches } = req.body;
    if (!Array.isArray(punches) || punches.length === 0)
      return res.status(400).json({ message: 'punches array is required' });

    const saved = [];
    const unmatched = []; // FIX: track unmatched device IDs so caller knows

    for (const punch of punches) {
      // Resolve deviceUserId → User
      const user = await User.findOne({ deviceUserId: punch.deviceUserId });

      // FIX: warn about unmatched device IDs instead of silently dropping
      if (!user) {
        console.warn(`[Biometric] No user found for deviceUserId: ${punch.deviceUserId}`);
        unmatched.push(punch.deviceUserId);
      }

      try {
        const log = await BiometricLog.findOneAndUpdate(
          { deviceUserId: punch.deviceUserId, punchTime: new Date(punch.punchTime) },
          {
            deviceUserId: punch.deviceUserId,
            user:         user?._id || null, // FIX: explicit null instead of undefined
            punchTime:    new Date(punch.punchTime),
            punchType:    punch.punchType || 'in',
            deviceId:     punch.deviceId,
            synced:       false,
          },
          { upsert: true, new: true }
        );
        saved.push(log);
      } catch (dupErr) {
        // Duplicate punch — skip silently
      }
    }

    // Process immediately into attendance
    await processLogs(saved);

    res.json({
      message:   'Punches received and processed',
      count:     saved.length,
      unmatched: unmatched.length > 0 ? unmatched : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/biometric/sync
// Admin manually re-processes all unsynced logs
// ─────────────────────────────────────────────
exports.syncAttendance = async (req, res) => {
  try {
    const unsynced = await BiometricLog.find({ synced: false });
    await processLogs(unsynced);
    res.json({ message: 'Sync complete', processed: unsynced.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/biometric/logs
// Admin views raw punch logs
// Query: ?date=YYYY-MM-DD  ?userId=xxx
// ─────────────────────────────────────────────
exports.getLogs = async (req, res) => {
  try {
    const { date, userId } = req.query;
    const filter = {};

    if (date) {
      const d     = new Date(date);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end   = new Date(d); end.setHours(23, 59, 59, 999);
      filter.punchTime = { $gte: start, $lte: end };
    }
    if (userId) filter.user = userId;

    const logs = await BiometricLog.find(filter)
      .populate('user', 'name role deviceUserId')
      .sort('-punchTime')
      .limit(500);

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/biometric/settings
// Admin gets current late threshold settings
// ─────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/biometric/settings
// Super admin updates late threshold for all staff
// Body: { lateThresholdMinutes, shiftStartTime, latesPerAbsent }
// ─────────────────────────────────────────────
exports.updateSettings = async (req, res) => {
  try {
    const { lateThresholdMinutes, shiftStartTime, latesPerAbsent } = req.body;

    const updates = { updatedBy: req.user._id };
    if (lateThresholdMinutes !== undefined) updates.lateThresholdMinutes = Number(lateThresholdMinutes);
    if (shiftStartTime       !== undefined) updates.shiftStartTime       = shiftStartTime;
    if (latesPerAbsent       !== undefined) updates.latesPerAbsent       = Number(latesPerAbsent);

    let settings = await AttendanceSettings.findOne();
    if (!settings) {
      settings = await AttendanceSettings.create(updates);
    } else {
      Object.assign(settings, updates);
      await settings.save();
    }

    res.json({ message: 'Settings updated', settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};