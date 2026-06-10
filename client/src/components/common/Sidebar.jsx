import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  Home, Clock, Calendar, CheckSquare, MessageSquare,
  Bell, Users, Settings, Database, Activity, Menu, X 
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;
  const [mobileOpen, setMobileOpen] = useState(false);

  // Define links based on role
  const getLinks = () => {
    switch (role) {
      case 'employee':
        return [
          { to: '/employee', icon: <Home size={20} />, label: 'Dashboard' },
          { to: '/employee/attendance', icon: <Clock size={20} />, label: 'Attendance' },
          { to: '/employee/leave', icon: <Calendar size={20} />, label: 'Leave' },
          { to: '/employee/tasks', icon: <CheckSquare size={20} />, label: 'Tasks' },
          { to: '/employee/tickets', icon: <MessageSquare size={20} />, label: 'Tickets' },
        ];
      case 'hr':
        return [
          { to: '/hr', icon: <Home size={20} />, label: 'Dashboard' },
          { to: '/hr/employees', icon: <Users size={20} />, label: 'Employees' },
          { to: '/hr/attendance', icon: <Clock size={20} />, label: 'Attendance' },
          { to: '/hr/leave', icon: <Calendar size={20} />, label: 'Leave' },
          { to: '/hr/tasks', icon: <CheckSquare size={20} />, label: 'Tasks' },
          { to: '/hr/tickets', icon: <MessageSquare size={20} />, label: 'Tickets' },
          { to: '/hr/holidays', icon: <Calendar size={20} />, label: 'Holidays' },
        ];
      case 'super_admin':
        return [
          { to: '/superadmin', icon: <Home size={20} />, label: 'Dashboard' },
          { to: '/superadmin/departments', icon: <Database size={20} />, label: 'Departments' },
          { to: '/superadmin/employees', icon: <Users size={20} />, label: 'All Employees' },
          { to: '/superadmin/attendance', icon: <Clock size={20} />, label: 'Attendance' },
          { to: '/superadmin/leave', icon: <Calendar size={20} />, label: 'Leaves' },
          { to: '/superadmin/tasks', icon: <CheckSquare size={20} />, label: 'Tasks' },
          { to: '/superadmin/notifications', icon: <Bell size={20} />, label: 'Notifications' },
          { to: '/superadmin/settings', icon: <Settings size={20} />, label: 'Settings' },
        ];
      case 'developer':
        return [
          { to: '/developer', icon: <Home size={20} />, label: 'Dashboard' },
          { to: '/developer/logs', icon: <Activity size={20} />, label: 'Audit Logs' },
          { to: '/developer/db', icon: <Database size={20} />, label: 'Database' },
          { to: '/developer/users', icon: <Users size={20} />, label: 'User Management' },
        ];
      default:
        return [];
    }
  };

  const links = getLinks();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar sidebar-desktop" style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>DR</div>
          <div style={styles.logoText}>Devriz HRMS</div>
        </div>
        
        <nav style={styles.nav}>
          {links.map((link, idx) => (
            <NavLink 
              key={idx} 
              to={link.to} 
              end={link.to.split('/').length === 2}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {})
              })}
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile Hamburger Button */}
      <button 
        className="hamburger-btn"
        style={styles.hamburgerBtn}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Menu Drawer */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div 
            style={styles.overlay}
            onClick={() => setMobileOpen(false)}
          />
          
          {/* Mobile Sidebar */}
          <aside className="sidebar sidebar-mobile" style={styles.mobileSidebar}>
            <div style={{ ...styles.logoContainer, marginBottom: '24px' }}>
              <div style={styles.logoIcon}>DR</div>
              <div style={styles.logoText}>Devriz HRMS</div>
            </div>
            
            <nav style={styles.nav}>
              {links.map((link, idx) => (
                <NavLink 
                  key={idx} 
                  to={link.to} 
                  end={link.to.split('/').length === 2}
                  onClick={() => setMobileOpen(false)}
                  style={({ isActive }) => ({
                    ...styles.navLink,
                    ...(isActive ? styles.navLinkActive : {})
                  })}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}

const styles = {
  sidebar: {
    width: '260px',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    background: 'var(--bg-card)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    zIndex: 100,
    overflowY: 'auto'
  },
  mobileSidebar: {
    width: '260px',
    maxWidth: '85vw',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    background: 'var(--bg-card)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    zIndex: 200,
    overflowY: 'auto',
    animation: 'slideIn 0.3s ease-out'
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    zIndex: 150,
    animation: 'fadeIn 0.3s ease-out'
  },
  hamburgerBtn: {
    display: 'none',
    position: 'fixed',
    top: '16px',
    left: '16px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-main)',
    cursor: 'pointer',
    zIndex: 180,
    padding: '8px',
    transition: 'all 0.2s ease'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '40px',
    paddingLeft: '8px'
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1rem',
    boxShadow: '0 4px 10px var(--primary-glow)'
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: '600',
    letterSpacing: '-0.5px'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: 'var(--text-muted)',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  navLinkActive: {
    color: 'var(--text-main)',
    background: 'rgba(59, 130, 246, 0.1)',
    color: 'var(--primary)',
  }
};
