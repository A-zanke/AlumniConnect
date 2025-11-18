import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const withRoleGuard = (Component, allowedRoles = ['admin']) => {
  return (props) => {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <p className="text-slate-400">Loading...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
          <div className="max-w-md rounded-lg border border-red-500/20 bg-slate-800 p-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-white">Access Denied</h2>
            <p className="mb-4 text-slate-400">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => window.history.back()}
              className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

export default withRoleGuard;
