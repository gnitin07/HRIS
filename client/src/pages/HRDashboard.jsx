import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import MyAttendancePanel from '../components/common/MyAttendancePanel';
import { Users, Calendar, CheckSquare, Clock, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HRDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ employees: 0, pendingLeaves: 0, openTasks: 0, openTickets: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [empRes, leaveRes, tasksRes, ticketsRes] = await Promise.all([
          api.get('/auth/employees'),
          api.get('/leave/all'),
          api.get('/tasks/all'),
          api.get('/tickets/all'),
        ]);

        setStats({
          employees: empRes.data.employees.length,
          pendingLeaves: leaveRes.data.applications.filter(a => a.status === 'pending').length,
          openTasks: tasksRes.data.tasks.filter(t => t.status !== 'done').length,
          openTickets: ticketsRes.data.tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h2 style={{ marginBottom: '8px' }}>HR Dashboard</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Department: <strong>{user?.department}</strong> — you can mark your own attendance and manage your team below.
        </p>
      </div>

      <div>
        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', color: 'var(--text-muted)' }}>My Employee Actions</h3>
        <MyAttendancePanel title="My Attendance Today" />
      </div>

      <div>
        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem', color: 'var(--text-muted)' }}>Department Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={styles.iconBoxPrimary}><Users size={28} /></div>
            <div>
              <div style={styles.statLabel}>Total Employees</div>
              <div style={styles.statValue}>{stats.employees}</div>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={styles.iconBoxWarning}><Calendar size={28} /></div>
            <div>
              <div style={styles.statLabel}>Pending Leaves</div>
              <div style={styles.statValue}>{stats.pendingLeaves}</div>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={styles.iconBoxSuccess}><CheckSquare size={28} /></div>
            <div>
              <div style={styles.statLabel}>Open Tasks</div>
              <div style={styles.statValue}>{stats.openTasks}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={20} color="var(--primary)" /> Department Management
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <Link to="/hr/employees" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>Manage Employees</Link>
          <Link to="/hr/leave" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>Review Leaves</Link>
          <Link to="/hr/attendance" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>Department Attendance</Link>
          <Link to="/hr/holidays" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>Declare Holidays</Link>
          <Link to="/hr/tasks" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>Assign Tasks</Link>
          <Link to="/hr/tickets" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
            <MessageSquare size={16} /> Tickets ({stats.openTickets} open)
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  iconBoxPrimary: {
    width: '60px', height: '60px', borderRadius: '12px',
    background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  iconBoxWarning: {
    width: '60px', height: '60px', borderRadius: '12px',
    background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  iconBoxSuccess: {
    width: '60px', height: '60px', borderRadius: '12px',
    background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  statLabel: { color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' },
  statValue: { fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: 1.2 },
};
