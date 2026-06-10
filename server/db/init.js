const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

async function initDB() {
  try {
    console.log('Initializing Database...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(schema);
    console.log('Schema created successfully.');

    const defaultDepartments = ['Human Resources', 'IT', 'Sales', 'Operations'];
    for (const deptName of defaultDepartments) {
      await pool.query(
        'INSERT INTO departments (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [deptName]
      );
    }
    console.log('Default departments ensured.');

    // Insert test Super Admin if it doesn't exist
    const checkSA = await pool.query("SELECT * FROM employees WHERE emp_id = 'SA001'");
    if (checkSA.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('Nitindevriz@SuperAdmin123', 10);
      await pool.query(
        `INSERT INTO employees 
          (emp_id, name, email, mobile, department, branch, role, designation, joining_date, password)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        ['SA001', 'Nitin', 'goyalnitin543@gmail.com', '7836940890', 'IT', 'Head Office', 'super_admin', 'Director', '2024-05-22', hashedPassword]
      );
      console.log('Super Admin user (SA001) created.');
    } else {
      console.log('Super Admin already exists.');
    }

    // Insert test HR if it doesn't exist
    const checkHR = await pool.query("SELECT * FROM employees WHERE emp_id = 'HR001'");
    if (checkHR.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('Hr@123456', 10);
      await pool.query(
        `INSERT INTO employees 
          (emp_id, name, email, mobile, department, branch, role, designation, joining_date, password)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        ['HR001', 'Priya Sharma', 'priya@devriz.in', '9876543201', 'Human Resources', 'Sector 18, Noida', 'hr', 'HR Manager', '2024-01-15', hashedPassword]
      );
      console.log('HR user (HR001) created.');
    } else {
      console.log('HR already exists.');
    }

    const hrRow = await pool.query("SELECT id FROM employees WHERE emp_id = 'HR001'");
    if (hrRow.rows.length > 0) {
      await pool.query(
        `UPDATE departments SET hr_id = $1 WHERE name = 'Human Resources'`,
        [hrRow.rows[0].id]
      );
      await pool.query(
        `UPDATE employees SET department = 'Human Resources' WHERE id = $1`,
        [hrRow.rows[0].id]
      );
      console.log('HR001 linked to Human Resources department.');
    }

    console.log('Initialization complete.');
    process.exit(0);
  } catch (err) {
    console.error('Initialization failed:', err.message);
    process.exit(1);
  }
}

initDB();
