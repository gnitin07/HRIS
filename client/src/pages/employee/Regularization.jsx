import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Clock, AlertTriangle, CheckCircle, Send } from 'lucide-react';

export default function Regularization() {
  const [pendingDays, setPendingDays] = useState([]);
  const [applications, setApplications] = useState([]);
  const [leaveStats, setLeaveStats] = useState({ balance: null, pending_reg: 0, max_regularizations: 3 });
  const [loading, setLoading] = useState(true);
  const [applyingDate, setApplyingDate] = useState(null);
  const [reason, setReason] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);

  const fetchData = async () => {
    try {
      const [pendingRes, leaveRes] = await Promise.all([
        api.get('/leave/regularization/pending-days'),
        api.get('/leave/my'),
      ]);
      setPendingDays(pendingRes.data.pending_days || []);
      // Only show regularization applications
      setApplications(leaveRes.data.applications.filter(app => app.leave_type === 'regularization'));
      setLeaveStats({
        balance: leaveRes.data.balance,
        pending_reg: leaveRes.data.pending_reg,
        max_regularizations: leaveRes.data.max_regularizations
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApply = async (dateStr) => {
    if (!reason.trim()) {
      alert('Please provide a reason for regularization.');
      return;
    }
    setApplyingDate(dateStr);
    try {
      await api.post('/leave/apply', {
        leave_type: 'regularization',
        from_date: dateStr,
        to_date: dateStr,
        reason: reason.trim(),
      });
      setReason('');
      setSelectedDate(null);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply regularization');
    } finally {
      setApplyingDate(null);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const toDateStr = (d) => new Date(d).toISOString().split('T')[0];

  if (loading) return <div>Loading...</div>;

  const regUsed = leaveStats.balance?.regularization_used || 0;
  const regAvailable = leaveStats.max_regularizations - regUsed - leaveStats.pending_reg;
  const totalIssues = pendingDays.length;
  const applied = pendingDays.filter(d => d.already_applied).length;
  const actionRequired = pendingDays.filter(d => !d.already_applied).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Clock size={24} color="var(--primary)" /> Regularization
        </h2>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--warning)' }}>{totalIssues}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Days Needing Regularization</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>{regAvailable}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Regularizations Available</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)' }}>{regUsed}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Used This Month</div>
        </div>
        <div className="glass-panel" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: actionRequired > regAvailable ? 'var(--danger)' : 'var(--text-muted)' }}>
            {Math.max(0, actionRequired - Math.max(0, regAvailable))}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Will Be Half Day</div>
        </div>
      </div>

      {/* Action Required Section */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="var(--warning)" /> Action Required
        </h3>
        
        {pendingDays.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <div>No days need regularization this month. You're all good!</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px' }}>Check In</th>
                  <th style={{ padding: '12px' }}>Check Out</th>
                  <th style={{ padding: '12px' }}>Hours</th>
                  <th style={{ padding: '12px' }}>Issue</th>
                  <th style={{ padding: '12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingDays.map((day) => {
                  const dateStr = toDateStr(day.date);
                  const isSelected = selectedDate === dateStr;
                  return (
                    <React.Fragment key={day.id}>
                      <tr style={{ borderBottom: isSelected ? 'none' : '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px', fontWeight: '500' }}>{formatDate(day.date)}</td>
                        <td style={{ padding: '12px' }}>{day.check_in || '--:--'}</td>
                        <td style={{ padding: '12px' }}>{day.check_out || '--:--'}</td>
                        <td style={{ padding: '12px' }}>{day.hours_worked}h</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '500',
                            background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)'
                          }}>
                            {day.status === 'late' ? 'Late Arrival' : 'Short Hours'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          {day.already_applied ? (
                            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '500' }}>
                              ⏳ Pending Approval
                            </span>
                          ) : regAvailable <= 0 ? (
                            <span style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: '500' }}>
                              — Half Day
                            </span>
                          ) : isSelected ? (
                            <button
                              className="btn btn-outline"
                              style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                              onClick={() => setSelectedDate(null)}
                            >
                              Cancel
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary"
                              style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => { setSelectedDate(dateStr); setReason(''); }}
                            >
                              <Send size={14} /> Apply
                            </button>
                          )}
                        </td>
                      </tr>
                      {isSelected && (
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td colSpan="6" style={{ padding: '0 12px 12px 12px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', maxWidth: '600px' }}>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="Reason for regularization..."
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                style={{ flex: 1, padding: '8px 12px' }}
                                autoFocus
                              />
                              <button
                                className="btn btn-primary"
                                style={{ whiteSpace: 'nowrap', padding: '8px 16px' }}
                                disabled={applyingDate === dateStr || !reason.trim()}
                                onClick={() => handleApply(dateStr)}
                              >
                                {applyingDate === dateStr ? 'Submitting...' : 'Submit'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '24px' }}>Regularization History</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Date</th>
                <th style={{ padding: '12px' }}>Reason</th>
                <th style={{ padding: '12px' }}>Applied On</th>
                <th style={{ padding: '12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{formatDate(app.from_date)}</td>
                  <td style={{ padding: '12px' }}>{app.reason}</td>
                  <td style={{ padding: '12px' }}>{formatDate(app.applied_at)}</td>
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
                  <td colSpan="4" style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No regularization history.
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
