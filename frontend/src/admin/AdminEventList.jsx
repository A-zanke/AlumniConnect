import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { exportToCsv } from './utils/csv';
import AdminShell from './AdminShell.jsx';
import { DataPanel, TableShell } from './components/AdminPrimitives.jsx';

const FilterChip = ({ label, value, render }) => (
  <label className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300 shadow-inner shadow-white/5">
    <span className="pl-1 text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">{label}</span>
    {render(value)}
  </label>
);

const AdminEventList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(searchParams.get('status') || '');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/events');
      const list = res.data || [];
      setEvents(status ? list.filter(e => (e.status || (e.approved ? 'active' : 'pending')) === status) : list);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const approve = async (id) => { await axios.put(`/api/admin/events/${id}/approve`); await fetchEvents(); };
  const reject = async (id) => { await axios.put(`/api/admin/events/${id}/reject`); await fetchEvents(); };
  const del = async (id) => { if (!window.confirm('Delete?')) return; await axios.delete(`/api/admin/events/${id}`); await fetchEvents(); };

  const displayed = useMemo(() => events, [events]);

  if (loading) {
    return (
      <AdminShell title="Loading events" subtitle="Compiling the campus calendar">
        <div className="flex h-64 items-center justify-center">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Experience Control"
      subtitle="Oversee every event, approval, and pulse point"
      rightSlot={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportToCsv(`events_${new Date().toISOString().slice(0,10)}.csv`, displayed)}
            className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
          >
            Download CSV
          </button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterChip
          label="Status"
          value={status}
          render={(value) => (
            <select
              value={value}
              onChange={(e) => {
                const newStatus = e.target.value;
                setStatus(newStatus);
                if (newStatus) {
                  setSearchParams({ status: newStatus });
                } else {
                  setSearchParams({});
                }
              }}
              className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          )}
        />
      </div>

      <DataPanel title="Events Universe" description="Real-time breakdown of every scheduled experience">
        <TableShell headers={['Title', 'Status', 'Creator', 'Actions']}>
          {displayed.map((e) => (
            <tr key={e._id} className="hover:bg-white/5">
              <td className="px-4 py-4 font-semibold text-slate-100">
                <Link to={`/admin/events/${e._id}`} className="text-indigo-200 hover:text-indigo-100">
                  {e.title}
                </Link>
              </td>
              <td className="px-4 py-4 capitalize">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                    (e.status || (e.approved ? 'active' : 'pending')) === 'pending'
                      ? 'bg-amber-500/20 text-amber-200'
                      : (e.status || (e.approved ? 'active' : 'pending')) === 'rejected'
                      ? 'bg-red-500/20 text-red-200'
                      : 'bg-emerald-500/20 text-emerald-200'
                  }`}
                >
                  {e.status || (e.approved ? 'active' : 'pending')}
                </span>
              </td>
              <td className="px-4 py-4 text-slate-300">{e.organizer?.name || e.createdBy?.name || '-'}</td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  {e.status === 'pending' && (
                    <>
                      <button
                        onClick={() => approve(e._id)}
                        className="rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-200 transition hover:bg-emerald-500/30"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reject(e._id)}
                        className="rounded-xl bg-amber-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-amber-200 transition hover:bg-amber-500/30"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => del(e._id)}
                    className="rounded-xl bg-red-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-200 transition hover:bg-red-500/30"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {displayed.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                No events found
              </td>
            </tr>
          )}
        </TableShell>
      </DataPanel>
    </AdminShell>
  );
};

export default AdminEventList;
