const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/logs', auth, roleCheck('developer'), async (req, res) => {
  const { action, limit = 100 } = req.query;

  try {
    let query = `
      SELECT al.*, e.name AS user_name, e.emp_id AS user_emp_id
      FROM audit_logs al
      LEFT JOIN employees e ON al.user_id = e.id
    `;
    const params = [];

    if (action) {
      query += ` WHERE al.action ILIKE $1`;
      params.push(`%${action}%`);
    }

    query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1}`;
    params.push(Math.min(parseInt(limit, 10) || 100, 500));

    const result = await pool.query(query, params);
    res.json({ logs: result.rows });
  } catch (err) {
    console.error('Audit logs error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
