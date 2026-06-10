import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { Users, UserPlus, Search } from 'lucide-react';

export default function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    emp_id: '', name: '', email: '', mobile: '',
    department: '', branch: '', role: 'employee',
    designation: '', joining_date: '', password: '', cl_total: 1, wfh_days_month: 0
  });

  useEffect(() => {
    if (user?.department) {
      setFormData(prev => ({ ...prev, department: user.department }));
    }
  }, [user?.department]);

  const fetchEmployees = async (search = '') => {
    try {
      let url = '/auth/employees';
      if (search.trim()) url += `?search=${encodeURIComponent(search.trim())}`;
      const res = await api.get(url);
      setEmployees(res.data.employees);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchEmployees(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      department: user?.department || formData.department,
    };
    try {
      await api.post('/auth/register', payload);
      setShowForm(false);
      fetchEmployees();
      setFormData({
        emp_id: '', name: '', email: '', mobile: '',
        department: user?.department || '', branch: '', role: 'employee',
        designation: '', joining_date: '', password: '', cl_total: 1, wfh_days_month: 0
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add employee');
    }
  };

  if (loading) return <div>Loading employees...</div>;

  if (!user?.department) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <h3>No department assigned</h3>
        <p style={{ color: 'var(--text-muted)' }}>
          Ask Super Admin to assign you to a department under Departments, then log in again.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={24} color="var(--primary)" /> Department Employees
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" className="input-field" placeholder="Search by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ paddingLeft: '36px' }} />
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <UserPlus size={18} /> Add Employee
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Add New Employee — {user.department}</h3>
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
              <label style={styles.label}>Mobile</label>
              <input type="text" className="input-field" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
            </div>
            <div>
              <label style={styles.label}>Department</label>
              <input type="text" className="input-field" value={user.department} disabled style={{ opacity: 0.7 }} />
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
              <button type="submit" className="btn btn-primary">Create Employee</button>
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
                <th style={{ padding: '12px' }}>Designation</th>
                <th style={{ padding: '12px' }}>Email</th>
                <th style={{ padding: '12px' }}>Joining Date</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{emp.emp_id}</td>
                  <td style={{ padding: '12px' }}>{emp.name}</td>
                  <td style={{ padding: '12px' }}>{emp.designation || '-'}</td>
                  <td style={{ padding: '12px' }}>{emp.email}</td>
                  <td style={{ padding: '12px' }}>{emp.joining_date ? new Date(emp.joining_date).toLocaleDateString() : '-'}</td>
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
