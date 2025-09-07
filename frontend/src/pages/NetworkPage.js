import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { connectionAPI, followAPI, userAPI } from '../components/utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserPlus, FaUserMinus, FaUsers, FaUserFriends, FaNetworkWired, FaUserCheck, FaHeart, FaUserTimes } from 'react-icons/fa';
import { getAvatarUrl } from '../components/utils/helpers';

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const NetworkPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('following');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [following, setFollowing] = useState([]);
  const [mutualConnections, setMutualConnections] = useState([]);
  const [suggestedConnections, setSuggestedConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [requestHistory, setRequestHistory] = useState([]);
  const [stats, setStats] = useState({
    totalConnections: 0,
    mutualConnections: 0
  });

  const fetchNetworkData = useCallback(async () => {
    try {
      setLoading(true);
      if (!user?._id) {
        console.log('No user ID available');
        return;
      }
      
      console.log('Fetching network data for user:', user._id);
      
      const [followingRes, mutualRes, suggestedRes, requestsRes, historyRes] = await Promise.all([
        followAPI.getFollowing(user._id).catch(err => {
          console.error('Error fetching following:', err);
          return { data: [] };
        }),
        followAPI.getMyMutualConnections().catch(err => {
          console.error('Error fetching mutual connections:', err);
          return { data: [] };
        }),
        followAPI.getSuggestedConnections().catch(err => {
          console.error('Error fetching suggested connections:', err);
          return { data: [] };
        }),
        connectionAPI.getPendingRequests().catch(err => {
          console.error('Error fetching pending requests:', err);
          return { data: [] };
        }),
        connectionAPI.getRequestHistory().catch(err => {
          console.error('Error fetching request history:', err);
          return { data: [] };
        })
      ]);

      console.log('API Responses:', {
        following: followingRes.data,
        mutual: mutualRes.data,
        suggested: suggestedRes.data,
        requests: requestsRes.data,
        history: historyRes.data
      });

      const followingData = followingRes.data?.data || followingRes.data || [];
      const mutualData = mutualRes.data?.data || mutualRes.data || [];
      const suggestedData = suggestedRes.data?.data || suggestedRes.data || [];
      const requestsData = requestsRes.data?.data || requestsRes.data || [];
      const historyData = historyRes.data?.data || historyRes.data || [];

      setFollowing(followingData);
      setMutualConnections(mutualData);
      setSuggestedConnections(suggestedData);
      setPendingRequests(requestsData);
      setRequestHistory(historyData);
      
      // Calculate stats - Total connections = following + mutuals (unique)
      const allConnections = new Set();
      followingData.forEach(user => allConnections.add(user._id));
      mutualData.forEach(user => allConnections.add(user._id));
      
      setStats({
        totalConnections: allConnections.size,
        mutualConnections: mutualData.length || 0
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching network data:', err);
      setError('Failed to load network data');
      toast.error('Failed to load network data');
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    console.log('NetworkPage useEffect - user:', user);
    if (user?._id) {
    fetchNetworkData();
    } else {
      console.log('No user available, skipping network data fetch');
      setLoading(false);
    }
  }, [fetchNetworkData, user]);


  const handleAcceptRequest = async (connectionId) => {
    try {
      await connectionAPI.acceptRequest(connectionId);
      toast.success('Connection request accepted!');
      fetchNetworkData();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (connectionId) => {
    try {
      await connectionAPI.rejectRequest(connectionId);
      toast.success('Connection request rejected');
      fetchNetworkData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  const handleFollow = async (userId) => {
    try {
      const response = await followAPI.followUser(userId);
      toast.success(response.data.message);
      fetchNetworkData(); // Refresh all data
    } catch (error) {
      console.error('Error following user:', error);
      toast.error('Failed to follow user');
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      await followAPI.unfollowUser(userId);
      toast.success('Successfully unfollowed');
      fetchNetworkData(); // Refresh all data
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast.error('Failed to unfollow user');
    }
  };

  const handleConnect = async (userId) => {
    try {
      await connectionAPI.sendRequest(userId);
      toast.success('Connection request sent!');
      fetchNetworkData(); // Refresh all data
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error('Failed to send connection request');
    }
  };


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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Network</h1>
          <p className="mt-2 text-gray-600">Connect and grow your professional network</p>
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer"
          onClick={() => setActiveTab('following')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Connections</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.totalConnections}</h3>
            </div>
            <FaUserFriends className="text-3xl text-primary-600" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer"
          onClick={() => setActiveTab('mutual')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Mutual Connections</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.mutualConnections}</h3>
            </div>
            <FaNetworkWired className="text-3xl text-primary-600" />
          </div>
        </motion.div>
      </div>

      {/* Navigation Tabs */}
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
            Following ({stats.totalConnections})
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
            Mutual Connections ({stats.mutualConnections})
          </button>
          <button
            onClick={() => setActiveTab('suggested')}
            className={`${
              activeTab === 'suggested'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium flex items-center`}
          >
            <FaHeart className="mr-2" />
            Suggested
          </button>
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
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
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
            <FaUserTimes className="mr-2" />
            Request History
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'following' ? (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Total Connections: {stats.totalConnections}</h2>
            <p className="text-gray-600">All users you follow and mutual connections</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {following.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <FaUserFriends className="text-6xl mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-medium">Not following anyone yet</p>
                <p className="text-sm mt-2">Discover and follow people you're interested in</p>
              </div>
            ) : (
              following.map((followedUser) => (
                <motion.div
                  key={followedUser._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  onClick={() => window.location.href = `/profile/${followedUser.username || followedUser._id}`}
                >
                  <div className="flex items-center mb-4">
                    {followedUser.avatarUrl ? (
                      <img
                        src={getAvatarUrl(followedUser.avatarUrl)}
                        alt={followedUser.name || 'User'}
                        className="h-12 w-12 rounded-full object-cover border-2 border-gray-100"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {(followedUser.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {followedUser.name || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">@{followedUser.username || 'unknown'}</p>
                      <p className="text-xs text-gray-400 capitalize">{followedUser.role || 'user'}</p>
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-indigo-100 text-indigo-700 mt-1">
                        Following
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnfollow(followedUser._id);
                      }}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                    >
                      <FaUserTimes className="mr-2" />
                      Unfollow
                    </button>
                    <Link
                      to={`/profile/${followedUser.username || followedUser._id}`}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Profile
                    </Link>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'mutual' ? (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Mutual Connections: {stats.mutualConnections}</h2>
            <p className="text-gray-600">Users who follow each other (bidirectional connections)</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mutualConnections.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <FaNetworkWired className="text-6xl mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-medium">No mutual connections found</p>
                <p className="text-sm mt-2">Follow more people to discover mutual connections</p>
              </div>
            ) : (
              mutualConnections.map((connection) => (
                <motion.div
                  key={connection._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  onClick={() => window.location.href = `/profile/${connection.username || connection._id}`}
                >
                  <div className="flex items-center mb-4">
                    {connection.avatarUrl ? (
                      <img
                        src={getAvatarUrl(connection.avatarUrl)}
                        alt={connection.name || 'User'}
                        className="h-12 w-12 rounded-full object-cover border-2 border-gray-100"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {(connection.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {connection.name || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">@{connection.username || 'unknown'}</p>
                      <p className="text-xs text-gray-400 capitalize">{connection.role || 'user'}</p>
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-green-100 text-green-700 mt-1">
                        Mutual
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnect(connection._id);
                      }}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                    >
                      <FaUserPlus className="mr-2" />
                      Connect
                    </button>
                    <Link
                      to={`/profile/${connection.username || connection._id}`}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View Profile
                    </Link>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'requests' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingRequests.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <FaUserCheck className="text-6xl mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-medium">No pending requests</p>
              <p className="text-sm mt-2">You're all caught up!</p>
            </div>
          ) : (
            pendingRequests.map((request) => (
              <motion.div
                key={request._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex items-center mb-4">
                  {request.requester?.avatarUrl ? (
                    <img
                      src={getAvatarUrl(request.requester.avatarUrl)}
                      alt={request.requester?.name || 'User'}
                      className="h-12 w-12 rounded-full object-cover border-2 border-gray-100"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {(request.requester?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="ml-4 flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {request.requester?.name || 'Unknown User'}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">@{request.requester?.username || 'unknown'}</p>
                    <p className="text-xs text-gray-400 capitalize">{request.requester?.role || 'user'}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAcceptRequest(request._id)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                  >
                    <FaUserCheck className="mr-2" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request._id)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                  >
                    <FaUserMinus className="mr-2" />
                    Decline
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : activeTab === 'history' ? (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Request History</h2>
            <p className="text-gray-600">All your connection requests and their status</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requestHistory.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <FaUserTimes className="text-6xl mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-medium">No request history</p>
                <p className="text-sm mt-2">Your connection request history will appear here</p>
              </div>
            ) : (
              requestHistory.map((request) => (
                <motion.div
                  key={request._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="flex items-center mb-4">
                    {request.requesterId?.avatarUrl ? (
                      <img
                        src={getAvatarUrl(request.requesterId.avatarUrl)}
                        alt={request.requesterId?.name || 'User'}
                        className="h-12 w-12 rounded-full object-cover border-2 border-gray-100"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {(request.requesterId?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {request.requesterId?.name || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">@{request.requesterId?.username || 'unknown'}</p>
                      <p className="text-xs text-gray-400 capitalize">{request.requesterId?.role || 'user'}</p>
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] mt-1 ${
                        request.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        request.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {request.status === 'accepted' ? 'Accepted' :
                         request.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(request.createdAt)}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggestedConnections.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <FaHeart className="text-6xl mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-medium">No suggestions available</p>
              <p className="text-sm mt-2">Follow more people to get personalized suggestions</p>
            </div>
          ) : (
            suggestedConnections.map((connection) => (
              <motion.div
                key={connection._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
              >
                <div className="flex items-center mb-4">
                  {connection.avatarUrl ? (
                    <img
                      src={getAvatarUrl(connection.avatarUrl)}
                      alt={connection.name || 'User'}
                      className="h-12 w-12 rounded-full object-cover border-2 border-gray-100"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {(connection.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="ml-4 flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {connection.name || 'Unknown User'}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">@{connection.username || 'unknown'}</p>
                    <p className="text-xs text-gray-400 capitalize">{connection.role || 'user'}</p>
                    <p className="text-xs text-blue-500 mt-1">💡 Suggested for you</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                <button
                    onClick={() => handleFollow(connection._id)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                  >
                      <FaUserPlus className="mr-2" />
                    Follow
                </button>
                  <Link
                    to={`/profile/${connection.username || connection._id}`}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                  >
                    View Profile
                  </Link>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkPage;