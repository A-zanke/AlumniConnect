import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AdminNavbar from './AdminNavbar.jsx';
import { exportToCsv } from './utils/csv';

const AdminEventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

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

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <AdminNavbar />
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Events</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <button onClick={() => exportToCsv(`events_${new Date().toISOString().slice(0,10)}.csv`, displayed)} style={{ padding: '8px 12px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8 }}>Download CSV</button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Title</th>
                <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Status</th>
                <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Creator</th>
                <th style={{ padding: 12, background: '#f3f4f6', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(e => (
                <tr key={e._id}>
                  <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>
                    <Link to={`/admin/events/${e._id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{e.title}</Link>
                  </td>
                  <td style={{ padding: 12, borderTop: '1px solid #e5e7eb', textTransform: 'capitalize' }}>{e.status || (e.approved ? 'active' : 'pending')}</td>
                  <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>{e.organizer?.name || e.createdBy?.name || '-'}</td>
                  <td style={{ padding: 12, borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
                    {e.status === 'pending' && <button onClick={() => approve(e._id)} style={{ padding: '6px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8 }}>Approve</button>}
                    {e.status === 'pending' && <button onClick={() => reject(e._id)} style={{ padding: '6px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8 }}>Reject</button>}
                    <button onClick={() => del(e._id)} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8 }}>Delete</button>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 12 }}>No events found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminEventList;

