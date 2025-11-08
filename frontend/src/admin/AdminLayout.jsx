import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import Breadcrumbs from './Breadcrumbs.jsx';

const AdminLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900">
      <Topbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="pt-16 lg:pl-64">
        <div className="p-6">
          <div className="mb-6">
            <Breadcrumbs />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
