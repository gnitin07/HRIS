#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   DATABASE CONSTRAINT MIGRATION SCRIPT
   Fixes all foreign key constraints to use CASCADE deletes where needed
   
   Run with: node fix_constraints.js
   ═══════════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const migrateConstraints = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database constraint migration...\n');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, 'fix_constraints.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by statements and filter empty ones
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} statements to execute\n`);
    
    let executed = 0;
    
    for (const statement of statements) {
      try {
        if (statement.includes('SELECT')) {
          console.log('📊 Verifying constraints...');
          const result = await client.query(statement);
          
          if (result.rows.length > 0) {
            console.log('\n✅ Current database constraints:\n');
            result.rows.forEach(row => {
              console.log(`  • ${row.table_name}.${row.column_name}`);
              console.log(`    ↳ References: ${row.referenced_table_name}(${row.referenced_column_name})`);
              console.log(`    ↳ Delete Rule: ${row.delete_rule}`);
            });
          } else {
            console.log('ℹ️  No constraints found to verify');
          }
        } else {
          await client.query(statement);
          
          if (statement.includes('ALTER TABLE')) {
            const match = statement.match(/ALTER TABLE\s+(\w+)/i);
            const table = match ? match[1] : 'unknown';
            console.log(`  ✓ Fixed ${table}`);
          } else if (statement.includes('DROP')) {
            console.log(`  ✓ Dropped existing constraint`);
          }
          
          executed++;
        }
      } catch (err) {
        // Ignore errors for DROP statements (constraint might not exist)
        if (statement.includes('DROP')) {
          console.log(`  • Constraint doesn't exist (skipping)`);
        } else {
          console.error(`  ✗ Error: ${err.message}`);
          throw err;
        }
      }
    }
    
    console.log(`\n✅ Migration completed successfully!`);
    console.log(`\n🎯 What was fixed:\n`);
    console.log('  ✓ attendance → employees (CASCADE)');
    console.log('  ✓ leave_requests → employees (CASCADE + SET NULL for reviewer)');
    console.log('  ✓ leave_balances → employees (CASCADE)');
    console.log('  ✓ tasks → employees (CASCADE for assigned_to + SET NULL for assigned_by)');
    console.log('  ✓ tickets → employees (CASCADE for raised_by + SET NULL for resolved_by)');
    console.log('  ✓ notification_reads → employees (CASCADE)');
    console.log('  ✓ notifications → employees (SET NULL)');
    console.log('  ✓ audit_logs → employees (SET NULL)');
    console.log('  ✓ holidays → employees (SET NULL)');
    console.log('  ✓ departments → employees (SET NULL)\n');
    console.log('🚀 Employee deletion will now automatically clean up all related data!\n');
    
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

// Run the migration
migrateConstraints();
