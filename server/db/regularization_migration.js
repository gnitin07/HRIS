/* ─────────────────────────────────────────────
   Migration: Add regularization and half-day columns
   Run: node server/db/regularization_migration.js
   ───────────────────────────────────────────── */

const pool = require('../config/db');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function run() {
  try {
    await pool.query(`
      ALTER TABLE departments
        ADD COLUMN IF NOT EXISTS monthly_regularizations INT DEFAULT 0;
        
      ALTER TABLE leave_balances
        ADD COLUMN IF NOT EXISTS regularization_total INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS regularization_used INT DEFAULT 0;
        
      ALTER TABLE leave_balances
        ALTER COLUMN casual_total TYPE DECIMAL(5,1),
        ALTER COLUMN casual_used TYPE DECIMAL(5,1);
        
      ALTER TABLE employees
        ALTER COLUMN cl_total TYPE DECIMAL(5,1);
    `);
    console.log('✅ Regularization and half-day columns added successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
}

run();
