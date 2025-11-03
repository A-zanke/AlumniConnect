import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import AdminShell from '../admin/AdminShell.jsx';
import { DataPanel, StatBadge, TableShell } from '../admin/components/AdminPrimitives.jsx';

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

  if (loading) {
    return (
      <AdminShell title="Loading dashboard" subtitle="Fetching the latest insights for you">
        <div className="flex h-64 items-center justify-center">
          <div className="h-24 w-24 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Command Hub"
      subtitle="Monitor campus-wide engagement, intervene fast, and celebrate the wins."
      rightSlot={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportUsers()}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-white/30 hover:bg-white/20"
          >
            Export Users
          </button>
          <button
            onClick={() => exportEvents()}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-indigo-500/30 transition hover:brightness-110"
          >
            Export Events
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {totals.map((t, index) => (
          <button
            key={t.label}
            type="button"
            onClick={() => t.key && navigate(`/admin/users?role=${t.key}`)}
            className={`text-left transition ${t.key ? 'hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500' : ''}`}
          >
            <StatBadge
              label={t.label}
              value={t.value}
              accent={index === 0 ? 'All active members' : index >= 3 ? 'Event moderation' : undefined}
            />
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* 1. Users by Role */}
        <DataPanel title="Users by Role" description="Distribution across roles" className="lg:col-span-4 min-w-0">
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={stats.usersByRole || []} dataKey="value" nameKey="name" innerRadius={40} outerRadius={88} paddingAngle={2} label={false}>
                  {(stats.usersByRole || []).map((_, index) => (
                    <Cell key={`ur-${index}`} fill={["#6366f1", "#22d3ee", "#f472b6"][index % 3]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', borderRadius: 16, border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DataPanel>

        {/* 2. Active vs Inactive */}
        <DataPanel title="Active vs Inactive" description="Last 7 days activity" className="lg:col-span-4 min-w-0">
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={stats.activeInactiveByRole || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="role" stroke="rgba(148,163,184,0.7)" tickLine={false} />
                <YAxis stroke="rgba(148,163,184,0.7)" tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', borderRadius: 16, border: '1px solid rgba(16,185,129,0.3)', color: '#e2e8f0' }} />
                <Legend wrapperStyle={{ color: '#cbd5f5' }} />
                <Bar dataKey="active" stackId="a" fill="#22c55e" radius={[8,8,0,0]} />
                <Bar dataKey="inactive" stackId="a" fill="#f59e0b" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DataPanel>

        {/* 3. Forum Engagement */}
        <DataPanel className="lg:col-span-4 min-w-0" title="Forum Engagement" description="Topic velocity and participation">
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={stats.forumActivitySeries || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="month" stroke="rgba(148,163,184,0.7)" tickLine={false} />
                <YAxis stroke="rgba(148,163,184,0.7)" tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', borderRadius: 16, border: '1px solid rgba(139,92,246,0.3)', color: '#e2e8f0' }} />
                <Bar dataKey="posts" radius={[10, 10, 0, 0]} fill="url(#forumGradient)" />
                <defs>
                  <linearGradient id="forumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DataPanel>

        {/* 4. Community Growth */}
        <DataPanel title="Community Growth" description="Onboarding trends across roles" className="lg:col-span-4 min-w-0">
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={stats.userGrowthSeries || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="month" stroke="rgba(148,163,184,0.7)" tickLine={false} />
                <YAxis stroke="rgba(148,163,184,0.7)" tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', borderRadius: 16, border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0' }} />
                <Legend wrapperStyle={{ color: '#cbd5f5' }} />
                <Line type="monotone" dataKey="students" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="teachers" stroke="#22d3ee" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="alumni" stroke="#f472b6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DataPanel>

        {/* 5. Post Activity */}
        <DataPanel title="Post Activity" description="Posts created per month" className="lg:col-span-4 min-w-0">
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={stats.postActivitySeries || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="month" stroke="rgba(148,163,184,0.7)" tickLine={false} />
                <YAxis stroke="rgba(148,163,184,0.7)" tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', borderRadius: 16, border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0' }} />
                <Line type="monotone" dataKey="posts" stroke="#38bdf8" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DataPanel>

        {/* 6. Reports Status */}
        <DataPanel title="Reports Status" description="Pending vs resolved per month" className="lg:col-span-4 min-w-0">
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={stats.reportsStatusSeries || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis dataKey="month" stroke="rgba(148,163,184,0.7)" tickLine={false} />
                <YAxis stroke="rgba(148,163,184,0.7)" tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', borderRadius: 16, border: '1px solid rgba(248,113,113,0.3)', color: '#e2e8f0' }} />
                <Legend wrapperStyle={{ color: '#cbd5f5' }} />
                <Bar dataKey="pending" stackId="r" fill="#f59e0b" radius={[8,8,0,0]} />
                <Bar dataKey="resolved" stackId="r" fill="#22c55e" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DataPanel>
      </div>

      <DataPanel 
        title="User Directory" 
        description="Full visibility across students, faculty, and alumni"
        className="lg:col-span-12"
      >
        <TableShell
          headers={[
            'Profile',
            'Name',
            'Role',
            'Department',
            'Year',
            'Graduation',
            'Company',
            'Email',
            'Actions',
          ]}
        >
          {users.map((u) => (
            <tr key={u._id} className="hover:bg-white/5">
              <td className="px-4 py-4">
                <img
                  src={u.avatarUrl || '/default-avatar.png'}
                  alt="avatar"
                  className="h-11 w-11 rounded-2xl border border-white/10 object-cover"
                />
              </td>
              <td className="px-4 py-4">
                <Link to={`/profile/${u.username}`} className="text-indigo-200 hover:text-indigo-100">
                  {u.name}
                </Link>
              </td>
              <td className="px-4 py-4 capitalize">{u.role}</td>
              <td className="px-4 py-4">{u.department || '-'}</td>
              <td className="px-4 py-4">{u.role === 'student' ? u.year ?? '-' : '-'}</td>
              <td className="px-4 py-4">{u.role === 'alumni' ? u.graduationYear ?? '-' : '-'}</td>
              <td className="px-4 py-4">{u.role === 'alumni' ? u.company ?? '-' : '-'}</td>
              <td className="px-4 py-4">{u.email}</td>
              <td className="px-4 py-4">
                <button
                  onClick={() => deleteUser(u._id)}
                  className="rounded-xl bg-red-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-200 transition hover:bg-red-500/30"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                No users found
              </td>
            </tr>
          )}
        </TableShell>
      </DataPanel>

      <DataPanel 
        title="Event Landscape" 
        description="Active, pending, and legacy moments"
        className="lg:col-span-12"
      >
        <TableShell headers={['Title', 'Description', 'Creator', 'Role', 'Audience', 'Status', 'Actions']}>
          {events.map((e) => {
            const audience = [
              e.target_roles?.length ? `Roles: ${e.target_roles.join(', ')}` : null,
              e.target_teacher_departments?.length ? `Teacher Depts: ${e.target_teacher_departments.join(', ')}` : null,
              e.target_student_combinations?.length
                ? `Student: ${e.target_student_combinations.map((c) => `${c.department} Y${c.year}`).join('; ')}`
                : null,
              e.target_alumni_combinations?.length
                ? `Alumni: ${e.target_alumni_combinations.map((c) => `${c.department} ${c.graduation_year}`).join('; ')}`
                : null,
            ]
              .filter(Boolean)
              .join(' | ');

            return (
              <tr key={e._id} className="hover:bg-white/5">
                <td className="px-4 py-4">
                  <Link to={`/admin/events/${e._id}`} className="font-semibold text-indigo-200 hover:text-indigo-100">
                    {e.title}
                  </Link>
                </td>
                <td className="px-4 py-4 text-slate-300">{e.description?.slice(0, 80) || ''}</td>
                <td className="px-4 py-4">{e.organizer?.name || e.createdBy?.name || '-'}</td>
                <td className="px-4 py-4 capitalize">{e.createdBy?.role || e.organizer?.role || '-'}</td>
                <td className="px-4 py-4 text-slate-300">{audience || '-'}</td>
                <td className="px-4 py-4 capitalize">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                      e.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-200'
                        : e.status === 'rejected'
                        ? 'bg-red-500/20 text-red-200'
                        : 'bg-emerald-500/20 text-emerald-200'
                    }`}
                  >
                    {e.status || (e.approved ? 'active' : 'pending')}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {e.status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveEvent(e._id)}
                          className="rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-200 transition hover:bg-emerald-500/30"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectEvent(e._id)}
                          className="rounded-xl bg-amber-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-amber-200 transition hover:bg-amber-500/30"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => deleteEvent(e._id)}
                      className="rounded-xl bg-red-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-200 transition hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {events.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                No events found
              </td>
            </tr>
          )}
        </TableShell>
      </DataPanel>

      <DataPanel 
        title="Alumni Requests" 
        description="Rapid response to community initiatives"
        className="lg:col-span-12"
      >
        <TableShell headers={['Title', 'Requested By', 'Requested At', 'Actions']}>
          {pendingRequests.map((r) => (
            <tr key={r._id} className="hover:bg-white/5">
              <td className="px-4 py-4 font-medium text-slate-100">{r.title}</td>
              <td className="px-4 py-4 text-slate-300">{r.organizer?.name || r.createdBy?.name || '-'}</td>
              <td className="px-4 py-4 text-slate-300">{new Date(r.createdAt).toLocaleString()}</td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => approveRequest(r._id)}
                    className="rounded-xl bg-emerald-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-200 transition hover:bg-emerald-500/30"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => rejectRequest(r._id)}
                    className="rounded-xl bg-amber-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-amber-200 transition hover:bg-amber-500/30"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => deleteRequest(r._id)}
                    className="rounded-xl bg-red-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-200 transition hover:bg-red-500/30"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {pendingRequests.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                No pending requests
              </td>
            </tr>
          )}
        </TableShell>
      </DataPanel>
    </AdminShell>
  );
};

export default AdminDashboardPage;