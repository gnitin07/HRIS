# Devriz HRMS — Complete Implementation Plan

## Background

Building a **minimalist, functional HRMS** for Devriz (~80-100 employees, 3 locations). The project lives in `c:\Users\HP\Desktop\HRIMS\MERN_HRMS\hrms\`.

You have an **existing older backend** in `c:\Users\HP\Desktop\HRIMS\HRMS\` with working routes for auth, attendance, leave, tasks, and reports. We will **reuse and improve** that backend logic while building a proper React frontend.

> [!IMPORTANT]
> **Tech Stack**: Node.js + Express backend, React (Vite) frontend, PostgreSQL database. NOT MongoDB — despite "MERN" in the folder name, your flowchart specifies PostgreSQL.

---

## Prerequisites — What You Need Installed

| Requirement | Purpose | Check Command |
|---|---|---|
| **Node.js** (v18+) | Runtime for backend & frontend | `node -v` |
| **npm** (v9+) | Package manager | `npm -v` |
| **PostgreSQL** (v14+) | Database | `psql --version` |
| **Git** (optional) | Version control | `git --version` |

> [!IMPORTANT]
> Your PostgreSQL must be running locally with these connection details (from your existing `.env`):
> - Host: `localhost`, Port: `5432`
> - Database: `devriz_hrms`
> - User: `postgres`, Password: from your existing config
> - Email: `nitin@devrizhealthcare.in` (for task/leave notification emails)

---

## Project Structure

```
hrms/
├── server/                     # Backend (Express + PostgreSQL)
│   ├── config/
│   │   └── db.js               # PostgreSQL pool connection
│   ├── middleware/
│   │   ├── auth.js             # JWT verification middleware
│   │   └── roleCheck.js        # Role-based access control
│   ├── routes/
│   │   ├── auth.js             # Login, register, employee CRUD, settings
│   │   ├── attendance.js       # Check-in/out, WFH, geofence, mark-absent
│   │   ├── leave.js            # Leave apply, approve/reject, balance
│   │   ├── tasks.js            # Task assign, update status, email notify
│   │   ├── tickets.js          # [NEW] Concern/ticket system
│   │   ├── notifications.js    # [NEW] Emergency notifications
│   │   └── reports.js          # Excel attendance export
│   ├── utils/
│   │   ├── mailer.js           # Shared nodemailer transporter
│   │   └── geofence.js         # Haversine distance calculator
│   ├── db/
│   │   └── schema.sql          # Complete DB schema (all tables)
│   ├── .env                    # Environment variables
│   ├── index.js                # Express server entry point
│   └── package.json
│
├── client/                     # Frontend (React + Vite)
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js        # Axios instance with auth interceptor
│   │   ├── components/
│   │   │   ├── common/         # Shared: Sidebar, Header, Modal, Loader
│   │   │   ├── employee/       # Employee panel components
│   │   │   ├── hr/             # HR panel components
│   │   │   ├── superadmin/     # Super Admin panel components
│   │   │   └── developer/      # Developer panel components
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── EmployeeDashboard.jsx
│   │   │   ├── HRDashboard.jsx
│   │   │   ├── SuperAdminDashboard.jsx
│   │   │   └── DeveloperDashboard.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Auth state management
│   │   ├── hooks/
│   │   │   └── useAuth.js       # Custom auth hook
│   │   ├── App.jsx              # Router + role-based routing
│   │   ├── main.jsx             # Entry point
│   │   └── index.css            # Global styles + design system
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## Database Schema (PostgreSQL)

12 tables based on your [raar.txt](file:///c:/Users/HP/Desktop/HRIMS/raar.txt) requirements:

### Core Tables

#### 1. `employees`
```sql
CREATE TABLE employees (
  id            SERIAL PRIMARY KEY,
  emp_id        VARCHAR(20) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  mobile        VARCHAR(15),
  department    VARCHAR(100),
  branch        VARCHAR(100),
  role          VARCHAR(20) DEFAULT 'employee',  -- employee, hr, super_admin, developer
  designation   VARCHAR(100),
  joining_date  DATE,
  password      VARCHAR(255) NOT NULL,
  cl_total      INT DEFAULT 1,          -- CL per month allotted
  wfh_days_month INT DEFAULT 0,         -- WFH days per month allotted
  created_at    TIMESTAMP DEFAULT NOW()
);
```

#### 2. `departments`
```sql
CREATE TABLE departments (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) UNIQUE NOT NULL,
  hr_id      INT REFERENCES employees(id),  -- HR assigned to this dept
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. `office_locations`
```sql
CREATE TABLE office_locations (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  latitude   DECIMAL(10, 7) NOT NULL,
  longitude  DECIMAL(10, 7) NOT NULL,
  radius_m   INT DEFAULT 200,  -- geofence radius in meters
  is_active  BOOLEAN DEFAULT true
);
```

### Attendance & Leave

#### 4. `attendance`
```sql
CREATE TABLE attendance (
  id              SERIAL PRIMARY KEY,
  employee_id     INT REFERENCES employees(id),
  date            DATE NOT NULL,
  check_in        TIME,
  check_out       TIME,
  check_in_lat    DECIMAL(10, 7),
  check_in_lng    DECIMAL(10, 7),
  status          VARCHAR(20),   -- present, late, absent, casual, holiday, wfh
  attendance_mode VARCHAR(10),   -- wfo, wfh, leave, holiday
  leave_type      VARCHAR(20),
  is_holiday      BOOLEAN DEFAULT false,
  holiday_name    VARCHAR(100),
  UNIQUE(employee_id, date)
);
```

#### 5. `leave_requests` (renamed from `leave_applications`)
```sql
CREATE TABLE leave_requests (
  id            SERIAL PRIMARY KEY,
  employee_id   INT REFERENCES employees(id),
  leave_type    VARCHAR(20) NOT NULL,  -- casual, wfh
  from_date     DATE NOT NULL,
  to_date       DATE NOT NULL,
  reason        TEXT,
  status        VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
  reviewed_by   INT REFERENCES employees(id),
  applied_at    TIMESTAMP DEFAULT NOW()
);
```

#### 6. `leave_balances`
```sql
CREATE TABLE leave_balances (
  id            SERIAL PRIMARY KEY,
  employee_id   INT REFERENCES employees(id),
  year          INT NOT NULL,
  month         INT NOT NULL,
  casual_total  INT DEFAULT 0,
  casual_used   INT DEFAULT 0,
  wfh_total     INT DEFAULT 0,
  wfh_used      INT DEFAULT 0,
  UNIQUE(employee_id, year, month)
);
```

### Task & Communication

#### 7. `tasks`
```sql
CREATE TABLE tasks (
  id                SERIAL PRIMARY KEY,
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  assigned_to       INT REFERENCES employees(id),
  assigned_by       INT REFERENCES employees(id),
  priority          VARCHAR(10) DEFAULT 'medium',  -- low, medium, high
  due_date          DATE,
  status            VARCHAR(20) DEFAULT 'pending',  -- pending, in_progress, done
  notification_sent BOOLEAN DEFAULT false,
  created_at        TIMESTAMP DEFAULT NOW()
);
```

#### 8. `tickets` — [NEW]
```sql
CREATE TABLE tickets (
  id            SERIAL PRIMARY KEY,
  raised_by     INT REFERENCES employees(id),
  subject       VARCHAR(200) NOT NULL,
  description   TEXT NOT NULL,
  status        VARCHAR(20) DEFAULT 'open',  -- open, in_progress, resolved, closed
  priority      VARCHAR(10) DEFAULT 'medium',
  resolved_by   INT REFERENCES employees(id),
  resolution    TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

#### 9. `notifications` — [NEW]
```sql
CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  type        VARCHAR(20) DEFAULT 'info',  -- info, warning, emergency
  created_by  INT REFERENCES employees(id),
  target_role VARCHAR(20),  -- null = all, 'employee', 'hr'
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT NOW(),
  expires_at  TIMESTAMP
);
```

#### 10. `notification_reads` — [NEW]
```sql
CREATE TABLE notification_reads (
  id              SERIAL PRIMARY KEY,
  notification_id INT REFERENCES notifications(id),
  employee_id     INT REFERENCES employees(id),
  read_at         TIMESTAMP DEFAULT NOW(),
  UNIQUE(notification_id, employee_id)
);
```

### System

#### 11. `audit_logs` — [NEW]
```sql
CREATE TABLE audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES employees(id),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   INT,
  details     JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP DEFAULT NOW()
);
```

#### 12. `settings`
```sql
CREATE TABLE settings (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('checkin_window_start', '09:30'),
  ('checkin_window_end', '10:15'),
  ('work_hours_required', '8');
```

#### 13. `holidays`
```sql
CREATE TABLE holidays (
  id          SERIAL PRIMARY KEY,
  date        DATE UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  declared_by INT REFERENCES employees(id),
  created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## API Routes Summary

### Auth (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/login` | Public | Login with emp_id + password |
| POST | `/register` | HR, SA | Register new employee |
| GET | `/employees` | HR, SA | List employees (HR sees own dept only) |
| PUT | `/employees/:id` | SA | Edit employee details |
| DELETE | `/employees/:id` | SA | Remove employee |
| PUT | `/change-password` | All | Change own password |
| GET | `/settings` | SA | Get system settings |
| PUT | `/settings` | SA | Update system settings |
| GET | `/me` | All | [NEW] Get current user profile |

### Attendance (`/api/attendance`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/today-status` | All | Today's attendance status + leave balance |
| POST | `/checkin` | All | GPS check-in (geofence validated) |
| POST | `/checkout` | All | [NEW] Separate checkout endpoint |
| POST | `/wfh` | All | Mark WFH for today |
| POST | `/apply-leave` | All | Quick CL apply for today |
| POST | `/mark-absent` | HR, SA | Mark non-checked-in as absent |
| PUT | `/edit` | SA | Edit any employee's attendance |
| GET | `/my` | All | Own attendance history (30 days) |
| GET | `/report` | HR, SA | Attendance report with filters |
| POST | `/holiday` | HR, SA | Declare restricted holiday |
| GET | `/holidays` | All | List holidays |

### Leave (`/api/leave`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/apply` | All | [NEW] Apply for CL/WFH with date range |
| GET | `/my` | All | Own leave applications + balance |
| GET | `/all` | HR, SA | All leave applications |
| PUT | `/approve/:id` | HR, SA | Approve/reject leave |

### Tasks (`/api/tasks`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/assign` | HR, SA | Assign task + email notification |
| GET | `/my` | All | Own tasks |
| GET | `/all` | HR, SA | All tasks (filtered by dept for HR) |
| PUT | `/status/:id` | All | Update task status (mark done) |

### Tickets (`/api/tickets`) — [NEW]
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/create` | All | Raise a concern/ticket |
| GET | `/my` | All | Own tickets |
| GET | `/all` | HR, SA | All tickets |
| PUT | `/:id/status` | HR, SA | Update ticket status + resolution |

### Notifications (`/api/notifications`) — [NEW]
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/create` | SA | Create emergency notification |
| GET | `/active` | All | Get active notifications |
| POST | `/:id/read` | All | Mark notification as read |

### Reports (`/api/reports`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/attendance` | HR, SA | Download Excel attendance report |

---

## Frontend Panels

### Panel 1 — Employee Dashboard
- **Home**: CL/WFH balance cards, Check-in button (geofenced), today's status
- **Attendance**: Week/month view of attendance history with working hours
- **Leave**: Apply for CL/WFH, see application history + status
- **Tasks**: View assigned tasks, mark as done
- **Tickets**: Raise concern, view ticket history
- **Notifications**: Emergency notices from SA

### Panel 2 — HR Admin Dashboard
- **Home**: Department overview, pending approvals count
- **Employees**: Add/view employees in own department
- **Attendance**: Department attendance view, mark absent, download Excel
- **Leave**: Approve/reject pending leave applications
- **Tasks**: Assign tasks to department employees
- **Holidays**: Declare restricted holidays

### Panel 3 — Super Admin Dashboard
- **Home**: Company-wide stats, all departments overview
- **Employees**: Register/edit/remove all employees and HRs
- **Departments**: Manage departments, assign HRs
- **Attendance**: Company-wide attendance, edit any record, download Excel
- **Leave**: View/approve all leaves
- **Tasks**: Assign tasks to anyone
- **Geofence**: Set office locations + radius
- **Notifications**: Create emergency notifications
- **Settings**: Check-in window, work hours, passwords

### Panel 4 — Developer Dashboard
- **System Logs**: View all audit logs with filters
- **DB Overview**: Table stats, recent entries
- **Settings**: Direct system settings editor
- **User Management**: Full CRUD on all entities

---

## Key Business Rules

1. **Geofence**: Haversine formula, 200m default radius, configurable per location
2. **Check-in Window**: 9:30-10:15 AM = on-time, after 10:15 = late
3. **Work Hours**: 8 hours = full day completion
4. **CL Stacking**: Unused monthly CL carries forward (1 CL/month default)
5. **WFH Stacking**: Unused WFH carries forward monthly
6. **Absent Marking**: HR marks absent at end-of-day for non-checked-in employees
7. **Email Notifications**: Task assignment, leave approval/rejection via Devriz mail

---

## Phased Build Approach

### Phase 1 — Foundation (Backend + DB + Login)
1. Initialize project structure (`server/` + `client/`)
2. Create PostgreSQL schema (`schema.sql`)
3. Set up Express server with all middleware
4. Implement auth routes (login, register, employee CRUD)
5. Create React app with Vite, set up routing
6. Build login page with role-based redirect
7. Create shared components (Sidebar, Header, ProtectedRoute)

### Phase 2 — Employee Panel
1. Employee dashboard with leave balance cards
2. Geofenced check-in/check-out
3. Attendance history view
4. Leave application form
5. Task list with mark-done
6. Notification display

### Phase 3 — HR Admin Panel
1. Department employee management
2. Leave approval/rejection
3. Task assignment with email
4. Attendance view + mark absent
5. Excel report download
6. Holiday management

### Phase 4 — Super Admin Panel
1. Full employee/HR management
2. Department + geofence settings
3. Company-wide attendance + Excel
4. Emergency notification system
5. System settings

### Phase 5 — Developer Panel + Polish
1. Audit logs viewer
2. System overview
3. Final UI polish, responsive design
4. Testing across all panels

---

## Open Questions

> [!IMPORTANT]
> 1. **Do you want me to start fresh in `hrms/`** or copy and improve the existing backend from `HRMS/`? I recommend starting fresh with improved, cleaner code while reusing the logic.

> [!IMPORTANT]
> 2. **Department scoping for HR**: Your flowchart says HR should only see employees in their own department. The old code doesn't enforce this. Should I implement strict department isolation?

> [!WARNING]  
> 3. **Your `.env` contains real credentials** (email password, DB password). I'll create a `.env.example` with placeholder values and `.gitignore` the real `.env`.

> [!NOTE]
> 4. **Geofence**: You mentioned 3 locations but testing on 1. Should I build the `office_locations` table for multiple locations now, or start with a single location in settings?

---

## Verification Plan

### Automated Tests
- `node server/index.js` — verify server starts and connects to PostgreSQL
- `psql -d devriz_hrms -f server/db/schema.sql` — verify all tables create cleanly
- `npm run dev` (client) — verify React app loads with login page

### Manual Verification
- Login with test credentials (SA001, HR001, EMP001 from your test data)
- Check-in with geofence (using browser location API)
- Apply leave → HR approves → balance updates
- Assign task → email received
- Download Excel report
- Create emergency notification → visible to all employees
