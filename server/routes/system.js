const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const TABLES = [
  'employees', 'departments', 'office_locations', 'attendance',
  'leave_requests', 'leave_balances', 'tasks', 'tickets',
  'notifications', 'notification_reads', 'audit_logs', 'system_settings', 'holidays',
];

router.get('/overview', auth, roleCheck('developer'), async (req, res) => {
  try {
    const stats = [];

    for (const table of TABLES) {
      const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
      stats.push({ table, count: result.rows[0].count });
    }

    const recentEmployees = await pool.query(
      `SELECT emp_id, name, role, department, created_at FROM employees ORDER BY created_at DESC LIMIT 5`
    );

    const recentLogs = await pool.query(
      `SELECT al.action, al.created_at, e.name AS user_name
       FROM audit_logs al LEFT JOIN employees e ON al.user_id = e.id
       ORDER BY al.created_at DESC LIMIT 5`
    );

    const today = new Date().toISOString().split('T')[0];
    const [attendanceToday, leavesToday, ticketsResolvedToday] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int FROM attendance WHERE date = $1`, [today]),
      pool.query(`SELECT COUNT(*)::int FROM leave_requests WHERE DATE(applied_at) = $1`, [today]),
      pool.query(`SELECT COUNT(*)::int FROM tickets WHERE DATE(updated_at) = $1 AND status IN ('resolved', 'closed')`, [today])
    ]);

    res.json({
      table_stats: stats,
      recent_employees: recentEmployees.rows,
      recent_audit: recentLogs.rows,
      total_users: stats.find(s => s.table === 'employees')?.count || 0,
      todays_activity: {
        checkins: attendanceToday.rows[0].count,
        leave_requests: leavesToday.rows[0].count,
        tickets_resolved: ticketsResolvedToday.rows[0].count
      }
    });
  } catch (err) {
    console.error('System overview error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
