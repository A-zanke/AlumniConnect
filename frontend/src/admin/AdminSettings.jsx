import React, { useContext, useState } from 'react';
import AdminShell, { AdminSettingsContext } from './AdminShell.jsx';
import { DataPanel } from './components/AdminPrimitives.jsx';
import axios from 'axios';

const Option = ({ label, children }) => (
  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
    <span className="text-slate-300">{label}</span>
    <span>{children}</span>
  </label>
);

const AdminSettings = () => {
  const { density, animateCharts, accent, setSettings } = useContext(AdminSettingsContext);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      await axios.put('/api/admin/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setMessage('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    setMessage('Cache cleared successfully');
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <AdminShell title="Settings" subtitle="Personalize your admin experience">
      <div className="grid gap-6 lg:grid-cols-2">
        <DataPanel title="Display" description="Tune layout and motion">
          <div className="space-y-3">
            <Option label="Layout Density">
              <select
                value={density}
                onChange={(e) => setSettings({ density: e.target.value })}
                className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm"
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </Option>
            <Option label="Chart Animations">
              <input
                type="checkbox"
                checked={!!animateCharts}
                onChange={(e) => setSettings({ animateCharts: e.target.checked })}
                className="h-5 w-5 rounded border-white/20 bg-slate-900"
              />
            </Option>
          </div>
        </DataPanel>

        <DataPanel title="Theme" description="Choose an accent">
          <div className="grid grid-cols-2 gap-3">
            {['indigo', 'purple', 'blue', 'emerald'].map((c) => (
              <button
                key={c}
                onClick={() => setSettings({ accent: c })}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold capitalize transition ${
                  accent === c
                    ? 'border-white/20 bg-white/10 text-white'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </DataPanel>

        <DataPanel title="Security" description="Account security settings">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </DataPanel>

        <DataPanel title="System" description="System maintenance">
          <div className="space-y-4">
            <button
              onClick={clearCache}
              className="w-full rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
            >
              Clear Cache & Reload
            </button>
            <button
              onClick={() => setMessage('Settings saved successfully')}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Save All Settings
            </button>
          </div>
        </DataPanel>
      </div>

      {message && (
        <div className="mt-4 rounded-xl bg-blue-500/20 border border-blue-500/30 px-4 py-3 text-blue-200">
          {message}
        </div>
      )}
    </AdminShell>
  );
};

export default AdminSettings;
