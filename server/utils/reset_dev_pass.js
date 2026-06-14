const pool = require('../config/db');
const bcrypt = require('bcryptjs');

const resetDevPass = async () => {
  const newPass = process.argv[2] || 'devriz2024';
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPass, salt);
    
    const res = await pool.query(
      "UPDATE employees SET password = $1 WHERE role = 'developer' RETURNING emp_id, name, email",
      [hash]
    );

    if (res.rows.length > 0) {
      console.log(`✅ Developer password reset successfully!`);
      console.log(`Developer EMP ID: ${res.rows[0].emp_id}`);
      console.log(`New Password: ${newPass}`);
    } else {
      console.log(`❌ No developer account found in the database.`);
    }
  } catch (err) {
    console.error(`Error:`, err.message);
  } finally {
    pool.end();
  }
};

resetDevPass();
