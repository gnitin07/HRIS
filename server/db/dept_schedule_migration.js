/* ─────────────────────────────────────────────
   Migration: Add per-department schedule columns
   Run: node server/db/dept_schedule_migration.js
   ───────────────────────────────────────────── */

const pool = require('../config/db');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function run() {
  try {
    await pool.query(`
      ALTER TABLE departments
        ADD COLUMN IF NOT EXISTS checkin_start         VARCHAR(5)     DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS checkin_end           VARCHAR(5)     DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS hours_present         DECIMAL(4,2)   DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS hours_regularization  DECIMAL(4,2)   DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS hours_half_day        DECIMAL(4,2)   DEFAULT NULL;
    `);
    console.log('✅ Department schedule columns added (NULL = use global system_settings).');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
}

run();
