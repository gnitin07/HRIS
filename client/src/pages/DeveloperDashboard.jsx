import React, { useState, useEffect } from 'react';
import { Activity, Database, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function DeveloperDashboard() {
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    api.get('/system/overview').then(res => setOverview(res.data)).catch(console.error);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity color="var(--success)" /> Developer Root Access
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>System-level configurations and database oversight.</p>
      </div>

      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{overview.total_users}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Users</div>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{overview.table_stats.find(s => s.table === 'audit_logs')?.count || 0}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Audit Events</div>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{overview.table_stats.find(s => s.table === 'tickets')?.count || 0}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tickets</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--success)" /> Audit Logs
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
            View all system actions — employee changes, settings updates, notifications.
          </p>
          <Link to="/developer/logs" className="btn btn-primary" style={{ width: '100%' }}>View Audit Logs</Link>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} color="var(--secondary)" /> Database Overview
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
            Table row counts and recent database activity.
          </p>
          <Link to="/developer/db" className="btn btn-primary" style={{ width: '100%' }}>Open DB Overview</Link>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="var(--primary)" /> User Management
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
            Directly modify employee records and bypass HR isolation rules.
          </p>
          <Link to="/developer/users" className="btn btn-primary" style={{ width: '100%' }}>Manage Records</Link>
        </div>
      </div>
    </div>
  );
}
