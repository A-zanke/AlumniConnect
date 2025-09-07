import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { connectionAPI, followAPI } from '../components/utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUserPlus,
  FaUserFriends,
  FaNetworkWired,
  FaUserCheck,
  FaHistory,
  FaUserTimes,
  FaLightbulb
} from 'react-icons/fa';
import { getAvatarUrl } from '../components/utils/helpers';

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const EmptyState = ({ icon: Icon, title, subtitle, ctaText, onCta }) => (
  <div className="col-span-full text-center py-12">
    <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
      <Icon className="text-3xl" />
    </div>
    <p className="text-xl font-semibold text-gray-900">{title}</p>
    {subtitle ? <p className="text-sm mt-2 text-gray-600">{subtitle}</p> : null}
    {ctaText ? (
      <button
        onClick={onCta}
        className="mt-4 px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors"
      >
        {ctaText}
      </button>
    ) : null}
  </div>
);

const NetworkPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('following'); // following | mutual | ai | requests | history
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [following, setFollowing] = useState([]); // accurate DB list
  const [mutualConnections, setMutualConnections] = useState([]); // unique mutuals
  const [aiRecommendations, setAiRecommendations] = useState([]); // student only
  const [pendingRequests, setPendingRequests] = useState([]);
  const [requestHistory, setRequestHistory] = useState([]);

  // For “Mutual via <Name>” labels (best-effort client-side hint)
  const [mutualViaMap, setMutualViaMap] = useState({}); // mutualUserId -> viaUserName

  const [stats, setStats] = useState({
    following: 0,
    mutualConnections: 0
  });

  const isStudent = user?.role === 'student';

  // CORE FETCH: Pull accurate counts and lists from DB (no hardcoding)
  const fetchNetworkData = useCallback(async () => {
    try {
      setLoading(true);
      if (!user || !user._id) return;

      const [
        followingRes,
        mutualRes,
        suggestedRes,
        requestsRes,
        historyRes
      ] = await Promise.all([
        followAPI.getFollowing(user._id).catch(() => ({ data: [] })),
        followAPI.getMyMutualConnections().catch(() => ({ data: [] })),
        (isStudent ? followAPI.getSuggestedConnections() : Promise.resolve({ data: [] })).catch(() => ({ data: [] })),
        connectionAPI.getPendingRequests().catch(() => ({ data: [] })),
        connectionAPI.getRequestHistory().catch(() => ({ data: { data: [] } }))
      ]);

      const followingData = followingRes.data?.data || followingRes.data || [];
      const mutualDataRaw = mutualRes.data?.data || mutualRes.data || [];
      const suggestedData = suggestedRes.data?.data || suggestedRes.data || [];
      const pendingData = requestsRes.data?.data || requestsRes.data || [];
      const historyData = historyRes.data?.data || historyRes.data || [];

      // Deduplicate mutuals by _id (safety)
      const uniqueMutualsMap = new Map();
      (mutualDataRaw || []).forEach((m) => {
        if (m && m._id && !uniqueMutualsMap.has(m._id)) uniqueMutualsMap.set(m._id, m);
      });
      const mutualData = Array.from(uniqueMutualsMap.values());

      setFollowing(followingData);
      setMutualConnections(mutualData);
      setAiRecommendations(suggestedData);
      setPendingRequests(pendingData);
      setRequestHistory(historyData);

      setStats({
        following: (followingData || []).length,
        mutualConnections: (mutualData || []).length
      });

      // Build “via <name>” label for mutuals using a small sample of following graph
      const sample = (followingData || []).slice(0, 10);
      if (sample.length) {
        const viaEntries = await Promise.all(
          sample.map(async (f) => {
            try {
              const resp = await followAPI.getFollowing(f._id);
              const list = resp.data?.data || resp.data || [];
              return { viaUser: f, theirFollowingIds: new Set(list.map((x) => x._id)) };
            } catch {
              return { viaUser: f, theirFollowingIds: new Set() };
            }
          })
        );
        const viaMap = {};
        (mutualData || []).forEach((m) => {
          const foundVia = viaEntries.find((ve) => ve.theirFollowingIds.has(m._id));
          if (foundVia) viaMap[m._id] = foundVia.viaUser?.name || 'mutual';
        });
        setMutualViaMap(viaMap);
      } else {
        setMutualViaMap({});
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching network data:', err);
      setError('Failed to load network data');
      toast.error('Failed to load network data');
    } finally {
      setLoading(false);
    }
  }, [user, isStudent]);

  useEffect(() => {
    if (user && user._id) {
      fetchNetworkData();
    } else {
      setLoading(false);
    }
  }, [fetchNetworkData, user]);

  // Optimistic tweaks for instantaneous feel; we still refetch to stay accurate
  const incFollowing = () => setStats((p) => ({ ...p, following: Math.max(0, (p.following || 0) + 1) }));
  const decFollowing = () => setStats((p) => ({ ...p, following: Math.max(0, (p.following || 0) - 1) }));

  const handleConnect = async (targetUserId) => {
    if (!targetUserId || targetUserId === user._id) {
      toast.error('Invalid user or cannot connect to yourself.');
      return;
    }
    try {
      await connectionAPI.sendRequest(targetUserId);
      toast.success('Connection request sent!');
      setAiRecommendations((prev) =>
        prev.map((u) => (u._id === targetUserId ? { ...u, connectionStatus: 'requested' } : u))
      );
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error('Failed to send connection request');
    }
  };

  const handleAcceptRequest = async (requesterUserId) => {
    try {
      await connectionAPI.acceptRequest(requesterUserId);
      toast.success('Connection request accepted!');
      await fetchNetworkData();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (requesterUserId) => {
    try {
      await connectionAPI.rejectRequest(requesterUserId);
      toast.success('Connection request rejected');
      await fetchNetworkData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  const handleFollowToggle = async (targetUserId) => {
    try {
      const response = await followAPI.followUser(targetUserId);
      const isFollowingNow = response?.data?.isFollowing;
      toast.success(response?.data?.message || (isFollowingNow ? 'Followed' : 'Unfollowed'));

      // Optimistic UI
      if (isFollowingNow) {
        incFollowing();
      } else {
        decFollowing();
        // Remove from local following list immediately for responsiveness
        setFollowing((prev) => prev.filter((u) => u._id !== targetUserId));
      }
      // Ensure counts and mutuals are accurate from DB
      await fetchNetworkData();
    } catch (error) {
      console.error('Error following/unfollowing user:', error);
      toast.error('Failed to follow/unfollow user');
    }
  };

  const followingCount = stats.following || 0;
  const mutualCount = stats.mutualConnections || 0;

  const StatCard = ({ label, count, icon, onClick }) => (
    <motion.button
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="bg-white rounded-xl shadow-md p-6 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all border border-indigo-50"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <h3 className="text-2xl font-bold text-gray-900">{count}</h3>
        </div>
        {icon}
      </div>
    </motion.button>
  );

  const UserCard = ({ person, primaryAction, subline }) => (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border border-gray-50"
    >
      <div
        className="flex items-center mb-4 cursor-pointer"
        onClick={() => navigate(`/profile/${person.username || person._id}`)}
      >
        {person.avatarUrl ? (
          <img
            src={getAvatarUrl(person.avatarUrl)}
            alt={person.name || 'User'}
            className="h-12 w-12 rounded-full object-cover border-2 border-gray-100"
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
            {(person.name || 'U').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="ml-4 flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{person.name || 'Unknown User'}</h3>
          <p className="text-sm text-gray-500 truncate">@{person.username || 'unknown'}</p>
          <p className="text-xs text-gray-400 capitalize">{person.role || 'user'}</p>
          {person.email ? <p className="text-xs text-indigo-600 truncate">{person.email}</p> : null}
          {person.department && person.year ? (
            <p className="text-xs text-gray-500 truncate">{person.department} • Year {person.year}</p>
          ) : person.industry || person.current_job_title ? (
            <p className="text-xs text-gray-500 truncate">{person.current_job_title || person.industry}</p>
          ) : null}
          {subline ? <p className="text-[11px] text-gray-500 mt-1">{subline}</p> : null}
        </div>
      </div>
      <div className="flex space-x-2">
        {primaryAction}
        <Link
          to={`/profile/${person.username || person._id}`}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
        >
          View Profile
        </Link>
      </div>
    </motion.div>
  );

  const FollowingList = useMemo(() => {
    return (following || []).map((f) => (
      <UserCard
        key={f._id}
        person={f}
        primaryAction={
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFollowToggle(f._id);
            }}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
          >
            <FaUserTimes className="mr-2" />
            Unfollow
          </button>
        }
      />
    ));
  }, [following]);

  const MutualList = useMemo(() => {
    return (mutualConnections || []).map((m) => (
      <UserCard
        key={m._id}
        person={m}
        subline={mutualViaMap[m._id] ? `Mutual via ${mutualViaMap[m._id]}` : 'Mutual connection'}
        primaryAction={
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFollowToggle(m._id);
            }}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
          >
            <FaUserPlus className="mr-2" />
            Follow
          </button>
        }
      />
    ));
  }, [mutualConnections, mutualViaMap]);

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h2>
          <p className="text-gray-600">You need to be logged in to view your network.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Network</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchNetworkData}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Network</h1>
          <p className="mt-2 text-gray-600">Connect and grow your professional network</p>
        </div>
      </div>

      {/* Stat Cards (Clickable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatCard
          label="Following"
          count={followingCount}
          icon={<FaUserFriends className="text-3xl text-indigo-600" />}
          onClick={() => setActiveTab('following')}
        />
        <StatCard
          label="Mutual Connections"
          count={mutualCount}
          icon={<FaNetworkWired className="text-3xl text-indigo-600" />}
          onClick={() => setActiveTab('mutual')}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('following')}
            className={`${
              activeTab === 'following'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium flex items-center`}
          >
            <FaUserFriends className="mr-2" />
            Following ({followingCount})
          </button>
          <button
            onClick={() => setActiveTab('mutual')}
            className={`${
              activeTab === 'mutual'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium flex items-center`}
          >
            <FaNetworkWired className="mr-2" />
            Mutual Connections ({mutualCount})
          </button>
          {isStudent && (
            <button
              onClick={() => setActiveTab('ai')}
              className={`${
                activeTab === 'ai'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap pb-4 px-1 border-b-2 font-medium flex items-center`}
            >
              <FaLightbulb className="mr-2" />
              AI Recommendations
            </button>
          )}
          <button
            onClick={() => setActiveTab('requests')}
            className={`${
              activeTab === 'requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium relative flex items-center`}
          >
            <FaUserCheck className="mr-2" />
            Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium flex items-center`}
          >
            <FaHistory className="mr-2" />
            Request History
          </button>
        </nav>
      </div>

      {/* Content with smooth tab transitions */}
      <AnimatePresence mode="wait">
        {activeTab === 'following' ? (
          <motion.div
            key="following"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[70vh] overflow-auto pr-1"
          >
            {following.length === 0 ? (
              <EmptyState
                icon={FaUserFriends}
                title="You’re not following anyone yet."
                subtitle="Start building your network!"
                ctaText={isStudent ? 'Explore AI Recommendations' : undefined}
                onCta={() => isStudent && setActiveTab('ai')}
              />
            ) : (
              FollowingList
            )}
          </motion.div>
        ) : activeTab === 'mutual' ? (
          <motion.div
            key="mutual"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[70vh] overflow-auto pr-1"
          >
            {mutualConnections.length === 0 ? (
              <EmptyState
                icon={FaNetworkWired}
                title="No mutual connections found yet."
                subtitle="Connect with more people to discover mutuals."
                ctaText={isStudent ? 'Explore AI Recommendations' : undefined}
                onCta={() => isStudent && setActiveTab('ai')}
              />
            ) : (
              MutualList
            )}
          </motion.div>
        ) : activeTab === 'requests' ? (
          <motion.div
            key="requests"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[70vh] overflow-auto pr-1"
          >
            {pendingRequests.length === 0 ? (
              <EmptyState icon={FaUserCheck} title="No pending requests" subtitle="You’re all caught up!" />
            ) : (
              pendingRequests.map((request) => {
                const reqUser = request.requester || request; // supports both shapes
                return (
                  <motion.div
                    key={reqUser?._id || request._id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border border-gray-50"
                  >
                    <div className="flex items-center mb-4">
                      {reqUser?.avatarUrl ? (
                        <img
                          src={getAvatarUrl(reqUser.avatarUrl)}
                          alt={reqUser?.name || 'User'}
                          className="h-12 w-12 rounded-full object-cover border-2 border-gray-100"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {(reqUser?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="ml-4 flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {reqUser?.name || 'Unknown User'}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">@{reqUser?.username || 'unknown'}</p>
                        <p className="text-xs text-gray-400 capitalize">{reqUser?.role || 'user'}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAcceptRequest(reqUser?._id)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(reqUser?._id)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                      >
                        Decline
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        ) : activeTab === 'ai' ? (
          <motion.div
            key="ai"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[70vh] overflow-auto pr-1"
          >
            {aiRecommendations.length === 0 ? (
              <EmptyState
                icon={FaLightbulb}
                title="No recommendations available"
                subtitle="Connect and engage to get personalized recommendations."
              />
            ) : (
              (aiRecommendations || []).map((rec) => (
                <UserCard
                  key={rec._id}
                  person={rec}
                  subline="Recommended for you"
                  primaryAction={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnect(rec._id);
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                    >
                      <FaUserPlus className="mr-2" />
                      Connect
                    </button>
                  }
                />
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[70vh] overflow-auto pr-1"
          >
            {requestHistory.length === 0 ? (
              <EmptyState
                icon={FaHistory}
                title="No request history"
                subtitle="Your accepted and rejected requests will appear here."
              />
            ) : (
              requestHistory.map((item) => {
                const other = item.requester?._id === user._id ? item.recipient : item.requester;
                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border border-gray-50"
                  >
                    <div className="flex items-center mb-4">
                      {other?.avatarUrl ? (
                        <img
                          src={getAvatarUrl(other.avatarUrl)}
                          alt={other?.name || 'User'}
                          className="h-12 w-12 rounded-full object-cover border-2 border-gray-100"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {(other?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="ml-4 flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {other?.name || 'Unknown User'}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">@{other?.username || 'unknown'}</p>
                        <p className="text-xs text-gray-400 capitalize">{other?.role || 'user'}</p>
                        <p
                          className={`text-xs mt-1 ${
                            item.status === 'accepted'
                              ? 'text-green-600'
                              : item.status === 'rejected'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                          }`}
                        >
                          {item.status?.toUpperCase()} • {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        to={`/profile/${other?.username || other?._id}`}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                      >
                        View Profile
                      </Link>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NetworkPage;