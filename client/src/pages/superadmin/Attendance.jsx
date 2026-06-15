import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { downloadAttendanceExcel } from '../../utils/downloadReport';
import { getLocalToday } from '../../utils/dateUtils';
import { Clock, Download, CheckSquare, Edit } from 'lucide-react';

export default function SAAttendance() {
  const [report, setReport] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = getLocalToday();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [deptFilter, setDeptFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = `/attendance/report?from_date=${fromDate}&to_date=${toDate}`;
      if (deptFilter) url += `&department=${encodeURIComponent(deptFilter)}`;
      const res = await api.get(url);
      setReport(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data.departments)).catch(console.error);
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fromDate, toDate, deptFilter]);

  const handleMarkAbsent = async () => {
    if (!window.confirm(`Mark absent for all without check-in on ${toDate}?`)) return;
    try {
      await api.post('/attendance/mark-absent', { date: toDate });
      fetchReport();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to mark absent');
    }
  };

  const downloadExcel = async () => {
    setExporting(true);
    try {
      await downloadAttendanceExcel({ fromDate, toDate, department: deptFilter || undefined });
    } catch (err) {
      alert(err.message || 'Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    try {
      await api.put('/attendance/edit', editing);
      setEditing(null);
      fetchReport();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update attendance');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={24} color="var(--primary)" /> Company-Wide Attendance
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" className="input-field" style={{ width: 'auto' }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <span style={{ color: 'var(--text-muted)' }}>to</span>
          <input type="date" className="input-field" style={{ width: 'auto' }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <select className="input-field" style={{ width: 'auto' }} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <button className="btn btn-outline" onClick={handleMarkAbsent} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
            <CheckSquare size={18} /> Mark Absent EOD
          </button>
          <button className="btn btn-primary" onClick={downloadExcel} disabled={exporting}>
            <Download size={18} /> {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {editing && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Edit Attendance — {editing.emp_id} on {editing.date}</h3>
          <form onSubmit={handleEditSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={styles.label}>Check In</label>
              <input type="time" className="input-field" value={editing.check_in || ''} onChange={(e) => setEditing({ ...editing, check_in: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Check Out</label>
              <input type="time" className="input-field" value={editing.check_out || ''} onChange={(e) => setEditing({ ...editing, check_out: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Status</label>
              <select className="input-field" value={editing.status || 'present'} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="casual">Casual Leave</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary">Save</button>
              <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <div>Loading attendance...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px' }}>Emp ID</th>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px' }}>Department</th>
                  <th style={{ padding: '12px' }}>Check In</th>
                  <th style={{ padding: '12px' }}>Check Out</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {report.map((record, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px' }}>{new Date(record.date).toLocaleDateString()}</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{record.emp_id}</td>
                    <td style={{ padding: '12px' }}>{record.name}</td>
                    <td style={{ padding: '12px' }}>{record.department || '-'}</td>
                    <td style={{ padding: '12px' }}>{record.check_in || '--:--'}</td>
                    <td style={{ padding: '12px' }}>{record.check_out || '--:--'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={getStatusStyle(record.status)}>{(record.status || 'ABSENT').toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        onClick={() => setEditing({
                          emp_id: record.emp_id,
                          date: record.date?.split('T')[0] || record.date,
                          check_in: record.check_in || '',
                          check_out: record.check_out || '',
                          status: record.status || 'present',
                        })}
                      >
                        <Edit size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {report.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No records for selected filters.
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
  label: { display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' },
};

function getStatusStyle(status) {
  const base = { padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600' };
  switch (status) {
    case 'present': return { ...base, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' };
    case 'late': return { ...base, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' };
    case 'holiday': return { ...base, background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)' };
    case 'casual': return { ...base, background: 'rgba(139, 92, 246, 0.1)', color: 'var(--secondary)' };
    default: return { ...base, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' };
  }
}
