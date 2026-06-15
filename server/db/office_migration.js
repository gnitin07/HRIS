/* ─────────────────────────────────────────────
   Migration: Migrate system_settings office to office_locations
   Run: node server/db/office_migration.js
   ───────────────────────────────────────────── */

const pool = require('../config/db');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function run() {
  try {
    const existing = await pool.query('SELECT * FROM office_locations LIMIT 1');
    if (existing.rows.length === 0) {
      console.log('No office locations found, migrating from system_settings...');
      const latRow = await pool.query("SELECT value FROM system_settings WHERE key='office_lat'");
      const lngRow = await pool.query("SELECT value FROM system_settings WHERE key='office_lng'");
      const radiusRow = await pool.query("SELECT value FROM system_settings WHERE key='office_radius_meters'");

      const lat = latRow.rows[0]?.value || '28.5700';
      const lng = lngRow.rows[0]?.value || '77.3210';
      const radius = radiusRow.rows[0]?.value || '200';

      await pool.query(
        `INSERT INTO office_locations (name, latitude, longitude, radius_m, is_active)
         VALUES ($1, $2, $3, $4, true)`,
        ['Main Office', lat, lng, radius]
      );
      console.log('✅ Migrated Main Office successfully.');
    } else {
      console.log('✅ Office locations already exist, skipping migration.');
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    pool.end();
  }
}

run();
