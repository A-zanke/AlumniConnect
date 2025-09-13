import React, { useEffect, useState } from 'react';
import { followAPI } from '../utils/api';
import { getAvatarUrl } from '../utils/helpers';

const ConnectionsPreview = ({ userId }) => {
  const [mutual, setMutual] = useState([]);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await followAPI.getMutualConnections(userId);
        setMutual(res.data?.data || res.data || []);
      } catch (_) {
        setMutual([]);
      }
    };
    if (userId) run();
  }, [userId]);

  if (!mutual || mutual.length === 0) return null;

  return (
    <div className="rounded-2xl shadow bg-white dark:bg-gray-900">
      <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
        <h3 className="text-lg font-semibold">Mutual Connections</h3>
      </div>
      <div className="p-6">
        <div className="flex -space-x-3 mb-3">
          {mutual.slice(0, 8).map((m, idx) => (
            <img key={idx} className="h-10 w-10 rounded-full border-2 border-white dark:border-gray-800 object-cover" src={m.avatarUrl ? getAvatarUrl(m.avatarUrl) : '/default-avatar.png.jpg'} alt={m.name} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mutual.slice(0, 6).map((m) => (
            <div key={m._id} className="p-3 rounded-xl border dark:border-gray-800">
              <div className="font-semibold text-sm">{m.name}</div>
              <div className="text-xs text-gray-500">{m.role}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConnectionsPreview;

