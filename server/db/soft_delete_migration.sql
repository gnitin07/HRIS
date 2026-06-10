/* ═══════════════════════════════════════════════════════════════════════════
   SOFT DELETE MIGRATION
   Adds a deleted_at timestamp column to the employees table.
   Employees with deleted_at IS NOT NULL are considered "soft deleted".
   
   Run with: node soft_delete_migration.js
   ═══════════════════════════════════════════════════════════════════════════ */

-- Add deleted_at column (NULL = active, timestamp = soft-deleted)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

-- Create a partial index for fast lookups on active employees only
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees (id) WHERE deleted_at IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'employees' AND column_name = 'deleted_at';
