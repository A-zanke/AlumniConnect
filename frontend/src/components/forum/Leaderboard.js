import React, { useEffect, useState } from 'react';
import { forumAPI } from '../utils/forumApi';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Leaderboard = () => {
  const [rows, setRows] = useState([]);

  const load = async () => {
    const res = await forumAPI.leaderboard();
    setRows(res.data?.data || []);
  };

  useEffect(() => { load(); }, []);

  if (!rows.length) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border shadow p-4">
      <div className="font-semibold mb-3">Top Contributors (Last 30 Days)</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r, idx) => (
          <motion.div key={idx} whileHover={{ scale: 1.02 }} className="p-3 rounded-xl border hover:shadow">
            <div className="text-sm text-gray-500">Score: {r.score}</div>
            <div className="font-semibold">
              <Link to={`/profile/${r.user?.username || r.user?._id}`} className="text-indigo-600 hover:underline">
                {r.user?.name}
              </Link>
            </div>
            {r.badges?.length > 0 && (
              <div className="mt-1 flex gap-2 flex-wrap">
                {r.badges.map((b, i) => <span key={i} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs">{b}</span>)}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Leaderboard;