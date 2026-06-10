/* ─────────────────────────────────────────────
   Department Routes — /api/departments

   GET  /           — List all departments (all logged-in users)
   POST /           — Create department (SA only)
   PUT  /:id        — Update department / assign HR (SA only)
   DELETE /:id      — Remove department if empty (SA only)
   ───────────────────────────────────────────── */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.name, d.hr_id, d.created_at,
             e.name AS hr_name, e.emp_id AS hr_emp_id, e.email AS hr_email
      FROM departments d
      LEFT JOIN employees e ON d.hr_id = e.id
      ORDER BY d.name ASC
    `);
    res.json({ departments: result.rows });
  } catch (err) {
    console.error('Departments list error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, roleCheck('super_admin'), async (req, res) => {
  const { name } = req.body;
  const trimmed = name?.trim();

  if (!trimmed) {
    return res.status(400).json({ message: 'Department name is required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO departments (name) VALUES ($1) RETURNING *',
      [trimmed]
    );
    res.status(201).json({ message: 'Department created', department: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Department already exists.' });
    }
    console.error('Department create error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, roleCheck('super_admin'), async (req, res) => {
  const { name, hr_id } = req.body;
  const deptId = req.params.id;

  try {
    const existing = await pool.query('SELECT * FROM departments WHERE id = $1', [deptId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    if (hr_id !== undefined && hr_id !== null && hr_id !== '') {
      const hr = await pool.query(
        "SELECT id, role, department FROM employees WHERE id = $1 AND role = 'hr'",
        [hr_id]
      );
      if (hr.rows.length === 0) {
        return res.status(400).json({ message: 'Selected HR user not found.' });
      }

      const deptName = name?.trim() || existing.rows[0].name;
      if (hr.rows[0].department !== deptName) {
        await pool.query('UPDATE employees SET department = $1 WHERE id = $2', [deptName, hr_id]);
      }
    }

    const newName = name?.trim() || existing.rows[0].name;
    const newHrId = hr_id === '' || hr_id === null ? null : (hr_id ?? existing.rows[0].hr_id);

    const result = await pool.query(
      'UPDATE departments SET name = $1, hr_id = $2 WHERE id = $3 RETURNING *',
      [newName, newHrId, deptId]
    );

    if (newHrId) {
      await pool.query('UPDATE employees SET department = $1 WHERE id = $2', [newName, newHrId]);
    }

    res.json({ message: 'Department updated', department: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Department name already exists.' });
    }
    console.error('Department update error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const dept = await pool.query('SELECT name FROM departments WHERE id = $1', [req.params.id]);
    if (dept.rows.length === 0) {
      return res.status(404).json({ message: 'Department not found.' });
    }

    const inUse = await pool.query(
      'SELECT COUNT(*)::int AS count FROM employees WHERE department = $1',
      [dept.rows[0].name]
    );
    if (inUse.rows[0].count > 0) {
      return res.status(400).json({
        message: 'Cannot delete department with assigned employees. Reassign them first.',
      });
    }

    await pool.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error('Department delete error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
