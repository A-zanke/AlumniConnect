import { useState } from 'react';
import axios from 'axios';

const REACTIONS = [
  { key: 'like', label: '👍' },
  { key: 'love', label: '❤️' },
  { key: 'haha', label: '😂' },
  { key: 'sad', label: '😢' },
  { key: 'angry', label: '😡' }
];

export function useReaction(postId, initialSummary, initialUserReaction) {
  const [summary, setSummary] = useState(initialSummary || {});
  const [userReaction, setUserReaction] = useState(initialUserReaction || null);
  const [total, setTotal] = useState(Object.values(initialSummary || {}).reduce((a, b) => a + b, 0));
  const [showPanel, setShowPanel] = useState(false);

  // Optimistic update
  const react = async (type) => {
    let prevReaction = userReaction;
    if (userReaction === type) {
      setUserReaction(null);
      setSummary(s => ({ ...s, [type]: Math.max((s[type] || 1) - 1, 0) }));
      setTotal(t => t - 1);
      await axios.delete('/api/reactions/remove', { data: { postId } });
    } else {
      if (userReaction) {
        setSummary(s => ({ ...s, [userReaction]: Math.max((s[userReaction] || 1) - 1, 0), [type]: (s[type] || 0) + 1 }));
      } else {
        setSummary(s => ({ ...s, [type]: (s[type] || 0) + 1 }));
        setTotal(t => t + 1);
      }
      setUserReaction(type);
      await axios.post('/api/reactions/add', { postId, type });
    }
    // Optionally refetch summary from backend for consistency
    // const res = await axios.get(`/api/reactions/summary/${postId}`);
    // setSummary(res.data.summary);
    // setUserReaction(res.data.userReaction);
    // setTotal(res.data.total);
  };

  return { summary, userReaction, total, react, REACTIONS, showPanel, setShowPanel };
}
