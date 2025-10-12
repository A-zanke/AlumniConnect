import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ForbiddenPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Access Denied
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          You don't have permission to access this page
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Go Back
          </button>
          <a
            href="/"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
};

export const withRoleGuard = (roles) => (Component) => {
  return function Guarded() {
    const { user } = useAuth();

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (!roles.includes(user.role)) {
      return <ForbiddenPage />;
    }

    return <Component />;
  };
};
