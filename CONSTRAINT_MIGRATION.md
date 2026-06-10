# Database Constraint Migration - Employee Deletion Fix

## Problem
The database constraints were not properly configured with `ON DELETE CASCADE`, causing foreign key constraint violations when trying to delete employees.

## What Was Wrong
The schema file (`schema.sql`) had the correct CASCADE constraints, but existing database tables didn't have them applied. This is because:
- `CREATE TABLE IF NOT EXISTS` only creates tables if they don't exist
- It doesn't update existing table constraints
- The old database had constraints set without CASCADE

## Solution Applied

### 1. **Created Migration Script**
- **File**: `server/db/fix_constraints.sql`
- **File**: `server/db/fix_constraints.js`

### 2. **What the Migration Fixed**

Fixed all foreign key constraints to properly cascade delete:

| Table | Column | References | Action | Purpose |
|-------|--------|-----------|--------|---------|
| `attendance` | `employee_id` | `employees(id)` | CASCADE | Auto-delete attendance records |
| `leave_requests` | `employee_id` | `employees(id)` | CASCADE | Auto-delete leave requests |
| `leave_requests` | `reviewed_by` | `employees(id)` | SET NULL | Clear reviewer when HR is deleted |
| `leave_balances` | `employee_id` | `employees(id)` | CASCADE | Auto-delete leave balances |
| `tasks` | `assigned_to` | `employees(id)` | CASCADE | Auto-delete tasks assigned to employee |
| `tasks` | `assigned_by` | `employees(id)` | SET NULL | Clear task creator reference |
| `tickets` | `raised_by` | `employees(id)` | CASCADE | Auto-delete tickets |
| `tickets` | `resolved_by` | `employees(id)` | SET NULL | Clear resolver reference |
| `notification_reads` | `employee_id` | `employees(id)` | CASCADE | Auto-delete read records |
| `notifications` | `created_by` | `employees(id)` | SET NULL | Clear creator reference |
| `audit_logs` | `user_id` | `employees(id)` | SET NULL | Clear user reference |
| `holidays` | `declared_by` | `employees(id)` | SET NULL | Clear declarer reference |
| `departments` | `hr_id` | `employees(id)` | SET NULL | Clear HR assignment |

### 3. **How to Run the Migration**

Already executed! The migration was run with:
```bash
node db/fix_constraints.js
```

If you need to run it again:
```bash
cd server
node db/fix_constraints.js
```

## Result

Now when you delete an employee:

1. **Database automatically deletes**:
   - All attendance records
   - All leave requests submitted by them
   - All leave balances
   - All tasks assigned to them
   - All tickets raised by them
   - All notification reads

2. **Database automatically clears**:
   - HR assignments in departments (SET NULL)
   - Leave request reviewers (SET NULL)
   - Task assigners (SET NULL)
   - Ticket resolvers (SET NULL)
   - Notification creators (SET NULL)
   - Audit log user references (SET NULL)
   - Holiday declarers (SET NULL)

## Testing

Try deleting employees HR001 and EMP001 now - they should delete successfully with all their dependent records!

## Code Changes

The DELETE endpoint in `server/routes/auth.js` is now simple and clean:

```javascript
// 1. Validate employee exists
// 2. Check permissions (not super_admin, not self)
// 3. Clear optional foreign key references (SET NULL)
// 4. Delete the employee (CASCADE handles everything else)
// 5. Log the deletion
```

No more manual deletion of 10+ dependent tables! 🎉

## Future Database Schemas

All new databases will automatically have CASCADE constraints because they're defined in `schema.sql`.

To apply these constraints to a fresh database, the `schema.sql` already includes the correct definitions.
