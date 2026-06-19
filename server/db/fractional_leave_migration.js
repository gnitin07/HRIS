const pool = require('../config/db');

async function migrate() {
  console.log('Starting fractional leave migration...');

  try {
    // Modify employees table
    await pool.query(`
      ALTER TABLE employees
      ALTER COLUMN cl_total TYPE DECIMAL(5,1);
    `);
    console.log('Updated cl_total in employees table.');

    // Modify leave_balances table
    await pool.query(`
      ALTER TABLE leave_balances
      ALTER COLUMN casual_total TYPE DECIMAL(5,1),
      ALTER COLUMN casual_used TYPE DECIMAL(5,1);
    `);
    console.log('Updated casual_total and casual_used in leave_balances table.');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
