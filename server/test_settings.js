const pool = require('./config/db');

async function test() {
  try {
    const res = await pool.query("SELECT * FROM system_settings");
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
test();
