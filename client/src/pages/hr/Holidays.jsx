import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Calendar, Plus } from 'lucide-react';
import { getLocalToday } from '../../utils/dateUtils';

export default function HRHolidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ date: '', name: '' });

  const fetchHolidays = async () => {
    try {
      const res = await api.get('/attendance/holidays');
      setHolidays(res.data.holidays);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Declare "${formData.name}" as holiday on ${formData.date}? This marks all employees.`)) return;
    try {
      await api.post('/attendance/holiday', formData);
      setShowForm(false);
      setFormData({ date: '', name: '' });
      fetchHolidays();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to declare holiday');
    }
  };

  if (loading) return <div>Loading holidays...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={24} color="var(--primary)" /> Restricted Holidays
        </h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> Declare Holiday
        </button>
      </div>

      {showForm && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', maxWidth: '480px' }}>
          <h3 style={{ marginBottom: '16px' }}>Declare Company Holiday</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={styles.label}>Date</label>
              <input type="date" className="input-field" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required min={getLocalToday()} />
            </div>
            <div>
              <label style={styles.label}>Holiday Name</label>
              <input type="text" className="input-field" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g. Diwali, Republic Day" />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary">Declare</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Date</th>
                <th style={{ padding: '12px' }}>Holiday Name</th>
                <th style={{ padding: '12px' }}>Declared On</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map(h => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{new Date(h.date).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>{h.name}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {h.created_at ? new Date(h.created_at).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
              {holidays.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No holidays declared yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  label: { display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' },
};
