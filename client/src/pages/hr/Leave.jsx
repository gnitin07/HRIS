import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Calendar, Check, X } from 'lucide-react';

export default function Leave() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leave/all');
      setApplications(res.data.applications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleAction = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status} this leave?`)) return;
    try {
      await api.put(`/leave/approve/${id}`, { status });
      fetchLeaves();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${status} leave`);
    }
  };

  if (loading) return <div>Loading leaves...</div>;

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={24} color="var(--primary)" /> Leave Approvals
        </h2>
        {pendingCount > 0 && (
          <div style={{ background: 'var(--warning)', color: '#000', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>
            {pendingCount} Pending
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Employee</th>
                <th style={{ padding: '12px' }}>Type</th>
                <th style={{ padding: '12px' }}>Duration</th>
                <th style={{ padding: '12px' }}>Reason</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '500' }}>{app.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{app.emp_id}</div>
                  </td>
                  <td style={{ padding: '12px', textTransform: 'uppercase' }}>{app.leave_type}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontSize: '0.9rem' }}>{new Date(app.from_date).toLocaleDateString()} to</div>
                    <div style={{ fontSize: '0.9rem' }}>{new Date(app.to_date).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: '12px', maxWidth: '250px' }}>{app.reason}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={getStatusStyle(app.status)}>{app.status.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {app.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '6px', color: 'var(--success)', borderColor: 'var(--success)' }}
                          onClick={() => handleAction(app.id, 'approved')}
                          title="Approve"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '6px', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          onClick={() => handleAction(app.id, 'rejected')}
                          title="Reject"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No leave applications found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getStatusStyle(status) {
  const base = { padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' };
  switch (status) {
    case 'approved': return { ...base, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' };
    case 'pending': return { ...base, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' };
    case 'rejected': return { ...base, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' };
    default: return base;
  }
}
