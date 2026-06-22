require('dotenv').config({ path: '../.env' });
const db = require('../config/db');

async function migrate() {
  try {
    console.log('Running department max_regularizations migration...');
    await db.query(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS max_regularizations INT`);
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
