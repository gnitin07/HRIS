/* ─────────────────────────────────────────────
   Migration: Add check_out_lat and check_out_lng
   to the attendance table for checkout geofence validation.
   
   Run: node server/db/add_checkout_location.js
   ───────────────────────────────────────────── */

const pool = require('../config/db');

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE attendance
        ADD COLUMN IF NOT EXISTS check_out_lat DECIMAL(10, 7),
        ADD COLUMN IF NOT EXISTS check_out_lng DECIMAL(10, 7);
    `);
    console.log('✅ Added check_out_lat and check_out_lng columns to attendance table');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
