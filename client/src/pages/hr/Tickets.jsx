import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { MessageSquare } from 'lucide-react';

export default function HRTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [editForm, setEditForm] = useState({ status: '', resolution: '' });

  const fetchTickets = async () => {
    try {
      const res = await api.get('/tickets/all');
      setTickets(res.data.tickets);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const startUpdate = (ticket) => {
    setUpdatingId(ticket.id);
    setEditForm({ status: ticket.status, resolution: ticket.resolution || '' });
  };

  const handleUpdate = async (ticketId) => {
    try {
      await api.put(`/tickets/${ticketId}/status`, editForm);
      setUpdatingId(null);
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update ticket');
    }
  };

  if (loading) return <div>Loading department tickets...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <MessageSquare size={24} color="var(--primary)" /> Department Tickets
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Concerns raised by employees in <strong>{user?.department}</strong>
        </p>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {tickets.map(ticket => (
          <div key={ticket.id} className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{ticket.subject}</h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  From: {ticket.raised_by_name} ({ticket.raised_by_emp_id}) · {ticket.department}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={getPriorityStyle(ticket.priority)}>{ticket.priority.toUpperCase()}</span>
                <span style={getStatusStyle(ticket.status)}>{ticket.status.replace('_', ' ').toUpperCase()}</span>
              </div>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '16px' }}>{ticket.description}</p>

            {updatingId === ticket.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                <div>
                  <label style={styles.label}>Status</label>
                  <select
                    className="input-field"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Resolution / Reply</label>
                  <textarea
                    className="input-field"
                    rows="3"
                    value={editForm.resolution}
                    onChange={(e) => setEditForm({ ...editForm, resolution: e.target.value })}
                    placeholder="Explain how this was addressed..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" onClick={() => handleUpdate(ticket.id)}>Save & Notify Employee</button>
                  <button className="btn btn-outline" onClick={() => setUpdatingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {ticket.resolution && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--success)', marginBottom: '12px' }}>
                    <h5 style={{ margin: '0 0 8px 0', color: 'var(--success)' }}>Resolution</h5>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>{ticket.resolution}</p>
                  </div>
                )}
                <button className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => startUpdate(ticket)}>
                  Update Status
                </button>
              </>
            )}

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '12px' }}>
              Raised: {new Date(ticket.created_at).toLocaleString()}
            </div>
          </div>
        ))}

        {tickets.length === 0 && (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No tickets from your department yet.
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  label: { display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' },
};

function getPriorityStyle(priority) {
  const base = { padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' };
  switch (priority) {
    case 'high': return { ...base, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' };
    case 'medium': return { ...base, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' };
    case 'low': return { ...base, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' };
    default: return base;
  }
}

function getStatusStyle(status) {
  const base = { padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid currentColor' };
  switch (status) {
    case 'open': return { ...base, color: 'var(--warning)' };
    case 'in_progress': return { ...base, color: 'var(--primary)' };
    case 'resolved': return { ...base, color: 'var(--success)' };
    case 'closed': return { ...base, color: 'var(--text-muted)' };
    default: return base;
  }
}
