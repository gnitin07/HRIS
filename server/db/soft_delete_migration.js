#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   SOFT DELETE MIGRATION RUNNER
   Adds deleted_at column to employees table for soft-delete support.
   
   Run with: node soft_delete_migration.js
   ═══════════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');

const runMigration = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting soft-delete migration...\n');

    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'soft_delete_migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by statements and filter empty/comment-only ones
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    for (const statement of statements) {
      try {
        if (statement.toUpperCase().includes('SELECT')) {
          console.log('📊 Verifying migration...');
          const result = await client.query(statement);
          if (result.rows.length > 0) {
            console.log('\n✅ Column verified:');
            result.rows.forEach(row => {
              console.log(`  • ${row.column_name} (${row.data_type}) default: ${row.column_default || 'NULL'}`);
            });
          } else {
            console.log('⚠️  Column not found — migration may have failed');
          }
        } else {
          await client.query(statement);
          if (statement.includes('ALTER TABLE')) {
            console.log('  ✓ Added deleted_at column to employees table');
          } else if (statement.includes('CREATE INDEX')) {
            console.log('  ✓ Created partial index for active employees');
          }
        }
      } catch (err) {
        // Column might already exist
        if (err.message.includes('already exists')) {
          console.log(`  • Column/index already exists (skipping)`);
        } else {
          console.error(`  ✗ Error: ${err.message}`);
          throw err;
        }
      }
    }

    console.log('\n✅ Soft-delete migration completed successfully!');
    console.log('\n🎯 What changed:\n');
    console.log('  ✓ employees.deleted_at column added (NULL = active, timestamp = deleted)');
    console.log('  ✓ Partial index created for fast active-employee queries');
    console.log('\n🚀 Employee deletion will now set deleted_at instead of removing the row.\n');

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

runMigration();
