import React, { useEffect, useState } from 'react';
import axios from 'axios';

const StatCard = ({ title, value }) => (
  <div style={{ background:'#fff', borderRadius:12, padding:'16px', boxShadow:'0 8px 24px rgba(0,0,0,0.08)' }}>
    <div style={{ color:'#607d8b', fontWeight:600, fontSize:14 }}>{title}</div>
    <div style={{ fontSize:28, fontWeight:800, color:'#263238' }}>{value}</div>
  </div>
);

const AdminDashboardPage = () => {
  const [stats, setStats] = useState({ userCount:0, postCount:0, eventCount:0 });
  const [users, setUsers] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [a,u,p] = await Promise.all([
        axios.get('/api/admin/analytics'),
        axios.get('/api/admin/users'),
        axios.get('/api/admin/events/pending').catch(()=>({data:[]}))
      ]);
      setStats(a.data);
      setUsers(u.data || []);
      setPendingEvents(p.data || []);
    };
    load();
  }, []);

  const approveEvent = async (id) => {
    await axios.post(`/api/events/${id}/approve`);
    setPendingEvents(prev => prev.filter(e => e._id !== id));
  };

  return (
    <div style={{ padding:'24px', maxWidth:1200, margin:'0 auto' }}>
      <h2 style={{ fontSize:28, fontWeight:800, marginBottom:16 }}>Admin Dashboard</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16 }}>
        <StatCard title="Users" value={stats.userCount} />
        <StatCard title="Posts" value={stats.postCount} />
        <StatCard title="Events" value={stats.eventCount} />
      </div>

      <div style={{ marginTop:24 }}>
        <h3 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Pending Events</h3>
        <div style={{ background:'#fff', borderRadius:12, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.06)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#eceff1', textAlign:'left' }}>
                <th style={{ padding:12 }}>Title</th>
                <th style={{ padding:12 }}>Organizer</th>
                <th style={{ padding:12 }}>Start</th>
                <th style={{ padding:12 }}></th>
              </tr>
            </thead>
            <tbody>
              {pendingEvents.map(e => (
                <tr key={e._id}>
                  <td style={{ padding:12 }}>{e.title}</td>
                  <td style={{ padding:12 }}>{e.organizer?.name || e.organizer}</td>
                  <td style={{ padding:12 }}>{new Date(e.startAt).toLocaleString()}</td>
                  <td style={{ padding:12 }}>
                    <button onClick={() => approveEvent(e._id)} style={{ background:'#43a047', color:'#fff', border:'none', padding:'8px 12px', borderRadius:8, cursor:'pointer' }}>Approve</button>
                  </td>
                </tr>
              ))}
              {pendingEvents.length === 0 && (
                <tr><td style={{ padding:12 }} colSpan={4}>No pending events</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop:24 }}>
        <h3 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Users</h3>
        <div style={{ background:'#fff', borderRadius:12, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.06)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#eceff1', textAlign:'left' }}>
                <th style={{ padding:12 }}>Name</th>
                <th style={{ padding:12 }}>Email</th>
                <th style={{ padding:12 }}>Username</th>
                <th style={{ padding:12 }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td style={{ padding:12 }}>{u.name}</td>
                  <td style={{ padding:12 }}>{u.email}</td>
                  <td style={{ padding:12 }}>{u.username}</td>
                  <td style={{ padding:12 }}>{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

