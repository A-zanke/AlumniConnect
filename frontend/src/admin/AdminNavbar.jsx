import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const AdminNavbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ background: '#0f172a', color: '#fff', padding: '10px 16px', borderRadius: 10, margin: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/admin" style={{ fontWeight: 800, letterSpacing: 0.3, color: '#fff', textDecoration: 'none' }}>Admin</Link>

        {/* Forum dropdown replaces direct Forum Page link and nests Event Page */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setOpen((o) => !o)} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Forum ▾
          </button>
          {open && (
            <div style={{ position: 'absolute', top: '110%', left: 0, background: '#111827', border: '1px solid #1f2937', borderRadius: 8, minWidth: 220, overflow: 'hidden', zIndex: 30 }}>
              <Link to="/admin/forum" onClick={() => setOpen(false)} style={{ display: 'block', padding: '10px 12px', color: '#e5e7eb', textDecoration: 'none', background: isActive('/admin/forum') ? '#1f2937' : 'transparent' }}>Forum Manager</Link>
              <Link to="/admin/events" onClick={() => setOpen(false)} style={{ display: 'block', padding: '10px 12px', color: '#e5e7eb', textDecoration: 'none', background: isActive('/admin/events') ? '#1f2937' : 'transparent' }}>Event Page</Link>
            </div>
          )}
        </div>

        {/* Other top-level admin links (no direct Event Page here) */}
        <Link to="/admin/users" style={{ color: isActive('/admin/users') ? '#a5b4fc' : '#e5e7eb', textDecoration: 'none', fontWeight: 600 }}>Users</Link>
        <Link to="/admin" style={{ color: isActive('/admin') ? '#a5b4fc' : '#e5e7eb', textDecoration: 'none', fontWeight: 600 }}>Dashboard</Link>
      </div>
    </div>
  );
};

export default AdminNavbar;

