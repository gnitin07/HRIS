import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { downloadAttendanceExcel } from '../../utils/downloadReport';
import { getLocalToday, getLocalStartOfWeek, getLocalStartOfMonth } from '../../utils/dateUtils';
import { Clock, Download, CheckSquare } from 'lucide-react';

const today = () => getLocalToday();

const startOfWeek = () => getLocalStartOfWeek();

const startOfMonth = () => getLocalStartOfMonth();



export default function Attendance() {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [absentDate, setAbsentDate] = useState(today());
  const [exporting, setExporting] = useState(false);

  const fetchReport = async () => {
    if (fromDate > toDate) return;
    setLoading(true);
    try {
      const res = await api.get(`/attendance/report?from_date=${fromDate}&to_date=${toDate}`);
      setReport(res.data.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [fromDate, toDate]);

  const handleMarkAbsent = async () => {
    if (!window.confirm(`Mark absent for all employees without check-in on ${absentDate}?`)) return;
    try {
      await api.post('/attendance/mark-absent', { date: absentDate });
      fetchReport();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark absent');
    }
  };

  const downloadExcel = async () => {
    if (fromDate > toDate) {
      alert('From date cannot be after To date.');
      return;
    }
    setExporting(true);
    try {
      await downloadAttendanceExcel({ fromDate, toDate });
    } catch (err) {
      alert(err.message || 'Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  const setPreset = (preset) => {
    const t = today();
    if (preset === 'today') {
      setFromDate(t);
      setToDate(t);
    } else if (preset === 'week') {
      setFromDate(startOfWeek());
      setToDate(t);
    } else if (preset === 'month') {
      setFromDate(startOfMonth());
      setToDate(t);
    }
  };

  const isRange = fromDate !== toDate;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Clock size={24} color="var(--primary)" /> Department Attendance
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          View and export your department&apos;s attendance for any date range.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <label style={styles.label}>From</label>
            <input type="date" className="input-field" value={fromDate} max={toDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>To</label>
            <input type="date" className="input-field" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => setPreset('today')}>Today</button>
            <button type="button" className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => setPreset('week')}>This Week</button>
            <button type="button" className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => setPreset('month')}>This Month</button>
          </div>
          <button className="btn btn-primary" onClick={downloadExcel} disabled={exporting}>
            <Download size={18} /> {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>

        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <label style={styles.label}>Mark absent for date</label>
            <input type="date" className="input-field" value={absentDate} onChange={(e) => setAbsentDate(e.target.value)} />
          </div>
          <button className="btn btn-outline" onClick={handleMarkAbsent} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
            <CheckSquare size={18} /> Mark Absent EOD
          </button>
        </div>
      </div>

      {fromDate > toDate && (
        <div style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>From date must be on or before To date.</div>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Showing {report.length} record{report.length !== 1 ? 's' : ''} from {fromDate} to {toDate}
        </div>
        {loading ? (
          <div>Loading attendance...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  {isRange && <th style={{ padding: '12px' }}>Date</th>}
                  <th style={{ padding: '12px' }}>Emp ID</th>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Check In</th>
                  <th style={{ padding: '12px' }}>Check Out</th>
                  <th style={{ padding: '12px' }}>Mode</th>
                  <th style={{ padding: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.map((record, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {isRange && (
                      <td style={{ padding: '12px' }}>
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                    )}
                    <td style={{ padding: '12px', fontWeight: '500' }}>{record.emp_id}</td>
                    <td style={{ padding: '12px' }}>{record.name}</td>
                    <td style={{ padding: '12px' }}>{record.check_in || '--:--'}</td>
                    <td style={{ padding: '12px' }}>{record.check_out || '--:--'}</td>
                    <td style={{ padding: '12px', textTransform: 'uppercase', fontSize: '0.85rem' }}>{record.attendance_mode || '-'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={getStatusStyle(record.status)}>{(record.status || 'ABSENT').toUpperCase()}</span>
                    </td>
                  </tr>
                ))}
                {report.length === 0 && (
                  <tr>
                    <td colSpan={isRange ? 7 : 6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No attendance records in this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  label: { display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' },
};

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
