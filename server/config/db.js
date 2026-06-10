/* ─────────────────────────────────────────────
   Database Connection — PostgreSQL Pool
   ───────────────────────────────────────────── */

const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL 
  ? { 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } 
    }
  : {
      host:     process.env.DB_HOST,
      port:     process.env.DB_PORT,
      database: process.env.DB_NAME,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };

const pool = new Pool(poolConfig);

// Test connection on startup
pool.connect()
  .then(client => {
    console.log('✅ Connected to PostgreSQL — database:', process.env.DATABASE_URL ? 'Neon Cloud' : process.env.DB_NAME);
    client.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

module.exports = pool;
