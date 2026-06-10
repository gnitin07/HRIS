import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from './Sidebar';
import Header from './Header';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard if they try to access an unauthorized route
    const routes = {
      employee: '/employee',
      hr: '/hr',
      super_admin: '/superadmin',
      developer: '/developer'
    };
    return <Navigate to={routes[user.role] || '/login'} replace />;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="animate-fade-in" style={{ paddingTop: '24px' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
