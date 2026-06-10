/* ─────────────────────────────────────────────
   Devriz HRMS — PostgreSQL Database Schema
   Database: devriz_hrms
   ───────────────────────────────────────────── */


-- ═══════════════════════════════════════
-- 1. EMPLOYEES  (core users table)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS employees (
  id             SERIAL PRIMARY KEY,
  emp_id         VARCHAR(20) UNIQUE NOT NULL,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(100) UNIQUE NOT NULL,
  mobile         VARCHAR(15),
  department     VARCHAR(100),
  branch         VARCHAR(100),
  role           VARCHAR(20) DEFAULT 'employee',   -- employee | hr | super_admin | developer
  designation    VARCHAR(100),
  joining_date   DATE,
  password       VARCHAR(255) NOT NULL,
  cl_total       INT DEFAULT 1,                    -- casual leaves allotted per month
  wfh_days_month INT DEFAULT 0,                    -- WFH days allotted per month
  created_at     TIMESTAMP DEFAULT NOW(),
  deleted_at     TIMESTAMP DEFAULT NULL              -- soft delete timestamp
);


-- ═══════════════════════════════════════
-- 2. DEPARTMENTS
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS departments (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) UNIQUE NOT NULL,
  hr_id      INT REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);


-- ═══════════════════════════════════════
-- 3. OFFICE LOCATIONS  (geofence points)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS office_locations (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  latitude   DECIMAL(10, 7) NOT NULL,
  longitude  DECIMAL(10, 7) NOT NULL,
  radius_m   INT DEFAULT 200,
  is_active  BOOLEAN DEFAULT true
);


-- ═══════════════════════════════════════
-- 4. ATTENDANCE
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS attendance (
  id              SERIAL PRIMARY KEY,
  employee_id     INT REFERENCES employees(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  check_in        TIME,
  check_out       TIME,
  check_in_lat    DECIMAL(10, 7),
  check_in_lng    DECIMAL(10, 7),
  status          VARCHAR(20),       -- present | late | absent | casual | holiday | wfh
  attendance_mode VARCHAR(10),       -- wfo | wfh | leave | holiday
  leave_type      VARCHAR(20),
  is_holiday      BOOLEAN DEFAULT false,
  holiday_name    VARCHAR(100),
  UNIQUE(employee_id, date)
);


-- ═══════════════════════════════════════
-- 5. LEAVE REQUESTS
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS leave_requests (
  id            SERIAL PRIMARY KEY,
  employee_id   INT REFERENCES employees(id) ON DELETE CASCADE,
  leave_type    VARCHAR(20) NOT NULL,   -- casual | wfh
  from_date     DATE NOT NULL,
  to_date       DATE NOT NULL,
  reason        TEXT,
  status        VARCHAR(20) DEFAULT 'pending',   -- pending | approved | rejected
  reviewed_by   INT REFERENCES employees(id) ON DELETE SET NULL,
  applied_at    TIMESTAMP DEFAULT NOW()
);


-- ═══════════════════════════════════════
-- 6. LEAVE BALANCES  (per employee per month)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS leave_balances (
  id            SERIAL PRIMARY KEY,
  employee_id   INT REFERENCES employees(id) ON DELETE CASCADE,
  year          INT NOT NULL,
  month         INT NOT NULL,
  casual_total  INT DEFAULT 0,
  casual_used   INT DEFAULT 0,
  wfh_total     INT DEFAULT 0,
  wfh_used      INT DEFAULT 0,
  UNIQUE(employee_id, year, month)
);


-- ═══════════════════════════════════════
-- 7. TASKS
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS tasks (
  id                SERIAL PRIMARY KEY,
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  assigned_to       INT REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by       INT REFERENCES employees(id) ON DELETE SET NULL,
  priority          VARCHAR(10) DEFAULT 'medium',   -- low | medium | high
  due_date          DATE,
  status            VARCHAR(20) DEFAULT 'pending',  -- pending | in_progress | done
  notification_sent BOOLEAN DEFAULT false,
  created_at        TIMESTAMP DEFAULT NOW()
);


-- ═══════════════════════════════════════
-- 8. TICKETS  (concern raiser)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS tickets (
  id            SERIAL PRIMARY KEY,
  raised_by     INT REFERENCES employees(id) ON DELETE CASCADE,
  subject       VARCHAR(200) NOT NULL,
  description   TEXT NOT NULL,
  status        VARCHAR(20) DEFAULT 'open',   -- open | in_progress | resolved | closed
  priority      VARCHAR(10) DEFAULT 'medium',
  resolved_by   INT REFERENCES employees(id) ON DELETE SET NULL,
  resolution    TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);


-- ═══════════════════════════════════════
-- 9. NOTIFICATIONS  (emergency notices)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  type        VARCHAR(20) DEFAULT 'info',   -- info | warning | emergency
  created_by  INT REFERENCES employees(id) ON DELETE SET NULL,
  target_role VARCHAR(20),                  -- null = everyone
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  expires_at  TIMESTAMP
);


-- ═══════════════════════════════════════
-- 10. NOTIFICATION READS  (track who read what)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS notification_reads (
  id              SERIAL PRIMARY KEY,
  notification_id INT REFERENCES notifications(id) ON DELETE CASCADE,
  employee_id     INT REFERENCES employees(id) ON DELETE CASCADE,
  read_at         TIMESTAMP DEFAULT NOW(),
  UNIQUE(notification_id, employee_id)
);


-- ═══════════════════════════════════════
-- 11. AUDIT LOGS  (developer panel)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES employees(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   INT,
  details     JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP DEFAULT NOW()
);


-- ═══════════════════════════════════════
-- 12. SYSTEM SETTINGS  (key-value config)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS system_settings (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);


-- ═══════════════════════════════════════
-- 13. HOLIDAYS
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS holidays (
  id          SERIAL PRIMARY KEY,
  date        DATE UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  declared_by INT REFERENCES employees(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);


-- ═══════════════════════════════════════
-- DEFAULT SETTINGS
-- ═══════════════════════════════════════
INSERT INTO system_settings (key, value) VALUES
  ('checkin_window_start', '09:30'),
  ('checkin_window_end',   '10:15'),
  ('work_hours_required',  '8'),
  ('office_lat',           '28.5700'),
  ('office_lng',           '77.3210'),
  ('office_radius_meters', '200')
ON CONFLICT (key) DO NOTHING;
