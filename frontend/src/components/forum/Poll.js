import React, { useEffect, useMemo, useState } from 'react';
import { forumAPI } from '../utils/forumApi';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';

const Poll = ({ post, onVoted }) => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isVoting, setIsVoting] = useState(false);
  const [results, setResults] = useState(null);
  const [showVoters, setShowVoters] = useState(null); // optionIndex or null
  const [voters, setVoters] = useState([]);

  const pollData = useMemo(() => {
    if (!post.poll) return null;

    const totalVotes = post.poll.options.reduce((sum, option) => sum + (option.votes?.length || 0), 0);

    const base = {
      question: post.poll.question,
      options: post.poll.options.map((option, index) => ({
        text: option.text,
        votes: option.votes?.length || 0,
        percentage: totalVotes > 0 ? Math.round((option.votes?.length || 0) / totalVotes * 100) : 0,
        index
      })),
      totalVotes,
      hasVoted: post.hasUserVoted || false
    };

    // If live results exist, overlay
    if (results) {
      return {
        ...base,
        options: base.options.map((o) => {
          const r = results.find((x) => x.index === o.index);
          return r ? { ...o, votes: r.votes, percentage: r.percentage } : o;
        }),
        totalVotes: resultsTotalVotes(results)
      };
    }
    return base;
  }, [post.poll, post.hasUserVoted, results]);

  function resultsTotalVotes(r) {
    return r?.reduce((s, x) => s + (x.votes || 0), 0) || 0;
  }

  useEffect(() => {
    // Join socket room for this post to receive updates
    const token = localStorage.getItem('token');
    if (!token || !post?._id) return;
    const s = io('/', { auth: { token } });
    s.emit('forum:join_post', { postId: post._id });
    s.on('forum:poll_updated', (payload) => {
      if (payload?.postId === post._id) {
        setResults(payload.results);
      }
    });
    return () => {
      try { s.emit('forum:leave_post', { postId: post._id }); } catch {}
      try { s.disconnect(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?._id]);

  const handleVote = async () => {
    if (selectedOptions.length === 0 || isVoting || pollData.hasVoted) return;

    setIsVoting(true);
    try {
      await forumAPI.votePoll(post._id, selectedOptions);
      onVoted && onVoted();
      toast.success('Vote submitted successfully!');
      setSelectedOptions([]);
    } catch (error) {
      console.error('Error voting:', error);
      if (error.response?.status === 400) {
        toast.error('You have already voted in this poll');
      } else {
        toast.error('Failed to submit vote');
      }
    } finally {
      setIsVoting(false);
    }
  };

  const openVoters = async (optionIndex) => {
    try {
      const res = await forumAPI.getPollOptionVoters(post._id, optionIndex);
      setVoters(res.data?.data || []);
      setShowVoters(optionIndex);
    } catch (e) {
      console.error('Failed to load voters', e);
    }
  };

  if (!pollData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-6 border border-gray-200"
    >
      <h4 className="font-semibold text-gray-900 mb-4 text-lg">📊 {pollData.question}</h4>

      <div className="space-y-3 mb-4">
        {pollData.options.map((option) => (
          <motion.div
            key={option.index}
            whileHover={{ scale: 1.02 }}
            className={`relative p-4 rounded-lg border transition-all ${
              selectedOptions.includes(option.index)
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!pollData.hasVoted && (
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option.index)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedOptions(prev => checked ? [...prev, option.index] : prev.filter(i => i !== option.index));
                    }}
                    className="text-green-600 focus:ring-green-500"
                  />
                )}
                <button
                  className={`font-medium ${pollData.hasVoted ? 'text-gray-800' : 'text-gray-900'} text-left`}
                  onClick={() => openVoters(option.index)}
                >
                  {option.text}
                </button>
              </div>

              <button className="flex items-center gap-2" onClick={() => openVoters(option.index)}>
                <span className="text-sm text-gray-600">{option.votes} votes</span>
                <span className="text-sm font-semibold text-green-600">{option.percentage}%</span>
              </button>
            </div>

            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${option.percentage}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="bg-green-500 h-2 rounded-full"
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">Click to see voters</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {pollData.totalVotes} total vote{pollData.totalVotes !== 1 ? 's' : ''}
        </span>

        {!pollData.hasVoted && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleVote}
            disabled={selectedOptions.length === 0 || isVoting}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              selectedOptions.length > 0 && !isVoting
                ? 'bg-green-600 text-white hover:bg-green-700 shadow'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isVoting ? 'Voting...' : 'Vote'}
          </motion.button>
        )}

        {pollData.hasVoted && (
          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">✓ Voted</span>
        )}
      </div>

      <AnimatePresence>
        {showVoters !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-semibold text-gray-900">Voters</h5>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowVoters(null)}>
                  Close
                </button>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {voters.length === 0 && <div className="text-gray-500 text-sm">No voters yet</div>}
                {voters.map((u) => (
                  <div key={u._id} className="flex items-center gap-3">
                    <img
                      src={u.avatarUrl || '/default-avatar.png.jpg'}
                      alt={u.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium text-gray-900">{u.name}</div>
                      <div className="text-xs text-gray-500">{u.department || ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Poll;