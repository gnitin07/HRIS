import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogIn, User, Lock } from 'lucide-react';

export default function LoginPage() {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await login(empId, password);
      // Redirect based on role
      if (user.role === 'employee') window.location.href = '/employee';
      else if (user.role === 'hr') window.location.href = '/hr';
      else if (user.role === 'super_admin') window.location.href = '/superadmin';
      else if (user.role === 'developer') window.location.href = '/developer';
      else window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-panel animate-fade-in" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <LogIn size={28} color="white" />
          </div>
          <h2 style={styles.title}>Devriz HRMS</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sign in to your account</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <User size={18} style={styles.inputIcon} />
            <input
              type="text"
              className="input-field"
              placeholder="Employee ID (e.g. EMP001)"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              required
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <div style={styles.inputGroup}>
            <Lock size={18} style={styles.inputIcon} />
            <input
              type="password"
              className="input-field"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '10px' }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'radial-gradient(circle at top right, var(--bg-card), var(--bg-dark))'
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '40px 32px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  logo: {
    width: '56px',
    height: '56px',
    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px auto',
    boxShadow: '0 4px 15px var(--primary-glow)'
  },
  title: {
    fontSize: '1.75rem',
    marginBottom: '4px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-muted)'
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--danger)',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '0.875rem',
    marginBottom: '20px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    textAlign: 'center'
  }
};
