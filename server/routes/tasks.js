/* ─────────────────────────────────────────────
   Task Routes — /api/tasks
   
   POST /assign        — Assign task + email notification (HR/SA)
   GET  /my            — My assigned tasks
   GET  /all           — All tasks (HR: own dept, SA: all)
   PUT  /status/:id    — Update task status (employee marks done)
   ───────────────────────────────────────────── */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { sendEmail } = require('../utils/mailer');


/* ═══════════════════════════════════════
   POST /api/tasks/assign
   HR → assign to own department employees only
   SA → assign to anyone
   ═══════════════════════════════════════ */
router.post('/assign', auth, roleCheck('hr', 'super_admin'), async (req, res) => {
  const { title, description, assigned_to_emp_id, priority, due_date } = req.body;

  try {
    // Get target employee
    const emp = await pool.query('SELECT * FROM employees WHERE emp_id = $1', [assigned_to_emp_id]);
    if (emp.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employee = emp.rows[0];

    // HR isolation: can only assign to own department
    if (req.user.role === 'hr' && employee.department !== req.user.department) {
      return res.status(403).json({ message: 'You can only assign tasks to your department.' });
    }

    // Create task
    const result = await pool.query(
      `INSERT INTO tasks (title, description, assigned_to, assigned_by, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, employee.id, req.user.id, priority || 'medium', due_date]
    );

    const task = result.rows[0];

    // Send email notification
    const emailSent = await sendEmail(
      employee.email,
      `New Task Assigned: ${task.title}`,
      `<h2>Hello ${employee.name},</h2>
       <p>A new task has been assigned to you.</p>
       <table border="1" cellpadding="8" style="border-collapse:collapse">
         <tr><td><b>Task</b></td><td>${task.title}</td></tr>
         <tr><td><b>Description</b></td><td>${task.description || 'N/A'}</td></tr>
         <tr><td><b>Priority</b></td><td>${task.priority}</td></tr>
         <tr><td><b>Due Date</b></td><td>${task.due_date || 'Not set'}</td></tr>
       </table>
       <p>Please login to the HRMS portal to update your task.</p>`
    );

    if (emailSent) {
      await pool.query('UPDATE tasks SET notification_sent = true WHERE id = $1', [task.id]);
    }

    res.status(201).json({
      message: 'Task assigned successfully',
      task: { ...task, notification_sent: emailSent },
    });
  } catch (err) {
    console.error('Task assign error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   GET /api/tasks/my
   Employee sees their assigned tasks
   ═══════════════════════════════════════ */
router.get('/my', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, e.name AS assigned_by_name
       FROM tasks t
       JOIN employees e ON t.assigned_by = e.id
       WHERE t.assigned_to = $1 AND e.deleted_at IS NULL
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error('My tasks error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   GET /api/tasks/all
   HR → tasks in own department only
   SA → all tasks
   ═══════════════════════════════════════ */
router.get('/all', auth, roleCheck('hr', 'super_admin'), async (req, res) => {
  try {
    let query = `
      SELECT t.*, 
             e1.name AS assigned_to_name, e1.emp_id AS assigned_to_emp_id,
             e2.name AS assigned_by_name
      FROM tasks t
      JOIN employees e1 ON t.assigned_to = e1.id
      JOIN employees e2 ON t.assigned_by = e2.id
      WHERE e1.deleted_at IS NULL AND e2.deleted_at IS NULL
    `;
    const params = [];

    // HR isolation
    if (req.user.role === 'hr') {
      query += ` AND e1.department = $1`;
      params.push(req.user.department);
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error('All tasks error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   PUT /api/tasks/status/:id
   Employee updates their own task status
   ═══════════════════════════════════════ */
router.put('/status/:id', auth, async (req, res) => {
  const { status } = req.body; // pending | in_progress | done

  try {
    const result = await pool.query(
      'UPDATE tasks SET status = $1 WHERE id = $2 AND assigned_to = $3 RETURNING *',
      [status, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found or not assigned to you.' });
    }

    res.json({ message: 'Task status updated', task: result.rows[0] });
  } catch (err) {
    console.error('Task status error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
