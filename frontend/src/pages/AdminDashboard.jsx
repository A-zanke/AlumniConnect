import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaUsers, FaCalendar, FaComments, FaExclamationTriangle } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StatsCard from '../admin/components/StatsCard';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await axios.get('/api/admin/analytics');
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading || !stats) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Welcome back! Here's your overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Users"
          value={stats.totalStudents + stats.totalTeachers + stats.totalAlumni}
          icon={FaUsers}
          gradient="from-blue-500 to-indigo-600"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Active Events"
          value={stats.eventsActive}
          icon={FaCalendar}
          gradient="from-purple-500 to-pink-600"
        />
        <StatsCard
          title="Forum Posts"
          value={stats.totalForumPosts}
          icon={FaComments}
          gradient="from-green-500 to-teal-600"
        />
        <StatsCard
          title="Reports"
          value={stats.unresolvedReports}
          icon={FaExclamationTriangle}
          gradient="from-orange-500 to-red-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
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

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Forum Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.forumActivitySeries || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="posts" stroke="#6366f1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
