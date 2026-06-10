import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Calendar, Plus } from 'lucide-react';

export default function Leave() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({ leave_type: 'casual', from_date: '', to_date: '', reason: '' });

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leave/my');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leave/apply', formData);
      setShowForm(false);
      setFormData({ leave_type: 'casual', from_date: '', to_date: '', reason: '' });
      fetchLeaves();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply leave');
    }
  };

  if (loading) return <div>Loading leave history...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={24} color="var(--primary)" /> Leave Management
        </h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> Apply Leave
        </button>
      </div>

      {showForm && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>New Leave Application</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Leave Type</label>
              <select className="input-field" value={formData.leave_type} onChange={(e) => setFormData({...formData, leave_type: e.target.value})} required>
                <option value="casual">Casual Leave (CL)</option>
                <option value="wfh">Work From Home (WFH)</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>From Date</label>
                <input type="date" className="input-field" value={formData.from_date} onChange={(e) => setFormData({...formData, from_date: e.target.value})} required min={new Date().toISOString().split('T')[0]} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>To Date</label>
                <input type="date" className="input-field" value={formData.to_date} onChange={(e) => setFormData({...formData, to_date: e.target.value})} required min={formData.from_date || new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Reason</label>
              <textarea className="input-field" rows="3" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} required></textarea>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Submit Application</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '24px' }}>Application History</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Type</th>
                <th style={{ padding: '12px' }}>Duration</th>
                <th style={{ padding: '12px' }}>Reason</th>
                <th style={{ padding: '12px' }}>Applied On</th>
                <th style={{ padding: '12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', textTransform: 'uppercase' }}>{app.leave_type}</td>
                  <td style={{ padding: '12px' }}>
                    {new Date(app.from_date).toLocaleDateString()} - {new Date(app.to_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.reason}</td>
                  <td style={{ padding: '12px' }}>{new Date(app.applied_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={getStatusStyle(app.status)}>{app.status.toUpperCase()}</span>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No leave applications found.</td>
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
