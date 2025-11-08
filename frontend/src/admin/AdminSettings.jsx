import React, { useState, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminShell, { AdminSettingsContext } from './AdminShell.jsx';
import { DataPanel } from './components/AdminPrimitives.jsx';

const AdminSettings = () => {
  const { user } = useAuth();
  const { density, setDensity, theme, setTheme } = useContext(AdminSettingsContext);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    autoApproveEvents: false,
    moderationMode: 'manual',
  });

  const handleSave = () => {
    // Save settings logic
    alert('Settings saved successfully!');
  };

  return (
    <AdminShell
      title="Admin Settings"
      description="Configure admin panel preferences and system settings"
    >
      <DataPanel title="Display Settings" description="Customize your admin panel appearance">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Density
            </label>
            <select
              value={density}
              onChange={(e) => setDensity(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="compact">Compact</option>
              <option value="normal">Normal</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Theme
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>
      </DataPanel>

      <DataPanel title="Notification Settings" description="Manage notification preferences">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) =>
                setSettings({ ...settings, emailNotifications: e.target.checked })
              }
              className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-300">Email Notifications</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.pushNotifications}
              onChange={(e) =>
                setSettings({ ...settings, pushNotifications: e.target.checked })
              }
              className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-300">Push Notifications</span>
          </label>
        </div>
      </DataPanel>

      <DataPanel title="Moderation Settings" description="Configure content moderation">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Moderation Mode
            </label>
            <select
              value={settings.moderationMode}
              onChange={(e) =>
                setSettings({ ...settings, moderationMode: e.target.value })
              }
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="manual">Manual Review</option>
              <option value="auto">Auto Approve</option>
              <option value="strict">Strict Mode</option>
            </select>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.autoApproveEvents}
              onChange={(e) =>
                setSettings({ ...settings, autoApproveEvents: e.target.checked })
              }
              className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-300">Auto-approve Events</span>
          </label>
        </div>
      </DataPanel>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Save Settings
        </button>
      </div>
    </AdminShell>
  );
};

export default AdminSettings;
