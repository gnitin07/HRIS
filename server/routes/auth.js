/* ─────────────────────────────────────────────
   Auth Routes — /api/auth
   
   POST /login              — Login with emp_id + password
   POST /register           — Register employee (HR: own dept, SA: any)
   GET  /me                 — Get current logged-in user profile
   GET  /employees          — List employees (HR: own dept only, SA: all)
   PUT  /employees/:id      — Edit employee (SA only)
   DELETE /employees/:id    — Remove employee (SA only)
   PUT  /change-password    — Change own password
   GET  /settings           — Get system settings (SA only)
   PUT  /settings           — Update system settings (SA only)
   ───────────────────────────────────────────── */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { logAudit } = require('../utils/audit');


/* ═══════════════════════════════════════
   POST /api/auth/login
   ═══════════════════════════════════════ */
router.post('/login', async (req, res) => {
  const { emp_id, password } = req.body;

  try {
    // Find employee
    const result = await pool.query(
      'SELECT * FROM employees WHERE emp_id = $1 AND deleted_at IS NULL',
      [emp_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Employee ID not found' });
    }

    const employee = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, employee.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Generate JWT (12 hour expiry)
    const token = jwt.sign(
      {
        id: employee.id,
        emp_id: employee.emp_id,
        role: employee.role,
        department: employee.department,
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Return token + safe employee data
    res.json({
      message: 'Login successful',
      token,
      employee: {
        id: employee.id,
        emp_id: employee.emp_id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        branch: employee.branch,
        designation: employee.designation,
        wfh_days_month: employee.wfh_days_month,
        cl_total: employee.cl_total,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   POST /api/auth/register
   HR → can only register employees in OWN department
   SA → can register anyone (including HR)
   Nobody can create super_admin or developer
   ═══════════════════════════════════════ */
router.post('/register', auth, roleCheck('hr', 'super_admin'), async (req, res) => {
  const {
    emp_id, name, email, mobile, department, branch,
    role, designation, joining_date, password,
    cl_total, wfh_days_month,
  } = req.body;

  // Block creating super_admin or developer accounts
  if (role === 'super_admin' || role === 'developer') {
    return res.status(403).json({ message: 'Cannot create Super Admin or Developer accounts.' });
  }

  // HR cannot create other HR accounts
  if (req.user.role === 'hr' && role === 'hr') {
    return res.status(403).json({ message: 'Only Super Admin can create HR accounts.' });
  }

  try {
    let effectiveDepartment = department?.trim();

    if (req.user.role === 'hr') {
      const hrProfile = await pool.query(
        'SELECT department FROM employees WHERE id = $1',
        [req.user.id]
      );
      effectiveDepartment = hrProfile.rows[0]?.department;
      if (!effectiveDepartment) {
        return res.status(400).json({
          message: 'Your HR account has no department. Ask Super Admin to assign you in Departments.',
        });
      }
    } else {
      if (!effectiveDepartment) {
        return res.status(400).json({ message: 'Please select a department.' });
      }
      const deptCheck = await pool.query(
        'SELECT id FROM departments WHERE name = $1',
        [effectiveDepartment]
      );
      if (deptCheck.rows.length === 0) {
        return res.status(400).json({
          message: 'Invalid department. Add it under Departments first, then select from the list.',
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO employees 
        (emp_id, name, email, mobile, department, branch, role, designation, joining_date, password, cl_total, wfh_days_month)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) 
       RETURNING id, emp_id, name, email, role, department`,
      [
        emp_id, name, email, mobile, effectiveDepartment, branch,
        role || 'employee', designation, joining_date, hashedPassword,
        cl_total !== undefined ? cl_total : 1,
        wfh_days_month !== undefined ? wfh_days_month : 0,
      ]
    );

    await logAudit({
      userId: req.user.id,
      action: 'employee_registered',
      entityType: 'employee',
      entityId: result.rows[0].id,
      details: { emp_id, department: effectiveDepartment, role: role || 'employee' },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Employee registered successfully',
      employee: result.rows[0],
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


/* ═══════════════════════════════════════
   GET /api/auth/me
   Returns the current logged-in user's profile
   ═══════════════════════════════════════ */
router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, emp_id, name, email, mobile, department, branch, 
              role, designation, joining_date, cl_total, wfh_days_month
       FROM employees WHERE id = $1 AND deleted_at IS NULL`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ employee: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   GET /api/auth/employees
   HR  → sees only employees in their department
   SA  → sees everyone
   ═══════════════════════════════════════ */
router.get('/employees', auth, roleCheck('hr', 'super_admin', 'developer'), async (req, res) => {
  try {
    const { search, role: roleFilter, department: deptFilter } = req.query;
    const conditions = ['deleted_at IS NULL'];
    const params = [];

    if (req.user.role === 'hr') {
      const hrRow = await pool.query('SELECT department FROM employees WHERE id = $1', [req.user.id]);
      const hrDept = hrRow.rows[0]?.department;
      if (hrDept) {
        conditions.push(`department = $${params.length + 1}`);
        params.push(hrDept);
      }
    } else if (deptFilter) {
      conditions.push(`department = $${params.length + 1}`);
      params.push(deptFilter);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(`(name ILIKE $${params.length + 1} OR emp_id ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`);
      params.push(term);
    }

    if (roleFilter) {
      conditions.push(`role = $${params.length + 1}`);
      params.push(roleFilter);
    }

    let query = `
      SELECT id, emp_id, name, email, mobile, department, branch, 
             role, designation, joining_date, cl_total, wfh_days_month
      FROM employees
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY department ASC NULLS LAST, name ASC`;

    const result = await pool.query(query, params);
    res.json({ employees: result.rows });
  } catch (err) {
    console.error('Employees list error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   PUT /api/auth/employees/:id
   SA only — edit employee details
   ═══════════════════════════════════════ */
router.put('/employees/:id', auth, roleCheck('super_admin', 'developer'), async (req, res) => {
  const { name, email, mobile, department, branch, designation, cl_total, wfh_days_month, emp_id, password } = req.body;

  try {
    if (department) {
      const deptCheck = await pool.query('SELECT id FROM departments WHERE name = $1', [department]);
      if (deptCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid department. Select from the departments list.' });
      }
    }

    let query = `UPDATE employees SET name=$1, email=$2, mobile=$3, department=$4, branch=$5, designation=$6, cl_total=$7, wfh_days_month=$8`;
    const params = [name, email, mobile, department, branch, designation, cl_total, wfh_days_month];

    if (emp_id) {
      params.push(emp_id);
      query += `, emp_id=$${params.length}`;
    }

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      params.push(hashedPassword);
      query += `, password=$${params.length}`;
    }

    params.push(req.params.id);
    query += ` WHERE id=$${params.length}`;

    await pool.query(query, params);

    await logAudit({
      userId: req.user.id,
      action: 'employee_updated',
      entityType: 'employee',
      entityId: parseInt(req.params.id, 10),
      details: { department },
      ipAddress: req.ip,
    });

    res.json({ message: 'Employee updated successfully' });
  } catch (err) {
    console.error('Employee update error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   DELETE /api/auth/employees/:id
   SA only — cannot delete super_admin or self
   Database CASCADE constraints handle all dependent record deletion
   ═══════════════════════════════════════ */
router.delete('/employees/:id', auth, roleCheck('super_admin'), async (req, res) => {
  try {
    const employeeId = parseInt(req.params.id, 10);

    // Check if employee exists and is not already deleted
    const result = await pool.query('SELECT id, role, emp_id, name FROM employees WHERE id = $1 AND deleted_at IS NULL', [employeeId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const employee = result.rows[0];

    // Prevent deleting super_admin
    if (employee.role === 'super_admin') {
      return res.status(403).json({ message: 'Cannot delete Super Admin accounts.' });
    }

    // Prevent deleting own account
    if (employeeId === req.user.id) {
      return res.status(403).json({ message: 'Cannot delete your own account.' });
    }

    // Clear optional foreign keys where appropriate
    await pool.query('UPDATE departments SET hr_id = NULL WHERE hr_id = $1', [employeeId]);

    // Perform soft delete
    await pool.query('UPDATE employees SET deleted_at = NOW() WHERE id = $1', [employeeId]);

    // Log the deletion
    await logAudit({
      userId: req.user.id,
      action: 'employee_deleted',
      entityType: 'employee',
      entityId: employeeId,
      details: { emp_id: employee.emp_id, name: employee.name, type: 'soft_delete' },
      ipAddress: req.ip,
    });

    res.json({ 
      message: 'Employee ' + employee.emp_id + ' (' + employee.name + ') has been successfully removed.',
      deleted: {
        employee: employee.emp_id,
        records_cascade_deleted: [] // No longer cascade deleting
      }
    });
  } catch (err) {
    console.error('Employee delete error:', err);
    
    let message = 'Failed to delete employee';
    if (err.detail) {
      message += ': ' + err.detail;
    } else if (err.message) {
      message += ': ' + err.message;
    }

    res.status(500).json({ 
      message: message,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});




/* ═══════════════════════════════════════
   PUT /api/auth/change-password
   Any logged-in user can change their own password
   ═══════════════════════════════════════ */
router.put('/change-password', auth, async (req, res) => {
  const { old_password, new_password } = req.body;

  try {
    const result = await pool.query('SELECT password FROM employees WHERE id = $1', [req.user.id]);
    const employee = result.rows[0];

    const valid = await bcrypt.compare(old_password, employee.password);
    if (!valid) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }

    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE employees SET password = $1 WHERE id = $2', [hashed, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   GET /api/auth/settings
   SA only — get all system settings
   ═══════════════════════════════════════ */
router.get('/settings', auth, roleCheck('super_admin', 'developer'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_settings');
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json({ settings });
  } catch (err) {
    console.error('Settings get error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


/* ═══════════════════════════════════════
   PUT /api/auth/settings
   SA only — update system settings
   ═══════════════════════════════════════ */
router.put('/settings', auth, roleCheck('super_admin', 'developer'), async (req, res) => {
  const { settings } = req.body;

  try {
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO system_settings (key, value) 
         VALUES ($1, $2) 
         ON CONFLICT (key) DO UPDATE SET value = $2`,
        [key, value]
      );
    }
    await logAudit({
      userId: req.user.id,
      action: 'settings_updated',
      entityType: 'system_settings',
      details: settings,
      ipAddress: req.ip,
    });

    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    console.error('Settings update error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
