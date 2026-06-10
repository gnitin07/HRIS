import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Users, UserPlus, Shield, Edit, Search } from 'lucide-react';

export default function AllEmployees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // SA can assign any department and any role (except SA/dev)
  const [formData, setFormData] = useState({
    emp_id: '', name: '', email: '', mobile: '',
    department: '', branch: '', role: 'employee',
    designation: '', joining_date: '', password: '', cl_total: 1, wfh_days_month: 0
  });

  const fetchEmployees = async () => {
    try {
      let url = '/auth/employees';
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (deptFilter) params.set('department', deptFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const [empRes, deptRes] = await Promise.all([
        api.get(url),
        api.get('/departments'),
      ]);
      setEmployees(empRes.data.employees);
      setDepartments(deptRes.data.departments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchEmployees(), 300);
    return () => clearTimeout(timer);
  }, [searchTerm, deptFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', formData);
      setShowForm(false);
      fetchEmployees();
      setFormData({
        emp_id: '', name: '', email: '', mobile: '',
        department: '', branch: '', role: 'employee',
        designation: '', joining_date: '', password: '', cl_total: 1, wfh_days_month: 0
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add employee');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/auth/employees/${editingEmp.id}`, {
        name: editingEmp.name,
        email: editingEmp.email,
        mobile: editingEmp.mobile,
        department: editingEmp.department,
        branch: editingEmp.branch,
        designation: editingEmp.designation,
        cl_total: editingEmp.cl_total,
        wfh_days_month: editingEmp.wfh_days_month,
      });
      setEditingEmp(null);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update employee');
    }
  };

  const deleteEmployee = async (id, role) => {
    if (role === 'super_admin') return alert('Cannot delete Super Admin');
    if (!window.confirm('Are you sure you want to completely remove this employee?')) return;
    try {
      await api.delete(`/auth/employees/${id}`);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete employee');
    }
  };

  if (loading) return <div>Loading all system employees...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={24} color="var(--primary)" /> Company-Wide Employee Roster
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="input-field" placeholder="Search name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ paddingLeft: '36px' }} />
          </div>
          <select className="input-field" style={{ width: 'auto' }} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <UserPlus size={18} /> Add Employee / HR
          </button>
        </div>
      </div>

      {editingEmp && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ marginBottom: '16px' }}>Edit — {editingEmp.emp_id}</h3>
          <form onSubmit={handleUpdate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={styles.label}>Name</label>
              <input type="text" className="input-field" value={editingEmp.name} onChange={(e) => setEditingEmp({ ...editingEmp, name: e.target.value })} required />
            </div>
            <div>
              <label style={styles.label}>Email</label>
              <input type="email" className="input-field" value={editingEmp.email} onChange={(e) => setEditingEmp({ ...editingEmp, email: e.target.value })} required />
            </div>
            <div>
              <label style={styles.label}>Department</label>
              <select className="input-field" value={editingEmp.department || ''} onChange={(e) => setEditingEmp({ ...editingEmp, department: e.target.value })} required>
                <option value="">Select department...</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Branch</label>
              <input type="text" className="input-field" value={editingEmp.branch || ''} onChange={(e) => setEditingEmp({ ...editingEmp, branch: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Designation</label>
              <input type="text" className="input-field" value={editingEmp.designation || ''} onChange={(e) => setEditingEmp({ ...editingEmp, designation: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Mobile</label>
              <input type="text" className="input-field" value={editingEmp.mobile || ''} onChange={(e) => setEditingEmp({ ...editingEmp, mobile: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>CL / Month</label>
              <input type="number" className="input-field" value={editingEmp.cl_total} onChange={(e) => setEditingEmp({ ...editingEmp, cl_total: parseInt(e.target.value) })} min="0" />
            </div>
            <div>
              <label style={styles.label}>WFH / Month</label>
              <input type="number" className="input-field" value={editingEmp.wfh_days_month} onChange={(e) => setEditingEmp({ ...editingEmp, wfh_days_month: parseInt(e.target.value) })} min="0" />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditingEmp(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      )}

      {showForm && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--secondary)' }}>
          <h3 style={{ marginBottom: '16px' }}>Onboard New Staff</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={styles.label}>Emp ID</label>
              <input type="text" className="input-field" value={formData.emp_id} onChange={(e) => setFormData({...formData, emp_id: e.target.value})} required />
            </div>
            <div>
              <label style={styles.label}>Name</label>
              <input type="text" className="input-field" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div>
              <label style={styles.label}>Email</label>
              <input type="email" className="input-field" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
            </div>
            <div>
              <label style={styles.label}>System Role</label>
              <select className="input-field" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} required>
                <option value="employee">Standard Employee</option>
                <option value="hr">HR Administrator</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Department</label>
              <select className="input-field" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} required>
                <option value="">Select department...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
              {departments.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '4px' }}>
                  Add departments first under Departments menu.
                </p>
              )}
            </div>
            <div>
              <label style={styles.label}>Branch / Location</label>
              <input type="text" className="input-field" value={formData.branch} onChange={(e) => setFormData({...formData, branch: e.target.value})} />
            </div>
            <div>
              <label style={styles.label}>Designation</label>
              <input type="text" className="input-field" value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} />
            </div>
            <div>
              <label style={styles.label}>Joining Date</label>
              <input type="date" className="input-field" value={formData.joining_date} onChange={(e) => setFormData({...formData, joining_date: e.target.value})} />
            </div>
            <div>
              <label style={styles.label}>CL Per Month</label>
              <input type="number" className="input-field" value={formData.cl_total} onChange={(e) => setFormData({...formData, cl_total: parseInt(e.target.value)})} min="0" />
            </div>
            <div>
              <label style={styles.label}>WFH Per Month</label>
              <input type="number" className="input-field" value={formData.wfh_days_month} onChange={(e) => setFormData({...formData, wfh_days_month: parseInt(e.target.value)})} min="0" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Initial Password</label>
              <input type="password" className="input-field" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create User</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Emp ID</th>
                <th style={{ padding: '12px' }}>Name & Dept</th>
                <th style={{ padding: '12px' }}>Role</th>
                <th style={{ padding: '12px' }}>Email</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{emp.emp_id}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '500' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{emp.department || 'No Dept'}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={getRoleStyle(emp.role)}>{emp.role.replace('_', ' ').toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '12px' }}>{emp.email}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {emp.role !== 'super_admin' && emp.role !== 'developer' && (
                        <>
                          <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => setEditingEmp({ ...emp })}>
                            <Edit size={14} />
                          </button>
                          <button className="btn btn-outline" style={{ padding: '4px 8px', color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.8rem' }} onClick={() => deleteEmployee(emp.id, emp.role)}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
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

const styles = {
  label: { display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' }
};

function getRoleStyle(role) {
  const base = { padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' };
  switch (role) {
    case 'super_admin': return { ...base, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' };
    case 'hr': return { ...base, background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' };
    default: return { ...base, background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)' };
  }
}
