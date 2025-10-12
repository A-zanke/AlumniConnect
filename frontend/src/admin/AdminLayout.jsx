import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import CommandPalette from './CommandPalette';
import Toaster from './Toaster';
import ErrorBoundary from './ErrorBoundary';

const AdminLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Topbar />

      <div className="flex">
        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

        <main className="flex-1 transition-all duration-300" style={{ marginLeft: sidebarCollapsed ? '4rem' : '18rem' }}>
          <div className="max-w-[1400px] mx-auto px-6 py-4">
            <Breadcrumbs />

            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>

          <footer className="mt-12 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-3 px-6">
            <div className="max-w-[1400px] mx-auto flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Admin Panel v2.0</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Server Active
                </span>
              </div>
            </div>
          </footer>
        </main>
      </div>

      <CommandPalette />
      <Toaster />
    </div>
  );
};

export default AdminLayout;
