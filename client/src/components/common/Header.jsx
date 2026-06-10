import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, User as UserIcon } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <h2 style={styles.greeting}>
          Welcome back, {user?.name?.split(' ')[0]}
        </h2>
        <p style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style={styles.right}>
        <ThemeToggle />
        
        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            <UserIcon size={18} />
          </div>
          <div>
            <div style={styles.name}>{user?.name}</div>
            <div style={styles.role}>{user?.role.replace('_', ' ').toUpperCase()}</div>
          </div>
        </div>
        
        <button onClick={logout} className="btn btn-outline" style={{ padding: '8px 12px' }}>
          <LogOut size={16} />
          <span style={{ display: 'none' }}>Logout</span>
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '24px',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '24px',
    gap: '16px',
    flexWrap: 'wrap'
  },
  left: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: 0,
    flex: 1
  },
  greeting: {
    fontSize: 'clamp(1.2rem, 5vw, 1.5rem)',
    color: 'var(--text-main)',
    margin: 0,
    wordBreak: 'break-word'
  },
  date: {
    color: 'var(--text-muted)',
    fontSize: 'clamp(0.8rem, 3vw, 0.9rem)',
    wordBreak: 'break-word'
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(8px, 4vw, 24px)',
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0
  },
  avatar: {
    width: 'clamp(36px, 10vw, 40px)',
    height: 'clamp(36px, 10vw, 40px)',
    borderRadius: '50%',
    background: 'rgba(59, 130, 246, 0.1)',
    color: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    flexShrink: 0
  },
  name: {
    fontWeight: '500',
    fontSize: 'clamp(0.8rem, 3vw, 0.95rem)',
    wordBreak: 'break-word'
  },
  role: {
    fontSize: 'clamp(0.65rem, 2vw, 0.75rem)',
    color: 'var(--text-muted)',
    fontWeight: '600',
    letterSpacing: '0.5px',
    wordBreak: 'break-word'
  }
};
