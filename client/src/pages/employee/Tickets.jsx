import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { MessageSquare, Plus } from 'lucide-react';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({ subject: '', description: '', priority: 'medium' });

  const fetchTickets = async () => {
    try {
      const res = await api.get('/tickets/my');
      setTickets(res.data.tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tickets/create', formData);
      setShowForm(false);
      setFormData({ subject: '', description: '', priority: 'medium' });
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to raise concern');
    }
  };

  if (loading) return <div>Loading tickets...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={24} color="var(--primary)" /> My Concerns & Tickets
        </h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> Raise Concern
        </button>
      </div>

      {showForm && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Raise a New Concern</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Subject</label>
              <input type="text" className="input-field" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} required placeholder="Brief title of your concern" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Priority</label>
              <select className="input-field" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} required>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Description</label>
              <textarea className="input-field" rows="4" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required placeholder="Please describe your concern in detail..."></textarea>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Submit Ticket</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gap: '16px' }}>
        {tickets.map(ticket => (
          <div key={ticket.id} className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{ticket.subject}</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={getPriorityStyle(ticket.priority)}>{ticket.priority.toUpperCase()}</span>
                <span style={getStatusStyle(ticket.status)}>{ticket.status.toUpperCase()}</span>
              </div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '16px' }}>{ticket.description}</p>
            
            {ticket.resolution && (
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--success)', marginTop: '16px' }}>
                <h5 style={{ margin: '0 0 8px 0', color: 'var(--success)' }}>Resolution</h5>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>{ticket.resolution}</p>
              </div>
            )}
            
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '16px' }}>
              Raised on: {new Date(ticket.created_at).toLocaleString()}
            </div>
          </div>
        ))}

        {tickets.length === 0 && (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No concerns raised yet.
          </div>
        )}
      </div>
    </div>
  );
}

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
