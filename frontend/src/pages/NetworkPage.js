import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { connectionAPI } from '../components/utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import { toast } from 'react-toastify';
import NetworkGraph from '../components/network/NetworkGraph';
import { motion } from 'framer-motion';
import { FaUserPlus, FaUserMinus, FaUsers, FaUserFriends, FaNetworkWired, FaUserCheck } from 'react-icons/fa';
import { getAvatarUrl } from '../components/utils/helpers';

const NetworkPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('graph');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connections, setConnections] = useState([]);
  const [suggestedConnections, setSuggestedConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    mutualConnections: 0
  });

  const fetchNetworkData = useCallback(async () => {
    try {
      setLoading(true);
      const [connectionsRes, suggestedRes, requestsRes] = await Promise.all([
        connectionAPI.getFollowing(),
        connectionAPI.getSuggestedConnections(),
        connectionAPI.getPendingRequests()
      ]);

      setConnections(connectionsRes.data);
      setSuggestedConnections(suggestedRes.data);
      setPendingRequests(requestsRes.data);
      
      // Calculate stats
      const followers = await connectionAPI.getFollowers();
      setStats({
        followers: followers.data.length,
        following: connectionsRes.data.length,
        mutualConnections: followers.data.filter(f => 
          connectionsRes.data.some(c => c.recipientId === f.requesterId)
        ).length
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching network data:', err);
      setError('Failed to load network data');
      toast.error('Failed to load network data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetworkData();
  }, [fetchNetworkData]);

  const handleConnect = async (userId) => {
    if (!userId || userId === user._id) {
      toast.error('Invalid user or cannot connect to yourself.');
      return;
    }
    try {
      await connectionAPI.sendRequest(userId);
      toast.success('Connection request sent!');
      setSuggestedConnections(prev => 
        prev.map(user => 
          user._id === userId 
            ? { ...user, connectionStatus: 'requested' }
            : user
        )
      );
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error('Failed to send connection request');
    }
  };

  const handleAcceptRequest = async (connectionId) => {
    try {
      await connectionAPI.acceptFollowRequest(connectionId);
      toast.success('Connection request accepted!');
      fetchNetworkData();
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (connectionId) => {
    try {
      await connectionAPI.rejectFollowRequest(connectionId);
      toast.success('Connection request rejected');
      fetchNetworkData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      await connectionAPI.unfollowUser(userId);
      toast.success('Successfully unfollowed');
      fetchNetworkData();
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast.error('Failed to unfollow user');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center mt-8">
        {error}
        <button
          onClick={fetchNetworkData}
          className="mt-4 btn btn-primary"
        >
          Retry
        </button>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Followers</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.followers}</h3>
            </div>
            <FaUsers className="text-3xl text-primary-600" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Following</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.following}</h3>
            </div>
            <FaUserFriends className="text-3xl text-primary-600" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-lg shadow-md p-6"
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
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('graph')}
            className={`${
              activeTab === 'graph'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium`}
          >
            Network Graph
          </button>
          <button
            onClick={() => setActiveTab('suggested')}
            className={`${
              activeTab === 'suggested'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium`}
          >
            Suggested
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`${
              activeTab === 'requests'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium relative`}
          >
            Requests
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'graph' ? (
        <NetworkGraph connections={connections} currentUser={user} />
      ) : activeTab === 'requests' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingRequests.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No pending connection requests
            </div>
          ) : (
            pendingRequests.map((request) => (
              <motion.div
                key={request._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-center mb-4">
                  {request.requester.avatarUrl ? (
                    <img
                      src={getAvatarUrl(request.requester.avatarUrl)}
                      alt={request.requester.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                      {request.requester.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {request.requester.name}
                    </h3>
                    <p className="text-sm text-gray-500">@{request.requester.username}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAcceptRequest(request._id)}
                    className="btn btn-primary flex-1"
                  >
                    <FaUserCheck className="mr-2" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectRequest(request._id)}
                    className="btn btn-secondary flex-1"
                  >
                    <FaUserMinus className="mr-2" />
                    Delete
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggestedConnections.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No suggested connections available
            </div>
          ) : (
            suggestedConnections.map((connection) => (
              <motion.div
                key={connection._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-center mb-4">
                  {connection.avatarUrl ? (
                    <img
                      src={getAvatarUrl(connection.avatarUrl)}
                      alt={connection.name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                      {connection.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {connection.name}
                    </h3>
                    <p className="text-sm text-gray-500">@{connection.username}</p>
                    <p className="text-sm text-gray-500 capitalize">{connection.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleConnect(connection._id)}
                  className={`btn w-full ${
                    connection.connectionStatus === 'requested'
                      ? 'btn-secondary'
                      : 'btn-primary'
                  }`}
                  disabled={connection.connectionStatus === 'requested'}
                >
                  {connection.connectionStatus === 'requested' ? (
                    <>
                      <FaUserCheck className="mr-2" />
                      Request Sent
                    </>
                  ) : (
                    <>
                      <FaUserPlus className="mr-2" />
                      Connect
                    </>
                  )}
                </button>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkPage;