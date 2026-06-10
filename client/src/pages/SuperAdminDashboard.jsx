import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { Shield, Users, MapPin, Bell, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalEmployees: 0, totalHRs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/auth/employees');
        const employees = res.data.employees;
        setStats({
          totalEmployees: employees.filter(e => e.role === 'employee').length,
          totalHRs: employees.filter(e => e.role === 'hr').length
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield color="var(--danger)" /> Super Admin Operations
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>System-wide overview and configurations</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={styles.iconBoxPrimary}>
            <Users size={28} />
          </div>
          <div>
            <div style={styles.statLabel}>Total Employees</div>
            <div style={styles.statValue}>{stats.totalEmployees}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={styles.iconBoxSecondary}>
            <Shield size={28} />
          </div>
          <div>
            <div style={styles.statLabel}>HR Admins</div>
            <div style={styles.statValue}>{stats.totalHRs}</div>
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '16px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Administration Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link to="/superadmin/departments" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
              <Building2 size={18} /> Manage Departments & HR Assignment
            </Link>
            <Link to="/superadmin/employees" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
              <Users size={18} /> Manage All Employees & HRs
            </Link>
            <Link to="/superadmin/notifications" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
              <Bell size={18} /> Dispatch Emergency Notifications
            </Link>
            <Link to="/superadmin/settings" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
              <MapPin size={18} /> Geofence & System Settings
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}

const styles = {
  iconBoxPrimary: {
    width: '60px', height: '60px', borderRadius: '12px',
    background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  iconBoxSecondary: {
    width: '60px', height: '60px', borderRadius: '12px',
    background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  statLabel: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  statValue: {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    lineHeight: 1.2
  }
};
