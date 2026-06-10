import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { Search } from 'lucide-react';

export default function EmployeeSearchSelect({
  value,
  onChange,
  roleFilter = 'employee',
  departmentFilter = '',
  placeholder = 'Search employee by name or ID...',
  required = false,
}) {
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selected = employees.find(e => e.emp_id === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        let url = `/auth/employees?role=${roleFilter}`;
        if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
        if (departmentFilter) url += `&department=${encodeURIComponent(departmentFilter)}`;
        const res = await api.get(url);
        setEmployees(res.data.employees);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, roleFilter, departmentFilter]);

  useEffect(() => {
    if (value && !selected) {
      api.get(`/auth/employees?search=${encodeURIComponent(value)}&role=${roleFilter}`)
        .then(res => setEmployees(res.data.employees))
        .catch(console.error);
    }
  }, [value, roleFilter, selected]);

  const displayLabel = selected
    ? `${selected.name} (${selected.emp_id}) — ${selected.department || 'No dept'}`
    : value || '';

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          className="input-field"
          style={{ paddingLeft: '36px' }}
          placeholder={placeholder}
          value={open ? search : displayLabel}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange('');
          }}
          onFocus={() => {
            setOpen(true);
            setSearch('');
          }}
          required={required && !value}
        />
      </div>

      {open && (
        <div style={styles.dropdown}>
          {loading && <div style={styles.itemMuted}>Searching...</div>}
          {!loading && employees.length === 0 && (
            <div style={styles.itemMuted}>No employees found</div>
          )}
          {!loading && employees.map(emp => (
            <button
              key={emp.id}
              type="button"
              style={styles.item}
              onClick={() => {
                onChange(emp.emp_id);
                setSearch('');
                setOpen(false);
              }}
            >
              <div style={{ fontWeight: '500' }}>{emp.name} <span style={{ color: 'var(--text-muted)' }}>({emp.emp_id})</span></div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{emp.department || 'No department'} · {emp.designation || 'Employee'}</div>
            </button>
          ))}
        </div>
      )}

      {value && (
        <input type="hidden" value={value} required={required} />
      )}
    </div>
  );
}

const styles = {
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    maxHeight: '220px',
    overflowY: 'auto',
    zIndex: 50,
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  },
  item: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-main)',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-color)',
  },
  itemMuted: {
    padding: '12px 14px',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
};
