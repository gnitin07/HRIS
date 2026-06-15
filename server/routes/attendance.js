/* ─────────────────────────────────────────────
   Attendance Routes — /api/attendance
   
   GET  /today-status   — Today's status + leave balance
   POST /checkin         — GPS check-in (geofence validated)
   POST /checkout        — Check-out
   POST /wfh             — Mark WFH for today
   POST /apply-leave     — Quick CL apply for today
   POST /mark-absent     — Mark non-checked-in as absent (HR/SA)
   PUT  /edit            — Edit any attendance record (SA)
   GET  /my              — Own attendance history
   GET  /report          — Filtered attendance report (HR/SA)
   POST /holiday         — Declare restricted holiday (HR/SA)
   GET  /holidays        — List all holidays
   ───────────────────────────────────────────── */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { checkGeofence } = require('../utils/geofence');


/* ─── Helpers ─── */

async function getSetting(key) {
  const res = await pool.query('SELECT value FROM system_settings WHERE key = $1', [key]);
  return res.rows[0]?.value;
}

function isSunday(dateStr) {
  return new Date(dateStr).getDay() === 0;
}

function getTodayDate() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata'
  });
}

function getCurrentTime() {
  return new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour12: false
  });
}


/* ═══════════════════════════════════════
   GET /api/attendance/today-status
   What's my status today? (check-in available? on leave? holiday?)
   ═══════════════════════════════════════ */
router.get('/today-status', auth, async (req, res) => {
  const employeeId = req.user.id;
  const today = getTodayDate();
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  try {
    // Parallel queries for speed
    const [
      holidayRes,
      attendanceRes,
      leaveRes,
      empRes,
    ] = await Promise.all([
      pool.query('SELECT * FROM holidays WHERE date = $1', [today]),
      pool.query('SELECT * FROM attendance WHERE employee_id = $1 AND date = $2', [employeeId, today]),
      pool.query(
        `SELECT * FROM leave_requests 
         WHERE employee_id = $1 AND $2 BETWEEN from_date AND to_date AND status = 'approved'`,
        [employeeId, today]
      ),
      pool.query('SELECT * FROM employees WHERE id = $1', [employeeId]),
    ]);

    const emp = empRes.rows[0];

    // Get or create leave balance for this month
    let balRes = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2 AND month = $3',
      [employeeId, year, month]
    );

    if (balRes.rows.length === 0) {
      // Calculate carry-forward CL from previous months
      const prevBal = await pool.query(
        `SELECT COALESCE(SUM(casual_total - casual_used), 0) AS carry
         FROM leave_balances WHERE employee_id = $1 AND year = $2 AND month < $3`,
        [employeeId, year, month]
      );

      const carryForward = parseInt(prevBal.rows[0].carry) || 0;

      await pool.query(
        `INSERT INTO leave_balances (employee_id, year, month, casual_total, casual_used, wfh_total, wfh_used)
         VALUES ($1, $2, $3, $4, 0, $5, 0)
         ON CONFLICT (employee_id, year, month) DO NOTHING`,
        [employeeId, year, month, emp.cl_total + carryForward, emp.wfh_days_month]
      );

      balRes = await pool.query(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2 AND month = $3',
        [employeeId, year, month]
      );
    }

    // CL used this month
    const clUsedRes = await pool.query(
      `SELECT COUNT(*) FROM leave_requests 
       WHERE employee_id = $1 AND leave_type = 'casual' 
       AND status != 'rejected'
       AND EXTRACT(MONTH FROM from_date) = $2
       AND EXTRACT(YEAR FROM from_date) = $3`,
      [employeeId, month, year]
    );

    // Check leave type
    const leave = leaveRes.rows[0] || null;
    let isWfhApproved = false;
    let onApprovedLeave = false;

    if (leave) {
      if (leave.leave_type === 'wfh') {
        isWfhApproved = true;
      } else {
        onApprovedLeave = true;
      }
    }

    res.json({
      is_sunday: isSunday(today),
      is_holiday: holidayRes.rows.length > 0,
      holiday_name: holidayRes.rows[0]?.name || null,
      attendance: attendanceRes.rows[0] || null,
      on_approved_leave: onApprovedLeave,
      approved_leave: leave,
      is_wfh_approved: isWfhApproved,
      employee: {
        wfh_days_month: emp.wfh_days_month,
        designation: emp.designation,
        cl_total: emp.cl_total,
      },
      balance: balRes.rows[0] || null,
      cl_used_this_month: parseInt(clUsedRes.rows[0].count),
      window_start: await getSetting('checkin_window_start') || '09:30',
      window_end: await getSetting('checkin_window_end') || '10:15',
    });
  } catch (err) {
    console.error('Today status error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   POST /api/attendance/checkin
   GPS check-in — validates geofence first
   ═══════════════════════════════════════ */
router.post('/checkin', auth, async (req, res) => {
  const { latitude, longitude } = req.body;
  const employeeId = req.user.id;
  const today = getTodayDate();

  try {
    // Block: Sunday
    if (isSunday(today)) {
      return res.status(400).json({ message: 'Today is Sunday. No attendance required.' });
    }

    // Block: Holiday
    const holiday = await pool.query('SELECT * FROM holidays WHERE date = $1', [today]);
    if (holiday.rows.length > 0) {
      return res.status(400).json({ message: `Today is a holiday: ${holiday.rows[0].name}` });
    }

    // Block: On approved casual leave
    const leave = await pool.query(
      `SELECT * FROM leave_requests 
       WHERE employee_id = $1 AND $2 BETWEEN from_date AND to_date AND status = 'approved'`,
      [employeeId, today]
    );
    let isWfhApproved = false;
    if (leave.rows.length > 0) {
      if (leave.rows[0].leave_type === 'wfh') {
        isWfhApproved = true;
      } else {
        return res.status(400).json({ message: 'You are on approved leave today.' });
      }
    }

    // Validate geofence ONLY IF not WFH
    if (!isWfhApproved) {
      const officeLat = parseFloat(await getSetting('office_lat'));
      const officeLng = parseFloat(await getSetting('office_lng'));
      const radius = parseFloat(await getSetting('office_radius_meters'));

      const geo = checkGeofence(latitude, longitude, officeLat, officeLng, radius);
      if (!geo.inside) {
        return res.status(403).json({
          message: `You are ${geo.distance}m away. Must be within ${radius}m of office.`,
        });
      }
    }

    // Determine late/on-time
    const windowEnd = await getSetting('checkin_window_end') || '10:15';
    const now = new Date();
    const [wEndH, wEndM] = windowEnd.split(':').map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const endMins = wEndH * 60 + wEndM;
    const status = nowMins > endMins ? 'late' : 'present';
    const timeStr = getCurrentTime();

    // Check existing record
    const existing = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

    if (existing.rows.length > 0) {
      const record = existing.rows[0];

      // Already checked in but not out → this is a checkout
      if (record.check_in && !record.check_out) {
        // Validate geofence on checkout for WFO employees
        if (record.attendance_mode === 'wfo') {
          const officeLat = parseFloat(await getSetting('office_lat'));
          const officeLng = parseFloat(await getSetting('office_lng'));
          const radius = parseFloat(await getSetting('office_radius_meters'));
          const geo = checkGeofence(latitude, longitude, officeLat, officeLng, radius);
          if (!geo.inside) {
            return res.status(403).json({
              message: `Cannot check out: You are ${geo.distance}m away. Must be within ${radius}m of office.`,
            });
          }
        }
        await pool.query(
          'UPDATE attendance SET check_out = $1, check_out_lat = $4, check_out_lng = $5 WHERE employee_id = $2 AND date = $3',
          [timeStr, employeeId, today, latitude, longitude]
        );
        return res.json({ message: 'Checked out successfully', type: 'checkout', time: timeStr });
      }

      // Already done for today
      if (record.check_in && record.check_out) {
        return res.status(400).json({ message: 'Already checked in and out today.' });
      }

      // Update existing (e.g., was marked absent, now checking in)
      const mode = isWfhApproved ? 'wfh' : 'wfo';
      await pool.query(
        `UPDATE attendance 
         SET check_in=$1, status=$2, attendance_mode=$3, check_in_lat=$4, check_in_lng=$5
         WHERE employee_id=$6 AND date=$7`,
        [timeStr, status, mode, latitude, longitude, employeeId, today]
      );
    } else {
      // Fresh check-in
      const mode = isWfhApproved ? 'wfh' : 'wfo';
      await pool.query(
        `INSERT INTO attendance (employee_id, date, check_in, check_in_lat, check_in_lng, status, attendance_mode)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [employeeId, today, timeStr, latitude, longitude, status, mode]
      );
    }

    res.json({ message: `Checked in (${isWfhApproved ? 'WFH' : 'WFO'})`, status, type: 'checkin', time: timeStr });
  } catch (err) {
    console.error('Checkin error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   POST /api/attendance/checkout
   Separate checkout endpoint — GPS geofence validated for WFO
   ═══════════════════════════════════════ */
router.post('/checkout', auth, async (req, res) => {
  const { latitude, longitude } = req.body;
  const employeeId = req.user.id;
  const today = getTodayDate();
  const timeStr = getCurrentTime();

  try {
    const existing = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
      [employeeId, today]
    );

    if (existing.rows.length === 0 || !existing.rows[0].check_in) {
      return res.status(400).json({ message: 'You have not checked in today.' });
    }

    if (existing.rows[0].check_out) {
      return res.status(400).json({ message: 'Already checked out today.' });
    }

    const record = existing.rows[0];

    // Validate geofence for WFO employees (WFH employees can check out from anywhere)
    if (record.attendance_mode === 'wfo') {
      if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Location is required for checkout.' });
      }

      const officeLat = parseFloat(await getSetting('office_lat'));
      const officeLng = parseFloat(await getSetting('office_lng'));
      const radius = parseFloat(await getSetting('office_radius_meters'));

      const geo = checkGeofence(latitude, longitude, officeLat, officeLng, radius);
      if (!geo.inside) {
        return res.status(403).json({
          message: `Cannot check out: You are ${geo.distance}m away. Must be within ${radius}m of office.`,
        });
      }
    }

    await pool.query(
      'UPDATE attendance SET check_out = $1, check_out_lat = $4, check_out_lng = $5 WHERE employee_id = $2 AND date = $3',
      [timeStr, employeeId, today, latitude || null, longitude || null]
    );

    res.json({ message: 'Checked out successfully', time: timeStr });
  } catch (err) {
    console.error('Checkout error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});



/* ═══════════════════════════════════════
   POST /api/attendance/apply-leave
   Quick CL apply for today
   ═══════════════════════════════════════ */
router.post('/apply-leave', auth, async (req, res) => {
  const { reason } = req.body;
  const employeeId = req.user.id;
  const today = getTodayDate();
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  try {
    if (isSunday(today)) return res.status(400).json({ message: 'Today is Sunday.' });

    const holiday = await pool.query('SELECT * FROM holidays WHERE date = $1', [today]);
    if (holiday.rows.length > 0) return res.status(400).json({ message: 'Today is a holiday.' });

    // Check if already applied for today
    const existing = await pool.query(
      `SELECT * FROM leave_requests WHERE employee_id = $1 AND $2 BETWEEN from_date AND to_date`,
      [employeeId, today]
    );
    if (existing.rows.length > 0) return res.status(400).json({ message: 'Leave already applied for today.' });

    // Check CL balance
    const emp = await pool.query('SELECT * FROM employees WHERE id = $1', [employeeId]);
    let bal = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2 AND month = $3',
      [employeeId, year, month]
    );

    if (bal.rows.length === 0) {
      await pool.query(
        `INSERT INTO leave_balances (employee_id, year, month, casual_total, casual_used, wfh_total, wfh_used)
         VALUES ($1, $2, $3, $4, 0, $5, 0)`,
        [employeeId, year, month, emp.rows[0].cl_total, emp.rows[0].wfh_days_month]
      );
      bal = await pool.query(
        'SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2 AND month = $3',
        [employeeId, year, month]
      );
    }

    const clLeft = bal.rows[0].casual_total - bal.rows[0].casual_used;
    if (clLeft <= 0) return res.status(400).json({ message: 'No CL balance remaining.' });

    // Apply
    await pool.query(
      `INSERT INTO leave_requests (employee_id, leave_type, from_date, to_date, reason, status)
       VALUES ($1, 'casual', $2, $2, $3, 'pending')`,
      [employeeId, today, reason]
    );

    res.json({
      message: 'CL applied. Awaiting HR approval.',
      cl_remaining_if_approved: clLeft - 1,
    });
  } catch (err) {
    console.error('Apply leave error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   POST /api/attendance/mark-absent
   HR/SA marks all non-checked-in employees as absent
   HR → only marks own department
   ═══════════════════════════════════════ */
router.post('/mark-absent', auth, roleCheck('hr', 'super_admin'), async (req, res) => {
  const { date } = req.body;

  try {
    if (isSunday(date)) return res.status(400).json({ message: 'Cannot mark absent on Sunday.' });

    const holiday = await pool.query('SELECT * FROM holidays WHERE date = $1', [date]);
    if (holiday.rows.length > 0) return res.status(400).json({ message: 'That is a restricted holiday.' });

    // HR: only own department, SA: all
    let empQuery = `SELECT id FROM employees WHERE role IN ('employee', 'hr') AND deleted_at IS NULL`;
    const params = [];
    if (req.user.role === 'hr') {
      const hrRow = await pool.query('SELECT department FROM employees WHERE id = $1', [req.user.id]);
      const hrDept = hrRow.rows[0]?.department;
      if (!hrDept) {
        return res.status(400).json({ message: 'HR account has no department assigned.' });
      }
      empQuery += ` AND department = $1`;
      params.push(hrDept);
    }

    const employees = await pool.query(empQuery, params);
    let count = 0;

    for (const emp of employees.rows) {
      const ex = await pool.query(
        'SELECT id FROM attendance WHERE employee_id = $1 AND date = $2',
        [emp.id, date]
      );
      if (ex.rows.length === 0) {
        await pool.query(
          `INSERT INTO attendance (employee_id, date, status, attendance_mode)
           VALUES ($1, $2, 'absent', 'wfo')`,
          [emp.id, date]
        );
        count++;
      }
    }

    res.json({ message: `Marked ${count} employees as absent for ${date}` });
  } catch (err) {
    console.error('Mark absent error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   PUT /api/attendance/edit
   SA only — edit any employee's check-in/out
   ═══════════════════════════════════════ */
router.put('/edit', auth, roleCheck('super_admin'), async (req, res) => {
  const { emp_id, date, check_in, check_out, status } = req.body;

  try {
    const emp = await pool.query('SELECT id FROM employees WHERE emp_id = $1', [emp_id]);
    if (emp.rows.length === 0) return res.status(404).json({ message: 'Employee not found' });

    const eid = emp.rows[0].id;

    const existing = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
      [eid, date]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE attendance SET check_in=$1, check_out=$2, status=$3 WHERE employee_id=$4 AND date=$5',
        [check_in, check_out, status, eid, date]
      );
    } else {
      await pool.query(
        `INSERT INTO attendance (employee_id, date, check_in, check_out, status, attendance_mode)
         VALUES ($1, $2, $3, $4, $5, 'wfo')`,
        [eid, date, check_in, check_out, status]
      );
    }

    res.json({ message: 'Attendance updated successfully' });
  } catch (err) {
    console.error('Edit attendance error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   GET /api/attendance/my
   Own attendance history (last 30 days)
   ═══════════════════════════════════════ */
router.get('/my', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = $1 ORDER BY date DESC LIMIT 30',
      [req.user.id]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('My attendance error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   GET /api/attendance/report
   HR → own department only
   SA → everyone
   ═══════════════════════════════════════ */
router.get('/report', auth, roleCheck('hr', 'super_admin'), async (req, res) => {
  const { from_date, to_date, employee_id, department } = req.query;

  if (!from_date || !to_date) {
    return res.status(400).json({ message: 'from_date and to_date are required.' });
  }

  try {
    let query = `
      SELECT e.emp_id, e.name, e.department, e.branch, e.designation,
             a.date, a.check_in, a.check_out, a.status,
             a.attendance_mode, a.leave_type, a.is_holiday, a.holiday_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date BETWEEN $1 AND $2 AND e.deleted_at IS NULL
    `;
    const params = [from_date, to_date];
    let paramIdx = 3;

    if (req.user.role === 'hr') {
      const hrRow = await pool.query('SELECT department FROM employees WHERE id = $1', [req.user.id]);
      const hrDept = hrRow.rows[0]?.department;
      if (!hrDept) {
        return res.status(400).json({ message: 'HR account has no department assigned.' });
      }
      query += ` AND e.department = $${paramIdx}`;
      params.push(hrDept);
      paramIdx++;
    }

    if (employee_id) {
      query += ` AND e.emp_id = $${paramIdx}`;
      params.push(employee_id);
      paramIdx++;
    }

    if (department && req.user.role === 'super_admin') {
      query += ` AND e.department = $${paramIdx}`;
      params.push(department);
      paramIdx++;
    }

    query += ' ORDER BY a.date DESC, e.name ASC';

    const result = await pool.query(query, params);
    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('Report error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   POST /api/attendance/holiday
   HR/SA declares a restricted holiday
   ═══════════════════════════════════════ */
router.post('/holiday', auth, roleCheck('hr', 'super_admin'), async (req, res) => {
  const { date, name } = req.body;

  try {
    await pool.query(
      'INSERT INTO holidays (date, name, declared_by) VALUES ($1, $2, $3) ON CONFLICT (date) DO UPDATE SET name = $2',
      [date, name, req.user.id]
    );

    // Mark holiday attendance for all employees
    const employees = await pool.query(`SELECT id FROM employees WHERE role IN ('employee', 'hr') AND deleted_at IS NULL`);
    for (const emp of employees.rows) {
      await pool.query(
        `INSERT INTO attendance (employee_id, date, status, attendance_mode, is_holiday, holiday_name)
         VALUES ($1, $2, 'holiday', 'holiday', true, $3)
         ON CONFLICT (employee_id, date) DO UPDATE SET status='holiday', is_holiday=true, holiday_name=$3`,
        [emp.id, date, name]
      );
    }

    res.json({ message: `${name} declared as holiday for ${date}` });
  } catch (err) {
    console.error('Holiday error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   GET /api/attendance/holidays
   List all holidays
   ═══════════════════════════════════════ */
router.get('/holidays', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM holidays ORDER BY date DESC');
    res.json({ holidays: result.rows });
  } catch (err) {
    console.error('Holidays list error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
