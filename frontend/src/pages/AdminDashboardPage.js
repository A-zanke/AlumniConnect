import React, { useEffect, useMemo, useState, useContext } from 'react';
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
import AdminShell, { AdminSettingsContext } from '../admin/AdminShell.jsx';
import { DataPanel, StatBadge, TableShell } from '../admin/components/AdminPrimitives.jsx';

const AdminDashboardPage = () => {
  const { animateCharts } = useContext(AdminSettingsContext);
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

  const exportUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users');
      const users = response.data || [];
      
      const csvContent = [
        ['Name', 'Email', 'Role', 'Department', 'Created At'].join(','),
        ...users.map(user => [
          user.name || '',
          user.email || '',
          user.role || '',
          user.department || '',
          new Date(user.createdAt).toLocaleDateString()
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export users');
    }
  };

  const exportEvents = async () => {
    try {
      const response = await axios.get('/api/admin/events');
      const events = response.data || [];
      
      const csvContent = [
        ['Title', 'Status', 'Organizer', 'Start Date', 'Location', 'Created At'].join(','),
        ...events.map(event => [
          event.title || '',
          event.status || (event.approved ? 'active' : 'pending'),
          event.organizer?.name || event.createdBy?.name || '',
          event.startAt ? new Date(event.startAt).toLocaleDateString() : '',
          event.location || '',
          new Date(event.createdAt).toLocaleDateString()
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export events');
    }
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
    { key: 'student', type: 'user', label: 'Students', value: stats.totalStudents || 0 },
    { key: 'teacher', type: 'user', label: 'Teachers', value: stats.totalTeachers || 0 },
    { key: 'alumni', type: 'user', label: 'Alumni', value: stats.totalAlumni || 0 },
    { key: 'active', type: 'event', label: 'Events (Active)', value: stats.eventsActive || 0 },
    { key: 'pending', type: 'event', label: 'Events (Pending)', value: stats.eventsPending || 0 },
    { key: 'rejected', type: 'event', label: 'Events (Rejected)', value: stats.eventsRejected || 0 }
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
      title="Dashboard"
      subtitle="Campus insights at a glance"
      metrics={{
        totalUsers: (stats.totalStudents || 0) + (stats.totalTeachers || 0) + (stats.totalAlumni || 0),
        activeEvents: stats.eventsActive || 0,
        pendingReports: stats.reportsPending || 0
      }}
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
            onClick={() => {
              if (t.type === 'user') {
                navigate(`/admin/users?role=${t.key}`);
              } else if (t.type === 'event') {
                navigate(`/admin/events?status=${t.key}`);
              }
            }}
            className="text-left transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
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
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie 
                  data={stats.usersByRole || []} 
                  dataKey="value" 
                  nameKey="name" 
                  innerRadius={50} 
                  outerRadius={120} 
                  paddingAngle={3} 
                  label={({cx, cy, midAngle, innerRadius, outerRadius, name, percent}) => {
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text 
                        x={x} 
                        y={y} 
                        fill="#ffffff" 
                        textAnchor={x > cx ? 'start' : 'end'} 
                        dominantBaseline="central"
                        fontSize="12"
                        fontWeight="600"
                        style={{
                          textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                          filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.8))'
                        }}
                      >
                        {`${name}: ${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                  labelLine={false}
                  isAnimationActive={animateCharts}
                  animationBegin={0}
                  animationDuration={1500}
                >
                  {(stats.usersByRole || []).map((_, index) => (
                    <Cell 
                      key={`ur-${index}`} 
                      fill={["#3b82f6", "#10b981", "#f59e0b", "#ef4444"][index % 4]}
                      stroke="#1e293b"
                      strokeWidth={2}
                      style={{ 
                        filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(15, 23, 42, 0.98)', 
                    borderRadius: 16, 
                    border: '2px solid rgba(59, 130, 246, 0.8)', 
                    color: '#ffffff',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    fontSize: '14px',
                    fontWeight: '600',
                    padding: '12px 16px'
                  }}
                  labelStyle={{ color: '#ffffff', fontWeight: '600' }}
                  itemStyle={{ color: '#ffffff', fontWeight: '500' }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DataPanel>

        {/* 2. Active vs Inactive */}
        <DataPanel title="Active vs Inactive" description="Last 7 days activity" className="lg:col-span-4 min-w-0">
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <BarChart data={stats.activeInactiveByRole || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                <XAxis 
                  dataKey="role" 
                  stroke="#94a3b8" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(15, 23, 42, 0.95)', 
                    borderRadius: 16, 
                    border: '1px solid rgba(34, 197, 94, 0.5)', 
                    color: '#f1f5f9',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
                  }} 
                />
                <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: '14px', fontWeight: '500' }} />
                <Bar 
                  dataKey="active" 
                  stackId="a" 
                  fill="url(#activeGradient)" 
                  radius={[4,4,0,0]} 
                  isAnimationActive={animateCharts}
                  animationDuration={1200}
                  animationBegin={200}
                />
                <Bar 
                  dataKey="inactive" 
                  stackId="a" 
                  fill="url(#inactiveGradient)" 
                  radius={[4,4,0,0]} 
                  isAnimationActive={animateCharts}
                  animationDuration={1200}
                  animationBegin={400}
                />
                <defs>
                  <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="inactiveGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DataPanel>

        {/* 3. Forum Engagement */}
        <DataPanel className="lg:col-span-4 min-w-0" title="Forum Engagement" description="Topic velocity and participation">
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <BarChart data={stats.forumActivitySeries || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                <XAxis 
                  dataKey="month" 
                  stroke="#94a3b8" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(15, 23, 42, 0.95)', 
                    borderRadius: 16, 
                    border: '1px solid rgba(139, 92, 246, 0.5)', 
                    color: '#f1f5f9',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
                  }} 
                />
                <Bar 
                  dataKey="posts" 
                  radius={[8, 8, 0, 0]} 
                  fill="url(#forumGradient)" 
                  isAnimationActive={animateCharts}
                  animationDuration={1500}
                  animationBegin={300}
                />
                <defs>
                  <linearGradient id="forumGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DataPanel>

        {/* 4. Community Growth */}
        <DataPanel title="Community Growth" description="Onboarding trends across roles" className="lg:col-span-4 min-w-0">
          <div className="h-80 w-full">
            <ResponsiveContainer>
              <LineChart data={stats.userGrowthSeries || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                <XAxis 
                  dataKey="month" 
                  stroke="#94a3b8" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(15, 23, 42, 0.95)', 
                    borderRadius: 16, 
                    border: '1px solid rgba(59, 130, 246, 0.5)', 
                    color: '#f1f5f9',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
                  }} 
                />
                <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: '14px', fontWeight: '500' }} />
                <Line 
                  type="monotone" 
                  dataKey="students" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }} 
                  activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2, fill: '#1e40af' }} 
                  isAnimationActive={animateCharts}
                  animationDuration={2000}
                  animationBegin={0}
                />
                <Line 
                  type="monotone" 
                  dataKey="teachers" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }} 
                  activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 2, fill: '#047857' }} 
                  isAnimationActive={animateCharts}
                  animationDuration={2000}
                  animationBegin={200}
                />
                <Line 
                  type="monotone" 
                  dataKey="alumni" 
                  stroke="#f59e0b" 
                  strokeWidth={4} 
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 6 }} 
                  activeDot={{ r: 8, stroke: '#f59e0b', strokeWidth: 2, fill: '#d97706' }} 
                  isAnimationActive={animateCharts}
                  animationDuration={2000}
                  animationBegin={400}
                />
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
                <Line type="monotone" dataKey="posts" stroke="#38bdf8" strokeWidth={3} dot={false} isAnimationActive={animateCharts} />
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
                <Bar dataKey="pending" stackId="r" fill="#f59e0b" radius={[8,8,0,0]} isAnimationActive={animateCharts} />
                <Bar dataKey="resolved" stackId="r" fill="#22c55e" radius={[8,8,0,0]} isAnimationActive={animateCharts} />
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