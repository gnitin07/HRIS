import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { CheckSquare } from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks/my');
      setTasks(res.data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/tasks/status/${id}`, { status });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update task');
    }
  };

  if (loading) return <div>Loading tasks...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckSquare size={24} color="var(--primary)" /> My Tasks
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {tasks.map(task => (
          <div key={task.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{task.title}</h3>
              <span style={getPriorityStyle(task.priority)}>{task.priority.toUpperCase()}</span>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', flex: 1 }}>{task.description || 'No description provided.'}</p>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              <span>Assigned By: {task.assigned_by_name}</span>
              <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'None'}</span>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={getStatusStyle(task.status)}>Status: {task.status.replace('_', ' ').toUpperCase()}</span>
              
              <select 
                className="input-field" 
                style={{ width: '130px', padding: '6px 12px' }}
                value={task.status}
                onChange={(e) => updateStatus(task.id, e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            You have no assigned tasks.
          </div>
        )}
      </div>
    </div>
  );
}

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
