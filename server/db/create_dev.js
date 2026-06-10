const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

async function createDev() {
  try {
    const hash = await bcrypt.hash('Dev@123456', 10);
    
    // Drop the old constraint and add the new one that allows 'developer'
    await pool.query('ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check');
    await pool.query("ALTER TABLE employees ADD CONSTRAINT employees_role_check CHECK (role IN ('employee', 'hr', 'super_admin', 'developer'))");

    await pool.query(
      `INSERT INTO employees (emp_id, name, email, department, role, password)
       VALUES ('DEV001', 'System Developer', 'dev@devriz.com', 'developer', 'developer', $1)
       ON CONFLICT (emp_id) DO UPDATE SET password = $1`,
      [hash]
    );
    console.log('Developer created successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createDev();
