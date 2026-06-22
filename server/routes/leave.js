/* ─────────────────────────────────────────────
   Leave Routes — /api/leave
   
   POST /apply                    — Apply for CL, WFH, or Regularization
   GET  /my                       — Own leave applications + balance
   GET  /all                      — All leave applications (HR: own dept, SA: all)
   PUT  /approve/:id              — Approve or reject leave (HR/SA)
   GET  /regularization/pending-days — Days needing regularization (employee)
   ───────────────────────────────────────────── */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { sendEmail } = require('../utils/mailer');


/* ═══════════════════════════════════════
   POST /api/leave/apply
   Apply for CL or WFH with from_date → to_date
   ═══════════════════════════════════════ */
router.post('/apply', auth, async (req, res) => {
  const { leave_type, from_date, to_date, reason } = req.body;
  const employeeId = req.user.id;

  try {
    // Check for overlapping leave
    const overlap = await pool.query(
      `SELECT * FROM leave_requests 
       WHERE employee_id = $1 
       AND status != 'rejected'
       AND (from_date <= $3 AND to_date >= $2)`,
      [employeeId, from_date, to_date]
    );

    if (overlap.rows.length > 0) {
      return res.status(400).json({ message: 'You already have a leave request for this date range.' });
    }

    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    if (leave_type === 'casual') {
      const fromD = new Date(from_date);
      const toD = new Date(to_date);
      if (fromD.getMonth() + 1 !== month || fromD.getFullYear() !== year || 
          toD.getMonth() + 1 !== month || toD.getFullYear() !== year) {
        return res.status(400).json({ message: 'Casual leaves must be applied within the current month.' });
      }

      const balRes = await pool.query(
        'SELECT casual_total, casual_used FROM leave_balances WHERE employee_id = $1 AND year = $2 AND month = $3',
        [employeeId, year, month]
      );
      if (balRes.rows.length > 0) {
        const { casual_total, casual_used } = balRes.rows[0];
        const pendingRes = await pool.query(
          `SELECT COUNT(*) FROM leave_requests 
           WHERE employee_id = $1 AND leave_type = 'casual' AND status = 'pending'
           AND EXTRACT(MONTH FROM from_date) = $2 AND EXTRACT(YEAR FROM from_date) = $3`,
          [employeeId, month, year]
        );
        const pendingCount = parseInt(pendingRes.rows[0].count);

        if ((casual_total - casual_used) - pendingCount < 1) {
          return res.status(400).json({ message: `Insufficient CL balance. Available: ${casual_total - casual_used}, On Hold: ${pendingCount}.` });
        }
      } else {
        return res.status(400).json({ message: 'Leave balance not initialized for this month. Please Check In or contact HR.' });
      }
    }

    if (leave_type === 'regularization') {
      // Regularization uses a single date (from_date). Force to_date = from_date.
      const regDate = from_date;

      // Validate the date is in the current month
      const regD = new Date(regDate);
      if (regD.getMonth() + 1 !== month || regD.getFullYear() !== year) {
        return res.status(400).json({ message: 'Regularization can only be applied for dates in the current month.' });
      }

      // Validate that the date actually needs regularization (late or short hours)
      const attRes = await pool.query(
        `SELECT a.*, EXTRACT(EPOCH FROM (a.check_out - a.check_in)) / 3600.0 AS hours_worked
         FROM attendance a WHERE a.employee_id = $1 AND a.date = $2`,
        [employeeId, regDate]
      );
      if (attRes.rows.length === 0) {
        return res.status(400).json({ message: 'No attendance record found for this date.' });
      }
      const attRecord = attRes.rows[0];
      // Already regularized or not eligible
      if (attRecord.status && attRecord.status.startsWith('reg_')) {
        return res.status(400).json({ message: 'This date has already been regularized.' });
      }

      // Check if it's late or short
      const deptResForAtt = await pool.query(`
        SELECT 
          COALESCE(d.hours_present, gs_pres.value::numeric, 8) AS hours_present,
          COALESCE(d.checkin_end, gs_end.value, '10:15') AS checkin_end
        FROM employees e
        LEFT JOIN departments d ON d.name = e.department
        LEFT JOIN system_settings gs_pres ON gs_pres.key = 'work_hours_required'
        LEFT JOIN system_settings gs_end ON gs_end.key = 'checkin_window_end'
        WHERE e.id = $1
      `, [employeeId]);
      
      const thresholdsAtt = deptResForAtt.rows[0] || { hours_present: 8, checkin_end: '10:15' };
      const [endH, endM] = thresholdsAtt.checkin_end.split(':').map(Number);
      const endMins = endH * 60 + endM;

      let isLate = false;
      if (attRecord.check_in) {
        const [inH, inM] = attRecord.check_in.split(':').map(Number);
        if ((inH * 60 + inM) > endMins) isLate = true;
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const isPastDay = new Date(attRecord.date).toISOString().split('T')[0] < todayStr;
      const hw = parseFloat(attRecord.hours_worked) || 0;
      let isShort = false;
      if (attRecord.check_out === null && isPastDay) isShort = true;
      else if (attRecord.check_out !== null && hw < parseFloat(thresholdsAtt.hours_present)) isShort = true;

      if (!isLate && !isShort && attRecord.status !== 'late') {
        return res.status(400).json({ message: 'This date does not need regularization (On Time & Full Hours).' });
      }

      // Check for duplicate pending request for same date
      const dupRes = await pool.query(
        `SELECT id FROM leave_requests WHERE employee_id = $1 AND leave_type = 'regularization' AND from_date = $2 AND status = 'pending'`,
        [employeeId, regDate]
      );
      if (dupRes.rows.length > 0) {
        return res.status(400).json({ message: 'You already have a pending regularization for this date.' });
      }

      // Check regularization limit
      const deptRes = await pool.query(`SELECT d.max_regularizations FROM employees e LEFT JOIN departments d ON e.department = d.name WHERE e.id = $1`, [employeeId]);
      let maxReg;
      if (deptRes.rows.length > 0 && deptRes.rows[0].max_regularizations !== null) {
        maxReg = parseInt(deptRes.rows[0].max_regularizations);
      } else {
        const settingRes = await pool.query("SELECT value FROM system_settings WHERE key = 'max_regularizations'");
        maxReg = settingRes.rows.length > 0 ? parseInt(settingRes.rows[0].value) : 3;
      }

      const balRes = await pool.query(
        'SELECT regularization_used FROM leave_balances WHERE employee_id = $1 AND year = $2 AND month = $3',
        [employeeId, year, month]
      );
      const regUsed = balRes.rows.length > 0 ? (balRes.rows[0].regularization_used || 0) : 0;

      const pendingRes = await pool.query(
        `SELECT COUNT(*) FROM leave_requests 
         WHERE employee_id = $1 AND leave_type = 'regularization' AND status = 'pending'
         AND EXTRACT(MONTH FROM from_date) = $2 AND EXTRACT(YEAR FROM from_date) = $3`,
        [employeeId, month, year]
      );
      const pendingCount = parseInt(pendingRes.rows[0].count);

      if ((maxReg - regUsed) - pendingCount < 1) {
        return res.status(400).json({ message: `Regularization limit reached. Used: ${regUsed}, Pending: ${pendingCount}, Max: ${maxReg}.` });
      }
    }

    // For regularization, force to_date = from_date (single day)
    const effectiveToDate = leave_type === 'regularization' ? from_date : to_date;

    await pool.query(
      `INSERT INTO leave_requests (employee_id, leave_type, from_date, to_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [employeeId, leave_type, from_date, effectiveToDate, reason]
    );

    res.status(201).json({ message: `${leave_type.toUpperCase()} leave applied. Awaiting approval.` });
  } catch (err) {
    console.error('Leave apply error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   GET /api/leave/regularization/pending-days
   Returns days needing regularization for the current month
   (late arrivals or insufficient hours with no existing reg)
   ═══════════════════════════════════════ */
router.get('/regularization/pending-days', auth, async (req, res) => {
  const employeeId = req.user.id;
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  try {
    // Get dept thresholds
    const deptRes = await pool.query(`
      SELECT 
        COALESCE(d.hours_present, gs_pres.value::numeric, 8) AS hours_present,
        COALESCE(d.hours_regularization, 7) AS hours_regularization,
        COALESCE(d.hours_half_day, 4) AS hours_half_day,
        COALESCE(d.checkin_end, gs_end.value, '10:15') AS checkin_end
      FROM employees e
      LEFT JOIN departments d ON d.name = e.department
      LEFT JOIN system_settings gs_pres ON gs_pres.key = 'work_hours_required'
      LEFT JOIN system_settings gs_end ON gs_end.key = 'checkin_window_end'
      WHERE e.id = $1
    `, [employeeId]);

    const thresholds = deptRes.rows[0] || { hours_present: 8, hours_regularization: 7, hours_half_day: 4, checkin_end: '10:15' };

    // Get all attendance records for current month that need regularization:
    // Exclude already regularized, on leave, half_day, absent
    const attRes = await pool.query(`
      SELECT a.id, a.date, a.check_in, a.check_out, a.status, a.attendance_mode,
             EXTRACT(EPOCH FROM (a.check_out - a.check_in)) / 3600.0 AS hours_worked
      FROM attendance a
      WHERE a.employee_id = $1
        AND EXTRACT(YEAR FROM a.date) = $2
        AND EXTRACT(MONTH FROM a.date) = $3
        AND a.check_in IS NOT NULL
        AND a.status NOT IN ('casual', 'holiday', 'absent', 'half_day', 'regularized')
        AND (a.status NOT LIKE 'reg_%')
      ORDER BY a.date ASC
    `, [employeeId, year, month]);

    const todayStr = new Date().toISOString().split('T')[0];
    const [endH, endM] = thresholds.checkin_end.split(':').map(Number);
    const endMins = endH * 60 + endM;

    // Filter to days that actually need regularization
    const pendingDays = attRes.rows.filter(row => {
      let isLate = false;
      if (row.check_in) {
        const [inH, inM] = row.check_in.split(':').map(Number);
        const inMins = inH * 60 + inM;
        if (inMins > endMins) isLate = true;
      }
      
      const isPastDay = new Date(row.date).toISOString().split('T')[0] < todayStr;
      const hw = parseFloat(row.hours_worked) || 0;
      
      let isShort = false;
      if (row.check_out === null && isPastDay) {
        isShort = true; // Forgot to checkout
      } else if (row.check_out !== null && hw < parseFloat(thresholds.hours_present)) {
        isShort = true; // Completed hours < required
      }

      return isLate || isShort || row.status === 'late';
    }).map(row => {
      let issueStr = [];
      let isLate = false;
      if (row.check_in) {
        const [inH, inM] = row.check_in.split(':').map(Number);
        if ((inH * 60 + inM) > endMins) isLate = true;
      }
      
      const isPastDay = new Date(row.date).toISOString().split('T')[0] < todayStr;
      const hw = parseFloat(row.hours_worked) || 0;
      let isShort = false;
      if (row.check_out === null && isPastDay) isShort = true;
      else if (row.check_out !== null && hw < parseFloat(thresholds.hours_present)) isShort = true;

      if (isLate || row.status === 'late') issueStr.push('Late Arrival');
      if (isShort) issueStr.push(row.check_out === null ? 'Missed Checkout' : 'Short Hours');

      return {
        id: row.id,
        date: row.date,
        check_in: row.check_in,
        check_out: row.check_out,
        status: row.status,
        hours_worked: row.check_out ? parseFloat(row.hours_worked || 0).toFixed(1) : '0.0',
        attendance_mode: row.attendance_mode,
        issue: issueStr.join(' + ')
      };
    });

    // Also check which dates already have a pending regularization request
    const pendingReqs = await pool.query(
      `SELECT from_date FROM leave_requests WHERE employee_id = $1 AND leave_type = 'regularization' AND status = 'pending'`,
      [employeeId]
    );
    const pendingDates = new Set(pendingReqs.rows.map(r => new Date(r.from_date).toISOString().split('T')[0]));

    const result = pendingDays.map(day => ({
      ...day,
      already_applied: pendingDates.has(new Date(day.date).toISOString().split('T')[0]),
    }));

    res.json({ pending_days: result, thresholds });
  } catch (err) {
    console.error('Regularization pending days error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   GET /api/leave/my
   Own leave applications + current balance
   ═══════════════════════════════════════ */
router.get('/my', auth, async (req, res) => {
  const employeeId = req.user.id;
  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1;

  try {
    const applications = await pool.query(
      'SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY applied_at DESC',
      [employeeId]
    );

    const balance = await pool.query(
      'SELECT * FROM leave_balances WHERE employee_id = $1 AND year = $2 AND month = $3',
      [employeeId, year, month]
    );

    const pendingCl = await pool.query(
      `SELECT COUNT(*) FROM leave_requests WHERE employee_id = $1 AND leave_type = 'casual' AND status = 'pending' AND EXTRACT(MONTH FROM from_date) = $2 AND EXTRACT(YEAR FROM from_date) = $3`,
      [employeeId, month, year]
    );

    const pendingReg = await pool.query(
      `SELECT COUNT(*) FROM leave_requests WHERE employee_id = $1 AND leave_type = 'regularization' AND status = 'pending' AND EXTRACT(MONTH FROM from_date) = $2 AND EXTRACT(YEAR FROM from_date) = $3`,
      [employeeId, month, year]
    );

    const deptRes = await pool.query(`SELECT d.max_regularizations FROM employees e LEFT JOIN departments d ON e.department = d.name WHERE e.id = $1`, [employeeId]);
    let maxReg;
    if (deptRes.rows.length > 0 && deptRes.rows[0].max_regularizations !== null) {
      maxReg = parseInt(deptRes.rows[0].max_regularizations);
    } else {
      const settingRes = await pool.query("SELECT value FROM system_settings WHERE key = 'max_regularizations'");
      maxReg = settingRes.rows.length > 0 ? parseInt(settingRes.rows[0].value) : 3;
    }

    res.json({
      applications: applications.rows,
      balance: balance.rows[0] || null,
      pending_cl: parseInt(pendingCl.rows[0].count),
      pending_reg: parseInt(pendingReg.rows[0].count),
      max_regularizations: maxReg,
    });
  } catch (err) {
    console.error('My leave error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   GET /api/leave/all
   HR → own department's leave applications
   SA → all applications
   ═══════════════════════════════════════ */
router.get('/all', auth, roleCheck('hr', 'super_admin'), async (req, res) => {
  try {
    let query = `
      SELECT lr.*, e.name, e.emp_id, e.department, e.designation
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE e.deleted_at IS NULL
    `;
    const params = [];

    // HR isolation
    if (req.user.role === 'hr') {
      query += ` AND e.department = $1`;
      params.push(req.user.department);
    }

    query += ` ORDER BY lr.applied_at DESC`;

    const result = await pool.query(query, params);
    res.json({ applications: result.rows });
  } catch (err) {
    console.error('All leave error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   PUT /api/leave/approve/:id
   HR/SA approve or reject a leave request
   ═══════════════════════════════════════ */
router.put('/approve/:id', auth, roleCheck('hr', 'super_admin'), async (req, res) => {
  const { status } = req.body; // 'approved' or 'rejected'
  const leaveId = req.params.id;

  try {
    // Get leave details
    const leaveRes = await pool.query('SELECT * FROM leave_requests WHERE id = $1', [leaveId]);
    if (leaveRes.rows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const leave = leaveRes.rows[0];

    // HR can only approve leaves from own department
    if (req.user.role === 'hr') {
      const emp = await pool.query('SELECT department FROM employees WHERE id = $1', [leave.employee_id]);
      if (emp.rows[0].department !== req.user.department) {
        return res.status(403).json({ message: 'Cannot approve leave from another department.' });
      }
    }

    // Update status
    await pool.query(
      'UPDATE leave_requests SET status = $1, reviewed_by = $2 WHERE id = $3',
      [status, req.user.id, leaveId]
    );

    if (status === 'approved') {
      const year = new Date().getFullYear();
      const month = new Date(leave.from_date).getMonth() + 1;

      // Deduct from balance
      if (leave.leave_type === 'casual') {
        await pool.query(
          `UPDATE leave_balances SET casual_used = casual_used + 1
           WHERE employee_id = $1 AND year = $2 AND month = $3`,
          [leave.employee_id, year, month]
        );
      } else if (leave.leave_type === 'wfh') {
        await pool.query(
          `UPDATE leave_balances SET wfh_used = wfh_used + 1
           WHERE employee_id = $1 AND year = $2 AND month = $3`,
          [leave.employee_id, year, month]
        );
      } else if (leave.leave_type === 'regularization') {
        await pool.query(
          `UPDATE leave_balances SET regularization_used = regularization_used + 1
           WHERE employee_id = $1 AND year = $2 AND month = $3`,
          [leave.employee_id, year, month]
        );

        // Compute the regularization number (reg_1, reg_2, reg_3)
        const regBalRes = await pool.query(
          'SELECT regularization_used FROM leave_balances WHERE employee_id = $1 AND year = $2 AND month = $3',
          [leave.employee_id, year, month]
        );
        const regNumber = regBalRes.rows[0]?.regularization_used || 1;
        const regStatus = `reg_${regNumber}`;

        // Update the attendance record for this date with the numbered reg status
        const leaveDate = leave.from_date.toISOString
          ? leave.from_date.toISOString().split('T')[0]
          : leave.from_date;

        await pool.query(
          `UPDATE attendance SET status = $1, leave_type = 'regularization'
           WHERE employee_id = $2 AND date = $3`,
          [regStatus, leave.employee_id, leaveDate]
        );
      } else if (leave.leave_type === 'half_day') {
        await pool.query(
          `UPDATE leave_balances SET casual_used = casual_used + 0.5
           WHERE employee_id = $1 AND year = $2 AND month = $3`,
          [leave.employee_id, year, month]
        );
      }

      // Mark attendance as leave (for non-regularization types)
      const leaveDate = leave.from_date.toISOString
        ? leave.from_date.toISOString().split('T')[0]
        : leave.from_date;

      if (new Date(leaveDate).getDay() !== 0) {
        if (leave.leave_type === 'casual') {
          await pool.query(
            `INSERT INTO attendance (employee_id, date, status, attendance_mode, leave_type)
             VALUES ($1, $2, 'casual', 'leave', $3)
             ON CONFLICT (employee_id, date) 
             DO UPDATE SET status='casual', attendance_mode='leave', leave_type=$3`,
            [leave.employee_id, leaveDate, leave.leave_type]
          );
        } else if (leave.leave_type === 'half_day') {
          await pool.query(
            `INSERT INTO attendance (employee_id, date, status, attendance_mode, leave_type)
             VALUES ($1, $2, 'half_day', 'wfo', $3)
             ON CONFLICT (employee_id, date) 
             DO UPDATE SET status='half_day', leave_type=$3`,
            [leave.employee_id, leaveDate, leave.leave_type]
          );
        }
        // If leave_type is wfh, we intentionally do NOT insert attendance yet.
        // The employee must manually 'Check In' which will insert the attendance record with mode='wfh'.
      }
    }

    // Send email notification
    const emp = await pool.query('SELECT name, email FROM employees WHERE id = $1', [leave.employee_id]);
    const leaveDate = leave.from_date.toISOString
      ? leave.from_date.toISOString().split('T')[0]
      : leave.from_date;

    const statusText = status === 'approved' ? 'approved ✅' : 'rejected ❌';
    await sendEmail(
      emp.rows[0].email,
      `Leave ${status === 'approved' ? 'Approved' : 'Rejected'}: ${leave.leave_type.toUpperCase()}`,
      `<h2>Hello ${emp.rows[0].name},</h2>
       <p>Your <strong>${leave.leave_type.toUpperCase()}</strong> leave for 
       <strong>${leaveDate}</strong> has been <strong>${statusText}</strong>.</p>
       <p>Reason: ${leave.reason || 'N/A'}</p>`
    );

    res.json({ message: `Leave ${status} successfully` });
  } catch (err) {
    console.error('Leave approve error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
