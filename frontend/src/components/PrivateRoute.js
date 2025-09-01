import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './ui/Spinner';

const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (roles && roles.length > 0) {
    const userRole = (user.role || '').toLowerCase();
    const ok = roles.map(r => r.toLowerCase()).includes(userRole);
    if (!ok) return <Navigate to="/" />;
  }

  return children;
};

export default PrivateRoute;