/* ═══════════════════════════════════════════════════════════════════════════
   FIX DATABASE CONSTRAINTS
   This script fixes all foreign key constraints to use ON DELETE CASCADE
   where appropriate, so employee deletion automatically cascades.
   ═══════════════════════════════════════════════════════════════════════════ */

-- Step 1: Drop existing constraints (if they exist)
ALTER TABLE IF EXISTS attendance DROP CONSTRAINT IF EXISTS attendance_employee_id_fkey CASCADE;
ALTER TABLE IF EXISTS leave_requests DROP CONSTRAINT IF EXISTS leave_requests_employee_id_fkey CASCADE;
ALTER TABLE IF EXISTS leave_requests DROP CONSTRAINT IF EXISTS leave_requests_reviewed_by_fkey CASCADE;
ALTER TABLE IF EXISTS leave_balances DROP CONSTRAINT IF EXISTS leave_balances_employee_id_fkey CASCADE;
ALTER TABLE IF EXISTS tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey CASCADE;
ALTER TABLE IF EXISTS tasks DROP CONSTRAINT IF EXISTS tasks_assigned_by_fkey CASCADE;
ALTER TABLE IF EXISTS tickets DROP CONSTRAINT IF EXISTS tickets_raised_by_fkey CASCADE;
ALTER TABLE IF EXISTS tickets DROP CONSTRAINT IF EXISTS tickets_resolved_by_fkey CASCADE;
ALTER TABLE IF EXISTS notification_reads DROP CONSTRAINT IF EXISTS notification_reads_employee_id_fkey CASCADE;
ALTER TABLE IF EXISTS notifications DROP CONSTRAINT IF EXISTS notifications_created_by_fkey CASCADE;
ALTER TABLE IF EXISTS audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS holidays DROP CONSTRAINT IF EXISTS holidays_declared_by_fkey CASCADE;
ALTER TABLE IF EXISTS departments DROP CONSTRAINT IF EXISTS departments_hr_id_fkey CASCADE;

-- Step 2: Re-create constraints with CASCADE
-- ATTENDANCE → EMPLOYEES (CASCADE delete attendance when employee deleted)
ALTER TABLE attendance
ADD CONSTRAINT attendance_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- LEAVE_REQUESTS → EMPLOYEES (CASCADE delete leave requests when employee deleted)
ALTER TABLE leave_requests
ADD CONSTRAINT leave_requests_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- LEAVE_REQUESTS → EMPLOYEES (SET NULL for reviewer when employee deleted)
ALTER TABLE leave_requests
ADD CONSTRAINT leave_requests_reviewed_by_fkey 
FOREIGN KEY (reviewed_by) REFERENCES employees(id) ON DELETE SET NULL;

-- LEAVE_BALANCES → EMPLOYEES (CASCADE delete balances when employee deleted)
ALTER TABLE leave_balances
ADD CONSTRAINT leave_balances_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- TASKS → EMPLOYEES assigned_to (CASCADE delete tasks when employee deleted)
ALTER TABLE tasks
ADD CONSTRAINT tasks_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE CASCADE;

-- TASKS → EMPLOYEES assigned_by (SET NULL when employee deleted)
ALTER TABLE tasks
ADD CONSTRAINT tasks_assigned_by_fkey 
FOREIGN KEY (assigned_by) REFERENCES employees(id) ON DELETE SET NULL;

-- TICKETS → EMPLOYEES raised_by (CASCADE delete tickets when employee deleted)
ALTER TABLE tickets
ADD CONSTRAINT tickets_raised_by_fkey 
FOREIGN KEY (raised_by) REFERENCES employees(id) ON DELETE CASCADE;

-- TICKETS → EMPLOYEES resolved_by (SET NULL when employee deleted)
ALTER TABLE tickets
ADD CONSTRAINT tickets_resolved_by_fkey 
FOREIGN KEY (resolved_by) REFERENCES employees(id) ON DELETE SET NULL;

-- NOTIFICATION_READS → EMPLOYEES (CASCADE delete when employee deleted)
ALTER TABLE notification_reads
ADD CONSTRAINT notification_reads_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

-- NOTIFICATIONS → EMPLOYEES (SET NULL for creator when employee deleted)
ALTER TABLE notifications
ADD CONSTRAINT notifications_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL;

-- AUDIT_LOGS → EMPLOYEES (SET NULL for user_id when employee deleted)
ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES employees(id) ON DELETE SET NULL;

-- HOLIDAYS → EMPLOYEES (SET NULL for declared_by when employee deleted)
ALTER TABLE holidays
ADD CONSTRAINT holidays_declared_by_fkey 
FOREIGN KEY (declared_by) REFERENCES employees(id) ON DELETE SET NULL;

-- DEPARTMENTS → EMPLOYEES (SET NULL for hr_id when employee deleted)
ALTER TABLE departments
ADD CONSTRAINT departments_hr_id_fkey 
FOREIGN KEY (hr_id) REFERENCES employees(id) ON DELETE SET NULL;

-- Step 3: Verify constraints
SELECT 
  constraint_name,
  table_name,
  column_name,
  referenced_table_name,
  referenced_column_name,
  delete_rule
FROM information_schema.referential_constraints
WHERE table_schema = 'public'
AND referenced_table_name = 'employees'
ORDER BY table_name;
