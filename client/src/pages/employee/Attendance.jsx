import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Clock } from 'lucide-react';

export default function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await api.get('/attendance/my');
        setAttendance(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  if (loading) return <div>Loading attendance...</div>;

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Clock size={20} color="var(--primary)" /> Attendance History (Last 30 Days)
      </h3>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px' }}>Date</th>
              <th style={{ padding: '12px' }}>Check In</th>
              <th style={{ padding: '12px' }}>Check Out</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Mode</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((record) => (
              <tr key={record.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px' }}>{new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                <td style={{ padding: '12px' }}>{record.check_in || '--:--'}</td>
                <td style={{ padding: '12px' }}>{record.check_out || '--:--'}</td>
                <td style={{ padding: '12px' }}>
                  <span style={getStatusStyle(record.status)}>
                    {record.status?.toUpperCase() || 'ABSENT'}
                  </span>
                </td>
                <td style={{ padding: '12px', textTransform: 'uppercase', fontSize: '0.85rem' }}>{record.attendance_mode || '-'}</td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No attendance records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getStatusStyle(status) {
  const base = { padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' };
  switch (status) {
    case 'present': return { ...base, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' };
    case 'late': return { ...base, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' };
    case 'absent': return { ...base, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' };
    case 'casual': return { ...base, background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary)' };
    case 'holiday': return { ...base, background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)' };
    default: return { ...base, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' };
  }
}
