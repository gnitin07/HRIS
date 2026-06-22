import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeAttendance from './pages/employee/Attendance';
import EmployeeLeave from './pages/employee/Leave';
import EmployeeTasks from './pages/employee/Tasks';
import EmployeeTickets from './pages/employee/Tickets';
import EmployeeRegularization from './pages/employee/Regularization';

import HRDashboard from './pages/HRDashboard';
import HREmployees from './pages/hr/Employees';
import HRAttendance from './pages/hr/Attendance';
import HRLeave from './pages/hr/Leave';
import HRTasks from './pages/hr/Tasks';
import HRTickets from './pages/hr/Tickets';
import HRHolidays from './pages/hr/Holidays';

import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SAEmployees from './pages/superadmin/AllEmployees';
import SAAttendance from './pages/superadmin/Attendance';
import SALeaves from './pages/superadmin/Leaves';
import SANotifications from './pages/superadmin/Notifications';
import SASettings from './pages/superadmin/Settings';
import SADepartments from './pages/superadmin/Departments';
import SATasks from './pages/superadmin/Tasks';

import DeveloperDashboard from './pages/DeveloperDashboard';
import DeveloperUsers from './pages/developer/Users';
import DeveloperAuditLogs from './pages/developer/AuditLogs';
import DeveloperDbOverview from './pages/developer/DbOverview';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes — Employee */}
          <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
            <Route path="/employee" element={<EmployeeDashboard />} />
            <Route path="/employee/attendance" element={<EmployeeAttendance />} />
            <Route path="/employee/leave" element={<EmployeeLeave />} />
            <Route path="/employee/regularization" element={<EmployeeRegularization />} />
            <Route path="/employee/tasks" element={<EmployeeTasks />} />
            <Route path="/employee/tickets" element={<EmployeeTickets />} />
          </Route>

          {/* Protected Routes — HR */}
          <Route element={<ProtectedRoute allowedRoles={['hr']} />}>
            <Route path="/hr" element={<HRDashboard />} />
            <Route path="/hr/employees" element={<HREmployees />} />
            <Route path="/hr/attendance" element={<HRAttendance />} />
            <Route path="/hr/leave" element={<HRLeave />} />
            <Route path="/hr/tasks" element={<HRTasks />} />
            <Route path="/hr/tickets" element={<HRTickets />} />
            <Route path="/hr/holidays" element={<HRHolidays />} />
          </Route>

          {/* Protected Routes — Super Admin */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route path="/superadmin" element={<SuperAdminDashboard />} />
            <Route path="/superadmin/employees" element={<SAEmployees />} />
            <Route path="/superadmin/attendance" element={<SAAttendance />} />
            <Route path="/superadmin/leave" element={<SALeaves />} />
            <Route path="/superadmin/notifications" element={<SANotifications />} />
            <Route path="/superadmin/settings" element={<SASettings />} />
            <Route path="/superadmin/departments" element={<SADepartments />} />
            <Route path="/superadmin/tasks" element={<SATasks />} />
          </Route>

          {/* Protected Routes — Developer */}
          <Route element={<ProtectedRoute allowedRoles={['developer']} />}>
            <Route path="/developer" element={<DeveloperDashboard />} />
            <Route path="/developer/logs" element={<DeveloperAuditLogs />} />
            <Route path="/developer/db" element={<DeveloperDbOverview />} />
            <Route path="/developer/users" element={<DeveloperUsers />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
