import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { exportToCsv } from './utils/csv';
import AdminShell from './AdminShell.jsx';
import { DataPanel, TableShell } from './components/AdminPrimitives.jsx';

const FilterChip = ({ label, value, render }) => (
  <label className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300 shadow-inner shadow-white/5">
    <span className="pl-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">{label}</span>
    {render(value)}
  </label>
);

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

  if (loading) {
    return (
      <AdminShell title="Loading forum" subtitle="Gathering the latest campus conversations">
        <div className="flex h-64 items-center justify-center">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Forum Intelligence"
      subtitle="Moderate threads, decode engagement, keep the community vibrant"
      rightSlot={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToCsv(`forum_${new Date().toISOString().slice(0,10)}.csv`, displayed)}
            className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
          >
            Download CSV
          </button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterChip
          label="Search"
          value={q}
          render={(value) => (
            <input
              placeholder="Find topics"
              value={value}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400"
            />
          )}
        />
        <FilterChip
          label="Category"
          value={category}
          render={(value) => (
            <input
              placeholder="Department, interest..."
              value={value}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400"
            />
          )}
        />
        <FilterChip
          label="Actions"
          value={null}
          render={() => (
            <button
              onClick={fetchPosts}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-white/30 hover:bg-white/20"
            >
              Apply Filters
            </button>
          )}
        />
      </div>

      <DataPanel title="Threads Radar" description="Spotlight on the latest conversations across campus">
        <TableShell headers={['Title', 'Author', 'Created', 'Actions']}>
          {displayed.map((p) => (
            <tr key={p._id} className="hover:bg-white/5">
              <td className="px-4 py-4 font-semibold text-slate-100">
                <Link to={`/forum/${p._id}`} className="text-indigo-200 hover:text-indigo-100">
                  {p.title}
                </Link>
              </td>
              <td className="px-4 py-4 text-slate-300">
                <Link to={`/profile/id/${p.author?._id}`} className="hover:underline">
                  {p.author?.name}
                </Link> ({p.author?.role})
              </td>
              <td className="px-4 py-4 text-slate-300">{new Date(p.createdAt).toLocaleString()}</td>
              <td className="px-4 py-4">
                <button
                  onClick={() => onDelete(p._id)}
                  className="rounded-xl bg-red-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-200 transition hover:bg-red-500/30"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {displayed.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                No posts found
              </td>
            </tr>
          )}
        </TableShell>
      </DataPanel>
    </AdminShell>
  );
};

export default AdminForumManager;
