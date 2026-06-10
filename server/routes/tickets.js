/* ─────────────────────────────────────────────
   Ticket Routes — /api/tickets  (Concern Raiser)
   
   POST /create        — Raise a concern/ticket
   GET  /my            — Own tickets
   GET  /all           — All tickets (HR: own dept, SA: all)
   PUT  /:id/status    — Update ticket status + resolution (HR/SA)
   ───────────────────────────────────────────── */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { sendEmail } = require('../utils/mailer');


/* ═══════════════════════════════════════
   POST /api/tickets/create
   Any employee can raise a concern
   ═══════════════════════════════════════ */
router.post('/create', auth, async (req, res) => {
  const { subject, description, priority } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tickets (raised_by, subject, description, priority)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, subject, description, priority || 'medium']
    );

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket: result.rows[0],
    });
  } catch (err) {
    console.error('Ticket create error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   GET /api/tickets/my
   Own tickets history
   ═══════════════════════════════════════ */
router.get('/my', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tickets WHERE raised_by = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ tickets: result.rows });
  } catch (err) {
    console.error('My tickets error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   GET /api/tickets/all
   HR → tickets from own department
   SA → all tickets
   ═══════════════════════════════════════ */
router.get('/all', auth, roleCheck('hr', 'super_admin'), async (req, res) => {
  try {
    let query = `
      SELECT t.*, e.name AS raised_by_name, e.emp_id AS raised_by_emp_id, e.department
      FROM tickets t
      JOIN employees e ON t.raised_by = e.id
      WHERE e.deleted_at IS NULL
    `;
    const params = [];

    // HR isolation
    if (req.user.role === 'hr') {
      query += ` AND e.department = $1`;
      params.push(req.user.department);
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ tickets: result.rows });
  } catch (err) {
    console.error('All tickets error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   PUT /api/tickets/:id/status
   HR/SA update ticket status and add resolution
   ═══════════════════════════════════════ */
router.put('/:id/status', auth, roleCheck('hr', 'super_admin'), async (req, res) => {
  const { status, resolution } = req.body;
  const ticketId = req.params.id;

  try {
    const ticketCheck = await pool.query(
      `SELECT t.*, e.email AS raised_by_email, e.name AS raised_by_name, e.department
       FROM tickets t
       JOIN employees e ON t.raised_by = e.id
       WHERE t.id = $1 AND e.deleted_at IS NULL`,
      [ticketId]
    );

    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticketRow = ticketCheck.rows[0];

    if (req.user.role === 'hr') {
      const hrProfile = await pool.query(
        'SELECT department FROM employees WHERE id = $1',
        [req.user.id]
      );
      const hrDept = hrProfile.rows[0]?.department;
      if (!hrDept || ticketRow.department !== hrDept) {
        return res.status(403).json({ message: 'You can only manage tickets from your department.' });
      }
    }

    const result = await pool.query(
      `UPDATE tickets 
       SET status = $1, resolution = $2, resolved_by = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [status, resolution, req.user.id, ticketId]
    );

    const updated = result.rows[0];

    if (status === 'resolved' || status === 'closed') {
      await sendEmail(
        ticketRow.raised_by_email,
        `Ticket Update: ${ticketRow.subject}`,
        `<h2>Hello ${ticketRow.raised_by_name},</h2>
         <p>Your concern has been updated by HR.</p>
         <table border="1" cellpadding="8" style="border-collapse:collapse">
           <tr><td><b>Subject</b></td><td>${ticketRow.subject}</td></tr>
           <tr><td><b>Status</b></td><td>${status}</td></tr>
           <tr><td><b>Resolution</b></td><td>${resolution || 'N/A'}</td></tr>
         </table>
         <p>Login to the HRMS portal to view details.</p>`
      );
    }

    res.json({ message: 'Ticket updated', ticket: updated });
  } catch (err) {
    console.error('Ticket status error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
