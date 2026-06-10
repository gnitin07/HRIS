const pool = require('./config/db');
pool.query("SELECT emp_id, name, deleted_at FROM employees WHERE emp_id = 'SA001'")
  .then(res => {
    console.log(res.rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
