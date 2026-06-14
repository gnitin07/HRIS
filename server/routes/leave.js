/* ─────────────────────────────────────────────
   Leave Routes — /api/leave
   
   POST /apply         — Apply for CL or WFH (date range)
   GET  /my            — Own leave applications + balance
   GET  /all           — All leave applications (HR: own dept, SA: all)
   PUT  /approve/:id   — Approve or reject leave (HR/SA)
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

    await pool.query(
      `INSERT INTO leave_requests (employee_id, leave_type, from_date, to_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [employeeId, leave_type, from_date, to_date, reason]
    );

    res.status(201).json({ message: `${leave_type.toUpperCase()} leave applied. Awaiting approval.` });
  } catch (err) {
    console.error('Leave apply error:', err.message);
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

    res.json({
      applications: applications.rows,
      balance: balance.rows[0] || null,
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
      }

      // Mark attendance as leave
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
