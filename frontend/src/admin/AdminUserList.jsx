import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { exportToCsv } from './utils/csv';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import AdminShell from './AdminShell.jsx';
import { DataPanel, TableShell } from './components/AdminPrimitives.jsx';

const useQuery = () => new URLSearchParams(useLocation().search);

const FilterChip = ({ label, value, render }) => (
  <label className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300 shadow-inner shadow-white/5">
    <span className="pl-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">{label}</span>
    {render(value)}
  </label>
);

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

  if (loading) {
    return (
      <AdminShell title="Loading users" subtitle="Crunching the latest member metrics">
        <div className="flex h-64 items-center justify-center">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="People Intelligence"
      subtitle="Analyze, filter, and act across every cohort"
      rightSlot={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchUsers}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-white/30 hover:bg-white/20"
          >
            Apply Filters
          </button>
          <button
            onClick={onExport}
            className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
          >
            Download CSV
          </button>
        </div>
      }
    >
      <div className="grid gap-3 lg:grid-cols-6">
        <FilterChip
          label="Role"
          value={filters.role}
          render={(value) => (
            <select
              value={value}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
            >
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="alumni">Alumni</option>
            </select>
          )}
        />
        <FilterChip
          label="Location"
          value={filters.location}
          render={(value) => (
            <input
              placeholder="City or campus"
              value={value}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400"
            />
          )}
        />
        <FilterChip
          label="Start"
          value={filters.startDate}
          render={(value) => (
            <input
              type="date"
              value={value}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
            />
          )}
        />
        <FilterChip
          label="End"
          value={filters.endDate}
          render={(value) => (
            <input
              type="date"
              value={value}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
            />
          )}
        />
        <FilterChip
          label="Verified"
          value={filters.verified}
          render={(value) => (
            <select
              value={value}
              onChange={(e) => setFilters({ ...filters, verified: e.target.value })}
              className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
            >
              <option value="">All</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          )}
        />
        <FilterChip
          label="Search"
          value={filters.q}
          render={(value) => (
            <input
              placeholder="Name, email, username"
              value={value}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-400"
            />
          )}
        />
      </div>

      <DataPanel title="User Growth" description="12 month momentum across every profile type">
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
              <XAxis dataKey="month" stroke="rgba(148,163,184,0.7)" tickLine={false} />
              <YAxis stroke="rgba(148,163,184,0.7)" tickLine={false} />
              <Tooltip contentStyle={{ background: '#0f172a', borderRadius: 16, border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ color: '#cbd5f5' }} />
              <Line type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="teachers" stroke="#22d3ee" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="alumni" stroke="#f472b6" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </DataPanel>

      <DataPanel title="Directory" description="Actionable breakdown of every community member">
        <TableShell
          headers={[
            'Name',
            'Role',
            'Department',
            'Year / Graduation',
            'Company',
            'Location',
            'Email',
            'Actions',
          ]}
        >
          {displayed.map((u) => (
            <tr key={u._id} className="hover:bg-white/5">
              <td className="px-4 py-4 font-semibold text-slate-100">{u.name}</td>
              <td className="px-4 py-4 capitalize text-slate-200">{u.role}</td>
              <td className="px-4 py-4 text-slate-300">{u.department || '-'}</td>
              <td className="px-4 py-4 text-slate-300">
                {u.role === 'student' ? u.year ?? '-' : u.role === 'alumni' ? u.graduationYear ?? '-' : '-'}
              </td>
              <td className="px-4 py-4 text-slate-300">{u.company || '-'}</td>
              <td className="px-4 py-4 text-slate-300">{u.location || '-'}</td>
              <td className="px-4 py-4 text-slate-200">{u.email}</td>
              <td className="px-4 py-4">
                <button
                  onClick={() => onDelete(u._id)}
                  className="rounded-xl bg-red-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-200 transition hover:bg-red-500/30"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {displayed.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                No users found
              </td>
            </tr>
          )}
        </TableShell>
      </DataPanel>
    </AdminShell>
  );
};

export default AdminUserList;
