const pool = require('./config/db');

async function cleanup() {
  try {
    // Delete test entry
    const del = await pool.query("DELETE FROM office_locations WHERE name = 'TestNode' RETURNING *");
    console.log('Deleted test offices:', del.rows);

    // Show remaining offices
    const remaining = await pool.query("SELECT * FROM office_locations");
    console.log('\nActive offices after cleanup:');
    remaining.rows.forEach(o => {
      console.log(`  [${o.id}] ${o.name} — lat: ${o.latitude}, lng: ${o.longitude}, radius: ${o.radius_m}m, active: ${o.is_active}`);
    });
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    pool.end();
  }
}

cleanup();
