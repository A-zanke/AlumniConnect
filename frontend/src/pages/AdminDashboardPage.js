import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import AdminNavbar from '../admin/AdminNavbar.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const Card = ({ children }) => (
  <div style={{ background:'#fff', borderRadius:12, padding:'16px', boxShadow:'0 8px 24px rgba(0,0,0,0.08)' }}>{children}</div>
);

const Stat = ({ label, value }) => (
  <div>
    <div style={{ color:'#607d8b', fontWeight:600, fontSize:14 }}>{label}</div>
    <div style={{ fontSize:28, fontWeight:800, color:'#263238' }}>{value}</div>
  </div>
);

const Table = ({ children }) => (
  <div style={{ background:'#fff', borderRadius:12, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.06)' }}>
    <table style={{ width:'100%', borderCollapse:'collapse' }}>{children}</table>
  </div>
);

const Th = ({ children }) => (
  <th style={{ padding:12, background:'#eceff1', textAlign:'left', fontWeight:700, color:'#37474f' }}>{children}</th>
);
const Td = ({ children }) => (<td style={{ padding:12, borderTop:'1px solid #eceff1' }}>{children}</td>);

const AdminDashboardPage = () => {
  const [stats, setStats] = useState({
    totalStudents: 0, totalTeachers: 0, totalAlumni: 0,
    studentByDepartment: {}, studentByYear: {},
    alumniByGraduationYear: {}, alumniByCompany: {},
    eventsByCreatorRole: {}, eventsPending: 0, eventsActive: 0, eventsRejected: 0
  });
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [a, u, e, pr] = await Promise.all([
        axios.get('/api/admin/analytics'),
        axios.get('/api/admin/users'),
        axios.get('/api/admin/events'),
        axios.get('/api/admin/event-requests')
      ]);
      setStats(a.data || {});
      setUsers(u.data || []);
      setEvents(e.data || []);
      setPendingRequests(pr.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const exportUsers = async (params = {}) => {
    const qs = new URLSearchParams(params);
    window.location.href = `/api/admin/export/users?${qs.toString()}`;
  };

  const exportEvents = async (params = {}) => {
    const qs = new URLSearchParams(params);
    window.location.href = `/api/admin/export/events?${qs.toString()}`;
  };

  const approveEvent = async (id) => {
    await axios.put(`/api/admin/events/${id}/approve`).catch(async () => {
      // fallback to public events route if wired differently
      await axios.put(`/api/events/${id}/approve`);
    });
    await fetchAll();
  };

  const rejectEvent = async (id) => {
    await axios.put(`/api/admin/events/${id}/reject`).catch(async () => {
      await axios.put(`/api/events/${id}/reject`);
    });
    await fetchAll();
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    await axios.delete(`/api/admin/events/${id}`).catch(async () => {
      await axios.delete(`/api/events/${id}`);
    });
    await fetchAll();
  };

  const approveRequest = async (id) => {
    await axios.put(`/api/admin/event-requests/${id}/approve`);
    await fetchAll();
  };

  const rejectRequest = async (id) => {
    await axios.put(`/api/admin/event-requests/${id}/reject`);
    await fetchAll();
  };

  const deleteRequest = async (id) => {
    if (!window.confirm('Delete this request?')) return;
    await axios.delete(`/api/admin/event-requests/${id}`);
    await fetchAll();
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    await axios.delete(`/api/admin/users/${id}`);
    await fetchAll();
  };

  const totals = useMemo(() => ([
    { key: 'student', label: 'Students', value: stats.totalStudents || 0 },
    { key: 'teacher', label: 'Teachers', value: stats.totalTeachers || 0 },
    { key: 'alumni', label: 'Alumni', value: stats.totalAlumni || 0 },
    { label: 'Events (Active)', value: stats.eventsActive || 0 },
    { label: 'Events (Pending)', value: stats.eventsPending || 0 },
    { label: 'Events (Rejected)', value: stats.eventsRejected || 0 }
  ]), [stats]);

  if (loading) return <div style={{ padding:24 }}>Loading...</div>;

  return (
    <div style={{ padding:'24px', maxWidth:1300, margin:'0 auto' }}>
      <AdminNavbar />
      <h2 style={{ fontSize:28, fontWeight:800, marginBottom:16 }}>Admin Dashboard</h2>

      {/* Top stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, marginBottom:16 }}>
        {totals.map((t, i) => (
          <div key={i} onClick={() => t.key && navigate(`/admin/users?role=${t.key}`)} style={{ cursor: t.key ? 'pointer' : 'default' }}>
            <Card>
              <Stat label={t.label} value={t.value} />
            </Card>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
        <Card>
          <h3 style={{ margin:'0 0 8px', fontSize:18, fontWeight:700 }}>User Growth</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={stats.userGrowthSeries || []}>
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
        </Card>
        <Card>
          <h3 style={{ margin:'0 0 8px', fontSize:18, fontWeight:700 }}>Forum Activity</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={stats.forumActivitySeries || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="posts" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16, marginBottom:16 }}>
        <Card>
          <h3 style={{ margin:'0 0 8px', fontSize:18, fontWeight:700 }}>Event Requests</h3>
          <div style={{ width: '100%', height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.eventRequestStats || []} dataKey="value" nameKey="name" outerRadius={90} label>
                  {(stats.eventRequestStats || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={["#f59e0b", "#10b981", "#ef4444"][index % 3]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Export actions */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        <button onClick={() => exportUsers()} style={{ padding:'8px 12px', background:'#1976d2', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>
          Export All Users (CSV)
        </button>
        <button onClick={() => exportEvents()} style={{ padding:'8px 12px', background:'#455a64', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>
          Export All Events (CSV)
        </button>
      </div>

      {/* Users table */}
      <h3 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Users</h3>
      <Table>
        <thead>
          <tr>
            <Th>Profile</Th>
            <Th>Name</Th>
            <Th>Role</Th>
            <Th>Department</Th>
            <Th>Year</Th>
            <Th>Graduation Year</Th>
            <Th>Company</Th>
            <Th>Email</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <Td>
                <img src={u.avatarUrl || '/default-avatar.png'} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }} />
              </Td>
              <Td>
                <Link to={`/profile/${u.username}`} style={{ color:'#1976d2', textDecoration:'none' }}>
                  {u.name}
                </Link>
              </Td>
              <Td>{u.role}</Td>
              <Td>{u.department || '-'}</Td>
              <Td>{u.role === 'student' ? (u.year ?? '-') : '-'}</Td>
              <Td>{u.role === 'alumni' ? (u.graduationYear ?? '-') : '-'}</Td>
              <Td>{u.role === 'alumni' ? (u.company ?? '-') : '-'}</Td>
              <Td>{u.email}</Td>
              <Td>
                <button onClick={() => deleteUser(u._id)} style={{ padding:'6px 10px', background:'#e53935', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}>
                  Delete
                </button>
              </Td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <Td colSpan={9}>No users found</Td>
            </tr>
          )}
        </tbody>
      </Table>

      {/* Events table */}
      <h3 style={{ fontSize:20, fontWeight:700, margin:'24px 0 8px' }}>Events</h3>
      <Table>
        <thead>
          <tr>
            <Th>Title</Th>
            <Th>Description</Th>
            <Th>Creator</Th>
            <Th>Role</Th>
            <Th>Audience</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {events.map(e => {
            const audience = [
              (e.target_roles && e.target_roles.length) ? `Roles: ${e.target_roles.join(', ')}` : null,
              (e.target_teacher_departments && e.target_teacher_departments.length) ? `Teacher Depts: ${e.target_teacher_departments.join(', ')}` : null,
              (e.target_student_combinations && e.target_student_combinations.length) ? `Student: ${e.target_student_combinations.map(c => `${c.department} Y${c.year}`).join('; ')}` : null,
              (e.target_alumni_combinations && e.target_alumni_combinations.length) ? `Alumni: ${e.target_alumni_combinations.map(c => `${c.department} ${c.graduation_year}`).join('; ')}` : null
            ].filter(Boolean).join(' | ');
            return (
              <tr key={e._id}>
                <Td>
                  <Link to={`/admin/events/${e._id}`} style={{ color:'#2563eb', textDecoration:'none' }}>{e.title}</Link>
                </Td>
                <Td>{e.description?.slice(0, 80) || ''}</Td>
                <Td>{e.organizer?.name || e.createdBy?.name || '-'}</Td>
                <Td>{e.createdBy?.role || e.organizer?.role || '-'}</Td>
                <Td>{audience || '-'}</Td>
                <Td style={{ textTransform:'capitalize' }}>{e.status || (e.approved ? 'active' : 'pending')}</Td>
                <Td style={{ display:'flex', gap:8 }}>
                  {e.status === 'pending' && (
                    <>
                      <button onClick={() => approveEvent(e._id)} style={{ padding:'6px 10px', background:'#43a047', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}>
                        Approve
                      </button>
                      <button onClick={() => rejectEvent(e._id)} style={{ padding:'6px 10px', background:'#f4511e', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}>
                        Reject
                      </button>
                    </>
                  )}
                  <button onClick={() => deleteEvent(e._id)} style={{ padding:'6px 10px', background:'#e53935', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}>
                    Delete
                  </button>
                </Td>
              </tr>
            );
          })}
          {events.length === 0 && (
            <tr>
              <Td colSpan={7}>No events found</Td>
            </tr>
          )}
        </tbody>
      </Table>

      {/* Alumni Requested Events */}
      <h3 style={{ fontSize:20, fontWeight:700, margin:'24px 0 8px' }}>Alumni Requested Events</h3>
      <Table>
        <thead>
          <tr>
            <Th>Title</Th>
            <Th>Requested By</Th>
            <Th>Requested At</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {pendingRequests.map(r => (
            <tr key={r._id}>
              <Td>{r.title}</Td>
              <Td>{r.organizer?.name || r.createdBy?.name || '-'}</Td>
              <Td>{new Date(r.createdAt).toLocaleString()}</Td>
              <Td style={{ display:'flex', gap:8 }}>
                <button onClick={() => approveRequest(r._id)} style={{ padding:'6px 10px', background:'#10b981', color:'#fff', border:'none', borderRadius:6 }}>Accept</button>
                <button onClick={() => rejectRequest(r._id)} style={{ padding:'6px 10px', background:'#f59e0b', color:'#fff', border:'none', borderRadius:6 }}>Reject</button>
                <button onClick={() => deleteRequest(r._id)} style={{ padding:'6px 10px', background:'#ef4444', color:'#fff', border:'none', borderRadius:6 }}>Delete</button>
              </Td>
            </tr>
          ))}
          {pendingRequests.length === 0 && (
            <tr>
              <Td colSpan={4}>No pending requests</Td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default AdminDashboardPage;