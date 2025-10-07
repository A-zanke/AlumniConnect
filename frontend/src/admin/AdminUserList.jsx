import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import AdminNavbar from './AdminNavbar.jsx';
import { exportToCsv } from './utils/csv';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const useQuery = () => new URLSearchParams(useLocation().search);

const AdminUserList = () => {
  const query = useQuery();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    role: query.get('role') || '',
    location: '',
    startDate: '',
    endDate: '',
    verified: '',
    q: ''
  });
  const [series, setSeries] = useState([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (!params.role) delete params.role;
      if (!params.location) delete params.location;
      if (!params.startDate) delete params.startDate;
      if (!params.endDate) delete params.endDate;
      if (params.verified === '') delete params.verified;
      if (!params.q) delete params.q;
      const [u, a] = await Promise.all([
        axios.get('/api/admin/users', { params }),
        axios.get('/api/admin/analytics')
      ]);
      setUsers(u.data || []);
      setSeries(a.data?.userGrowthSeries || []);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const onDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    await axios.delete(`/api/admin/users/${id}`);
    await fetchUsers();
  };

  const displayed = useMemo(() => users, [users]);

  const onExport = () => {
    exportToCsv(`users_${new Date().toISOString().slice(0,10)}.csv`, displayed);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
      <AdminNavbar />
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Users</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 12 }}>
        <select value={filters.role} onChange={e => setFilters({ ...filters, role: e.target.value })} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="alumni">Alumni</option>
        </select>
        <input placeholder="Location" value={filters.location} onChange={e => setFilters({ ...filters, location: e.target.value })} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }} />
        <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }} />
        <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }} />
        <select value={filters.verified} onChange={e => setFilters({ ...filters, verified: e.target.value })} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <option value="">Verified?</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <input placeholder="Search name/email/username" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={fetchUsers} style={{ padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}>Apply</button>
        <button onClick={onExport} style={{ padding: '8px 12px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8 }}>Download CSV</button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.06)', marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>User Growth (12 months)</h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="students" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="teachers" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="alumni" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Name</th>
              <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Role</th>
              <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Department</th>
              <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Year/Grad</th>
              <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Company</th>
              <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Location</th>
              <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Email</th>
              <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map(u => (
              <tr key={u._id}>
                <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>{u.name}</td>
                <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>{u.role}</td>
                <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>{u.department || '-'}</td>
                <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>{u.role === 'student' ? (u.year ?? '-') : (u.role === 'alumni' ? (u.graduationYear ?? '-') : '-')}</td>
                <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>{u.company || '-'}</td>
                <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>{u.location || '-'}</td>
                <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>{u.email}</td>
                <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>
                  <button onClick={() => onDelete(u._id)} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8 }}>Delete</button>
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 12 }}>No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUserList;

