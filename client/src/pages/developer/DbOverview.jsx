import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Database, Activity } from 'lucide-react';

export default function DbOverview() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/system/overview')
      .then(res => setOverview(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading database overview...</div>;
  if (!overview) return <div>Failed to load overview.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Database size={24} color="var(--secondary)" /> Database Overview
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>Table row counts and recent system activity.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Today's Check-ins</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--success)' }}>
            {overview.todays_activity?.checkins || 0}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Leave Requests (Today)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--warning)' }}>
            {overview.todays_activity?.leave_requests || 0}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tickets Resolved (Today)</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>
            {overview.todays_activity?.tickets_resolved || 0}
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: '16px' }}>Database Tables</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
        {overview.table_stats.map(({ table, count }) => (
          <div key={table} className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{count}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{table}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Recent Employees</h3>
          {overview.recent_employees.map(emp => (
            <div key={emp.emp_id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
              <strong>{emp.name}</strong> ({emp.emp_id}) — {emp.department || 'No dept'}
            </div>
          ))}
          {overview.recent_employees.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No employees.</p>}
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Recent Audit Events</h3>
          {overview.recent_audit.map((log, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
              <code>{log.action}</code> — {log.user_name || 'System'}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString()}</div>
            </div>
          ))}
          {overview.recent_audit.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No audit events yet.</p>}
        </div>
      </div>
    </div>
  );
}
