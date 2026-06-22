import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Clock, Plus } from 'lucide-react';
import { getLocalToday } from '../../utils/dateUtils';

export default function Regularization() {
  const [applications, setApplications] = useState([]);
  const [leaveStats, setLeaveStats] = useState({ balance: null, pending_cl: 0, pending_reg: 0, max_regularizations: 3 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({ leave_type: 'regularization', from_date: '', to_date: '', reason: '' });

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leave/my');
      // Filter only regularization applications
      setApplications(res.data.applications.filter(app => app.leave_type === 'regularization'));
      setLeaveStats({
        balance: res.data.balance,
        pending_cl: res.data.pending_cl,
        pending_reg: res.data.pending_reg,
        max_regularizations: res.data.max_regularizations
      });
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
      setFormData({ leave_type: 'regularization', from_date: '', to_date: '', reason: '' });
      fetchLeaves();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply regularization');
    }
  };

  if (loading) return <div>Loading history...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={24} color="var(--primary)" /> Regularization
        </h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> Apply Regularization
        </button>
      </div>

      {showForm && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>New Regularization Application</h3>
          
          {leaveStats.balance && (
            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--input-bg)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <div>
                <strong style={{ color: 'var(--text-color)' }}>Regularizations Available:</strong> {leaveStats.max_regularizations - (leaveStats.balance.regularization_used || 0) - leaveStats.pending_reg} 
                <span style={{ fontSize: '0.8rem', marginLeft: '6px' }}>(On Hold: {leaveStats.pending_reg})</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>From Date</label>
                <input type="date" className="input-field" value={formData.from_date} onChange={(e) => setFormData({...formData, from_date: e.target.value})} required max={getLocalToday()} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>To Date</label>
                <input type="date" className="input-field" value={formData.to_date} onChange={(e) => setFormData({...formData, to_date: e.target.value})} required min={formData.from_date} max={getLocalToday()} />
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
        <h3 style={{ marginBottom: '24px' }}>History</h3>
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
                    {new Date(app.from_date).toLocaleDateString()}
                    {app.from_date !== app.to_date && ` to ${new Date(app.to_date).toLocaleDateString()}`}
                  </td>
                  <td style={{ padding: '12px' }}>{app.reason}</td>
                  <td style={{ padding: '12px' }}>{new Date(app.applied_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '500',
                      background: app.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 
                                  app.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: app.status === 'approved' ? 'var(--success)' : 
                             app.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'
                    }}>
                      {app.status}
                    </span>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No regularization history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
