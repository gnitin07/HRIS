import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Search, Edit, Database, Save, X } from 'lucide-react';

export default function DeveloperUsers() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingEmp, setEditingEmp] = useState(null);

  const fetchEmployees = async () => {
    try {
      // Developer can see all employees
      const [empRes, deptRes] = await Promise.all([
        api.get('/auth/employees'),
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
    fetchEmployees();
  }, []);

  const handleEdit = (emp) => {
    setEditingEmp({ ...emp });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      // SA and Dev share the same PUT endpoint logic
      await api.put(`/auth/employees/${editingEmp.id}`, {
        emp_id: editingEmp.emp_id,
        password: editingEmp.password,
        name: editingEmp.name,
        email: editingEmp.email,
        mobile: editingEmp.mobile,
        department: editingEmp.department,
        branch: editingEmp.branch,
        designation: editingEmp.designation,
        cl_total: editingEmp.cl_total,
        wfh_days_month: editingEmp.wfh_days_month
      });
      setEditingEmp(null);
      fetchEmployees();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update employee');
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.emp_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div>Loading records...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={24} color="var(--primary)" /> Database Records Manager
        </h2>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search by ID, Name, or Dept..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      {editingEmp && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Edit Record: {editingEmp.emp_id}</h3>
            <button onClick={() => setEditingEmp(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>
          
          <form onSubmit={handleUpdate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={styles.label}>Employee ID</label>
              <input type="text" className="input-field" value={editingEmp.emp_id} onChange={(e) => setEditingEmp({...editingEmp, emp_id: e.target.value})} required />
            </div>
            <div>
              <label style={styles.label}>New Password <span style={{fontSize: '0.8em'}}>(leave blank to keep current)</span></label>
              <input type="text" className="input-field" placeholder="Enter new password" value={editingEmp.password || ''} onChange={(e) => setEditingEmp({...editingEmp, password: e.target.value})} />
            </div>
            <div>
              <label style={styles.label}>Name</label>
              <input type="text" className="input-field" value={editingEmp.name} onChange={(e) => setEditingEmp({...editingEmp, name: e.target.value})} required />
            </div>
            <div>
              <label style={styles.label}>Email</label>
              <input type="email" className="input-field" value={editingEmp.email} onChange={(e) => setEditingEmp({...editingEmp, email: e.target.value})} required />
            </div>
            <div>
              <label style={styles.label}>Department</label>
              <select className="input-field" value={editingEmp.department || ''} onChange={(e) => setEditingEmp({...editingEmp, department: e.target.value})} required>
                <option value="">Select department...</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Designation</label>
              <input type="text" className="input-field" value={editingEmp.designation || ''} onChange={(e) => setEditingEmp({...editingEmp, designation: e.target.value})} />
            </div>
            <div>
              <label style={styles.label}>Mobile</label>
              <input type="text" className="input-field" value={editingEmp.mobile || ''} onChange={(e) => setEditingEmp({...editingEmp, mobile: e.target.value})} />
            </div>
            <div>
              <label style={styles.label}>Branch</label>
              <input type="text" className="input-field" value={editingEmp.branch || ''} onChange={(e) => setEditingEmp({...editingEmp, branch: e.target.value})} />
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary">
                <Save size={18} /> Save Changes
              </button>
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
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Role</th>
                <th style={{ padding: '12px' }}>Department</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: emp.role === 'developer' ? 0.6 : 1 }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{emp.emp_id}</td>
                  <td style={{ padding: '12px' }}>{emp.name}</td>
                  <td style={{ padding: '12px' }}><span style={getRoleStyle(emp.role)}>{emp.role.replace('_', ' ').toUpperCase()}</span></td>
                  <td style={{ padding: '12px', color: emp.department ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {emp.department || 'Unassigned'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {emp.role !== 'developer' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => handleEdit(emp)}
                      >
                        <Edit size={14} /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No records match your search.</td>
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
  label: { display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' }
};

function getRoleStyle(role) {
  const base = { padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' };
  switch (role) {
    case 'super_admin': return { ...base, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' };
    case 'developer': return { ...base, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' };
    case 'hr': return { ...base, background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' };
    default: return { ...base, background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-muted)' };
  }
}
