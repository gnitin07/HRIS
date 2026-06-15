const pool = require('./config/db');

async function test() {
  try {
    const result = await pool.query(
      'INSERT INTO office_locations (name, latitude, longitude, radius_m, is_active) VALUES ($1, $2, $3, $4, true) RETURNING *',
      ['TestNode', '28.5', '77.3', 200]
    );
    console.log('Success:', result.rows);
  } catch (err) {
    console.error('DB ERROR:', err);
  } finally {
    pool.end();
  }
}

test();
