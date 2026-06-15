import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Building2, Plus, UserCheck, ChevronDown, ChevronUp, Clock, Save } from 'lucide-react';

const DEFAULT_SCHEDULE = {
  checkin_start: '',
  checkin_end: '',
  hours_present: '',
  hours_regularization: '',
  hours_half_day: '',
};

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [hrUsers, setHrUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDeptName, setNewDeptName] = useState('');
  const [assigning, setAssigning] = useState({});
  const [expandedSchedule, setExpandedSchedule] = useState({});
  const [scheduleEdits, setScheduleEdits] = useState({});
  const [saving, setSaving] = useState({});

  const fetchData = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        api.get('/departments'),
        api.get('/auth/employees'),
      ]);
      setDepartments(deptRes.data.departments);
      setHrUsers(empRes.data.employees.filter(e => e.role === 'hr'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      await api.post('/departments', { name: newDeptName.trim() });
      setNewDeptName('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create department');
    }
  };

  const handleAssignHR = async (deptId) => {
    const hrId = assigning[deptId];
    try {
      await api.put(`/departments/${deptId}`, { hr_id: hrId || null });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign HR');
    }
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"?`)) return;
    try {
      await api.delete(`/departments/${dept.id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete department');
    }
  };

  const toggleSchedule = (deptId, dept) => {
    const isOpen = expandedSchedule[deptId];
    setExpandedSchedule(prev => ({ ...prev, [deptId]: !isOpen }));
    if (!isOpen && !scheduleEdits[deptId]) {
      // Pre-fill with existing values
      setScheduleEdits(prev => ({
        ...prev,
        [deptId]: {
          checkin_start:        dept.checkin_start        || '',
          checkin_end:          dept.checkin_end          || '',
          hours_present:        dept.hours_present        || '',
          hours_regularization: dept.hours_regularization || '',
          hours_half_day:       dept.hours_half_day       || '',
        },
      }));
    }
  };

  const handleScheduleChange = (deptId, field, value) => {
    setScheduleEdits(prev => ({
      ...prev,
      [deptId]: { ...prev[deptId], [field]: value },
    }));
  };

  const handleSaveSchedule = async (deptId) => {
    setSaving(prev => ({ ...prev, [deptId]: true }));
    try {
      const edits = scheduleEdits[deptId] || {};
      await api.put(`/departments/${deptId}`, {
        checkin_start:        edits.checkin_start        || null,
        checkin_end:          edits.checkin_end          || null,
        hours_present:        edits.hours_present        || null,
        hours_regularization: edits.hours_regularization || null,
        hours_half_day:       edits.hours_half_day       || null,
      });
      await fetchData();
      setExpandedSchedule(prev => ({ ...prev, [deptId]: false }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save schedule');
    } finally {
      setSaving(prev => ({ ...prev, [deptId]: false }));
    }
  };

  if (loading) return <div>Loading departments...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Building2 size={24} color="var(--primary)" /> Departments
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Add departments, assign HR, and configure per-department schedules.
        </p>
      </div>

      {/* Add Department */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Add Department</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input-field"
            style={{ flex: 1, minWidth: '200px' }}
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            placeholder="e.g. Finance, Marketing"
            required
          />
          <button type="submit" className="btn btn-primary">
            <Plus size={18} /> Add
          </button>
        </form>
      </div>

      {/* Department List */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {departments.map(dept => (
            <div key={dept.id} style={{ borderBottom: '1px solid var(--border-color)' }}>

              {/* Main Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 0', flexWrap: 'wrap' }}>
                {/* Dept Name */}
                <div style={{ fontWeight: '600', fontSize: '1rem', minWidth: '160px', flex: 1 }}>
                  {dept.name}
                  {dept.checkin_start && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      🕐 {dept.checkin_start}–{dept.checkin_end} &nbsp;|&nbsp;
                      P: {dept.hours_present}h, R: {dept.hours_regularization}h, H: {dept.hours_half_day}h
                    </div>
                  )}
                  {!dept.checkin_start && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Using global schedule
                    </div>
                  )}
                </div>

                {/* HR Assign */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    className="input-field"
                    style={{ minWidth: '180px' }}
                    value={assigning[dept.id] ?? dept.hr_id ?? ''}
                    onChange={(e) => setAssigning({ ...assigning, [dept.id]: e.target.value })}
                  >
                    <option value="">No HR assigned</option>
                    {hrUsers.map(hr => (
                      <option key={hr.id} value={hr.id}>
                        {hr.name} ({hr.emp_id})
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    onClick={() => handleAssignHR(dept.id)}
                  >
                    <UserCheck size={14} /> Save
                  </button>
                </div>

                {/* Schedule toggle */}
                <button
                  className="btn btn-outline"
                  style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => toggleSchedule(dept.id, dept)}
                >
                  <Clock size={14} />
                  Schedule
                  {expandedSchedule[dept.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {/* Delete */}
                <button
                  className="btn btn-outline"
                  style={{ padding: '6px 10px', color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.8rem' }}
                  onClick={() => handleDelete(dept)}
                >
                  Delete
                </button>
              </div>

              {/* Schedule Panel */}
              {expandedSchedule[dept.id] && (
                <div style={{
                  margin: '0 0 16px 0',
                  padding: '20px',
                  background: 'var(--input-bg)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                }}>
                  <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color="var(--primary)" />
                    Schedule for <span style={{ color: 'var(--primary)' }}>{dept.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '400' }}>
                      — Leave blank to use global system settings
                    </span>
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <label style={styles.label}>
                      Check-in Window Start
                      <input
                        type="time"
                        className="input-field"
                        value={scheduleEdits[dept.id]?.checkin_start || ''}
                        onChange={e => handleScheduleChange(dept.id, 'checkin_start', e.target.value)}
                      />
                    </label>
                    <label style={styles.label}>
                      Check-in Window End
                      <input
                        type="time"
                        className="input-field"
                        value={scheduleEdits[dept.id]?.checkin_end || ''}
                        onChange={e => handleScheduleChange(dept.id, 'checkin_end', e.target.value)}
                      />
                    </label>
                    <label style={styles.label}>
                      Full Day Hours (Present)
                      <input
                        type="number" step="0.5" min="1" max="12"
                        className="input-field"
                        placeholder="e.g. 8"
                        value={scheduleEdits[dept.id]?.hours_present || ''}
                        onChange={e => handleScheduleChange(dept.id, 'hours_present', e.target.value)}
                      />
                    </label>
                    <label style={styles.label}>
                      Regularization Threshold (hrs)
                      <input
                        type="number" step="0.5" min="1" max="12"
                        className="input-field"
                        placeholder="e.g. 7"
                        value={scheduleEdits[dept.id]?.hours_regularization || ''}
                        onChange={e => handleScheduleChange(dept.id, 'hours_regularization', e.target.value)}
                      />
                    </label>
                    <label style={styles.label}>
                      Half Day Threshold (hrs)
                      <input
                        type="number" step="0.5" min="0.5" max="12"
                        className="input-field"
                        placeholder="e.g. 4"
                        value={scheduleEdits[dept.id]?.hours_half_day || ''}
                        onChange={e => handleScheduleChange(dept.id, 'hours_half_day', e.target.value)}
                      />
                    </label>
                  </div>
                  <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      disabled={saving[dept.id]}
                      onClick={() => handleSaveSchedule(dept.id)}
                    >
                      <Save size={16} /> {saving[dept.id] ? 'Saving...' : 'Save Schedule'}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => setExpandedSchedule(prev => ({ ...prev, [dept.id]: false }))}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
};
