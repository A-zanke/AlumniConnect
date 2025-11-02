import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const REACTION_TYPES = [
  { type: 'like', emoji: '👍' },
  { type: 'celebrate', emoji: '🎉' },
  { type: 'clap', emoji: '👏' },
  { type: 'love', emoji: '❤️' },
  { type: 'insightful', emoji: '💡' },
  { type: 'funny', emoji: '😂' },
];

const groupUsers = (reactions = {}) => {
  const entries = Object.entries(reactions);
  return entries
    .map(([type, users]) => ({
      type,
      emoji: REACTION_TYPES.find((r) => r.type === type)?.emoji || '👍',
      users: Array.isArray(users) ? users : [],
    }))
    .filter((group) => group.users.length > 0);
};

const ReactionListModal = ({ open, onClose, reactions = {}, loading = false }) => {
  const [activeType, setActiveType] = useState('all');

  const grouped = useMemo(() => groupUsers(reactions), [reactions]);
  const allUsers = useMemo(
    () => grouped.flatMap((group) => group.users),
    [grouped]
  );

  const activeUsers = useMemo(() => {
    const users = activeType === 'all'
      ? allUsers
      : grouped.find((group) => group.type === activeType)?.users || [];

    return users.filter(Boolean);
  }, [activeType, grouped, allUsers]);

  const handleClose = () => {
    setActiveType('all');
    onClose?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleClose}
          ></div>

          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg sm:max-w-xl bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Reactions</h2>
                <p className="text-xs text-slate-500">
                  {allUsers.length} total reactions
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
                aria-label="Close reactions list"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-nowrap gap-2 overflow-x-auto bg-slate-50 px-4 py-3 text-sm sm:text-base">
              <button
                onClick={() => setActiveType('all')}
                className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all ${
                  activeType === 'all'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>All</span>
                <span className="text-xs font-semibold">{allUsers.length}</span>
              </button>
              {grouped.map((group) => (
                <button
                  key={group.type}
                  onClick={() => setActiveType(group.type)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 transition-all ${
                    activeType === group.type
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{group.emoji}</span>
                  <span className="capitalize">{group.type}</span>
                  <span className="text-xs font-semibold">{group.users.length}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Loading reactions...
                </div>
              ) : activeUsers.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No reactions yet
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeUsers.map((user, index) => {
                    if (!user) return null;

                    const userId = user?._id || user?.id;
                    const Wrapper = userId ? Link : 'div';
                    const wrapperProps = userId
                      ? {
                          to: `/profile/id/${userId}`,
                          onClick: handleClose,
                        }
                      : {
                          onClick: undefined,
                        };

                    return (
                      <Wrapper
                        key={userId || index}
                        className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition"
                        {...wrapperProps}
                      >
                        <img
                          src={user?.avatarUrl || '/default-avatar.png'}
                          alt={user?.name || user?.username || 'User avatar'}
                          className="h-10 w-10 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/default-avatar.png';
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {user?.name || user?.username || 'User'}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {[user?.role, user?.department].filter(Boolean).join(' • ')}
                          </p>
                        </div>
                        <span className="text-lg">
                          {
                            REACTION_TYPES.find((r) => r.type === user?.reactionType)?.emoji ||
                            grouped.find((group) => group.users.includes(user))?.emoji ||
                            '👍'
                          }
                        </span>
                      </Wrapper>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReactionListModal;
