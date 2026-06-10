import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Bell, Plus, XCircle } from 'lucide-react';

export default function SANotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '', message: '', type: 'emergency', target_role: '', expires_at: '',
  });

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/all');
      setNotifications(res.data.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/notifications/create', {
        ...formData,
        target_role: formData.target_role || null,
        expires_at: formData.expires_at || null,
      });
      setShowForm(false);
      setFormData({ title: '', message: '', type: 'emergency', target_role: '', expires_at: '' });
      fetchNotifications();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create notification');
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this notification? It will no longer show to users.')) return;
    try {
      await api.put(`/notifications/${id}/deactivate`);
      fetchNotifications();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to deactivate');
    }
  };

  if (loading) return <div>Loading notifications...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={24} color="var(--primary)" /> Emergency Notifications
        </h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> Broadcast Notice
        </button>
      </div>

      {showForm && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--warning)' }}>
          <h3 style={{ marginBottom: '16px' }}>Create Notification</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '560px' }}>
            <div>
              <label style={styles.label}>Title</label>
              <input type="text" className="input-field" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required placeholder="e.g. Office closed due to weather" />
            </div>
            <div>
              <label style={styles.label}>Message</label>
              <textarea className="input-field" rows="4" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={styles.label}>Type</label>
                <select className="input-field" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Target Audience</label>
                <select className="input-field" value={formData.target_role} onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}>
                  <option value="">Everyone</option>
                  <option value="employee">Employees only</option>
                  <option value="hr">HR only</option>
                </select>
              </div>
            </div>
            <div>
              <label style={styles.label}>Expires At (optional)</label>
              <input type="datetime-local" className="input-field" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary">Send Notification</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gap: '16px' }}>
          {notifications.map(n => (
            <div key={n.id} style={{ padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', opacity: n.is_active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={getTypeStyle(n.type)}>{n.type.toUpperCase()}</span>
                    {!n.is_active && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>INACTIVE</span>}
                    {n.target_role && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>→ {n.target_role}</span>}
                  </div>
                  <h4 style={{ margin: '0 0 8px 0' }}>{n.title}</h4>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>{n.message}</p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '12px' }}>
                    By {n.created_by_name || 'System'} · {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                {n.is_active && (
                  <button className="btn btn-outline" style={{ padding: '6px', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDeactivate(n.id)} title="Deactivate">
                    <XCircle size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No notifications sent yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  label: { display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' },
};

function getTypeStyle(type) {
  const base = { padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' };
  switch (type) {
    case 'emergency': return { ...base, background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' };
    case 'warning': return { ...base, background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)' };
    default: return { ...base, background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)' };
  }
}
