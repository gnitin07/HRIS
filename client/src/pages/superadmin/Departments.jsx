import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Building2, Plus, UserCheck } from 'lucide-react';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [hrUsers, setHrUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDeptName, setNewDeptName] = useState('');
  const [assigning, setAssigning] = useState({});

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

  useEffect(() => {
    fetchData();
  }, []);

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

  if (loading) return <div>Loading departments...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Building2 size={24} color="var(--primary)" /> Departments
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Add departments here first. Employee forms use this list to prevent typos.
        </p>
      </div>

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

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Department</th>
                <th style={{ padding: '12px' }}>Assigned HR</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => (
                <tr key={dept.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{dept.name}</td>
                  <td style={{ padding: '12px' }}>
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
                    {dept.hr_name && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '4px' }}>
                        Current: {dept.hr_name}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '4px 8px', color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.8rem' }}
                      onClick={() => handleDelete(dept)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
