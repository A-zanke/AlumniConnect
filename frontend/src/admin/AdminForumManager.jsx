import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AdminNavbar from './AdminNavbar.jsx';
import { exportToCsv } from './utils/csv';

const AdminForumManager = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (category) params.category = category;
      const res = await axios.get('/api/admin/forums', { params });
      setPosts(res.data || []);
    } finally {
      setLoading(false);
    }
  }, [q, category]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const onDelete = async (id) => {
    if (!window.confirm('Delete this forum post?')) return;
    await axios.delete(`/api/admin/forums/${id}`);
    await fetchPosts();
  };

  const displayed = useMemo(() => posts, [posts]);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <AdminNavbar />
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Forum Manager</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="Search" value={q} onChange={e => setQ(e.target.value)} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }} />
        <input placeholder="Category" value={category} onChange={e => setCategory(e.target.value)} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }} />
        <button onClick={fetchPosts} style={{ padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8 }}>Filter</button>
        <button onClick={() => exportToCsv(`forum_${new Date().toISOString().slice(0,10)}.csv`, displayed)} style={{ padding: '8px 12px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8 }}>Download CSV</button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Title</th>
                <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Author</th>
                <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Created</th>
                <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(p => (
                <tr key={p._id}>
                  <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>{p.title}</td>
                  <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>{p.author?.name} ({p.author?.role})</td>
                  <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>{new Date(p.createdAt).toLocaleString()}</td>
                  <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>
                    <button onClick={() => onDelete(p._id)} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8 }}>Delete</button>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 12 }}>No posts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminForumManager;

