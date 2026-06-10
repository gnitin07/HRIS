import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import EmployeeSearchSelect from '../../components/common/EmployeeSearchSelect';
import { CheckSquare, Plus } from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({ title: '', description: '', assigned_to_emp_id: '', priority: 'medium', due_date: '' });

  const fetchData = async () => {
    try {
      const tasksRes = await api.get('/tasks/all');
      setTasks(tasksRes.data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks/assign', formData);
      setShowForm(false);
      setFormData({ title: '', description: '', assigned_to_emp_id: '', priority: 'medium', due_date: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign task');
    }
  };

  if (loading) return <div>Loading tasks...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckSquare size={24} color="var(--primary)" /> Department Tasks
        </h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} /> Assign Task
        </button>
      </div>

      {showForm && (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Assign New Task</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Task Title</label>
              <input type="text" className="input-field" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Description</label>
              <textarea className="input-field" rows="3" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}></textarea>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={styles.label}>Assign To (search by name or ID)</label>
              <EmployeeSearchSelect
                value={formData.assigned_to_emp_id}
                onChange={(empId) => setFormData({ ...formData, assigned_to_emp_id: empId })}
                roleFilter="employee"
                required
              />
            </div>
            <div>
              <label style={styles.label}>Priority</label>
              <select className="input-field" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} required>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Due Date</label>
              <input type="date" className="input-field" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} required min={new Date().toISOString().split('T')[0]} />
            </div>
            
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Assign Task</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {tasks.map(task => (
          <div key={task.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{task.title}</h3>
              <span style={getPriorityStyle(task.priority)}>{task.priority.toUpperCase()}</span>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1 }}>{task.description || 'No description'}</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>To: {task.assigned_to_name}</span>
              <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'None'}</span>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={getStatusStyle(task.status)}>Status: {task.status.replace('_', ' ').toUpperCase()}</span>
              {task.notification_sent && <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Email Sent ✓</span>}
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No tasks assigned in your department.
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  label: { display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' }
};

function getPriorityStyle(priority) {
  const base = { padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' };
  switch (priority) {
    case 'high': return { ...base, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' };
    case 'medium': return { ...base, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' };
    case 'low': return { ...base, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' };
    default: return base;
  }
}

function getStatusStyle(status) {
  switch (status) {
    case 'done': return { color: 'var(--success)', fontWeight: '600' };
    case 'in_progress': return { color: 'var(--warning)', fontWeight: '600' };
    default: return { color: 'var(--text-muted)', fontWeight: '500' };
  }
}
