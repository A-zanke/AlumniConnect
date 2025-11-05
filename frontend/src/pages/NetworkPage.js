import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  connectionAPI,
  followAPI,
  userAPI,
  recommendationsAPI,
} from "../components/utils/api";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/ui/Spinner";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUserPlus,
  FaUserMinus,
  FaUsers,
  FaUserFriends,
  FaNetworkWired,
  FaUserCheck,
  FaHeart,
  FaUserTimes,
} from "react-icons/fa";
import { getAvatarUrl } from "../components/utils/helpers";

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const NetworkPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("following");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [following, setFollowing] = useState([]);
  const [connections, setConnections] = useState([]); // All connections from profile
  const [mutualConnections, setMutualConnections] = useState([]);
  // Suggested tab removed per request
  const [pendingRequests, setPendingRequests] = useState([]);
  // Request history is now shown inside Requests tab for 24h only
  const [requestHistory, setRequestHistory] = useState([]);
  // AI Alumni Recommendations (student-only)
  const [recLoading, setRecLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [matchFilter, setMatchFilter] = useState(70); // Minimum match percentage filter
  const [connectionHistory, setConnectionHistory] = useState([]); // Track connected alumni
  const [aiSubTab, setAiSubTab] = useState('recommendations'); // 'recommendations' or 'history'
  const [stats, setStats] = useState({
    totalConnections: 0,
    mutualConnections: 0,
  });

  const fetchNetworkData = useCallback(async () => {
    try {
      setLoading(true);
      if (!user?._id) {
        console.log("No user ID available");
        return;
      }

      console.log("Fetching network data for user:", user._id);

      const [followingRes, connectionsRes, mutualRes, requestsRes, historyRes] =
        await Promise.all([
          followAPI.getFollowing(user._id).catch((err) => {
            console.error("Error fetching following:", err);
            return { data: [] };
          }),
          connectionAPI.getConnections().catch((err) => {
            console.error("Error fetching connections:", err);
            return { data: [] };
          }),
          followAPI.getMyMutualConnections().catch((err) => {
            console.error("Error fetching mutual connections:", err);
            return { data: [] };
          }),
          connectionAPI.getPendingRequests().catch((err) => {
            console.error("Error fetching pending requests:", err);
            return { data: [] };
          }),
          connectionAPI.getRequestHistory().catch((err) => {
            console.error("Error fetching request history:", err);
            return { data: [] };
          }),
        ]);

      console.log("API Responses:", {
        following: followingRes.data,
        connections: connectionsRes.data,
        mutual: mutualRes.data,
        requests: requestsRes.data,
        history: historyRes.data,
      });

      const followingData = followingRes.data?.data || followingRes.data || [];
      const connectionsData = connectionsRes.data?.data || connectionsRes.data || [];
      const mutualData = mutualRes.data?.data || mutualRes.data || [];
      const requestsData = requestsRes.data?.data || requestsRes.data || [];
      // Filter history to only last 24 hours since resolution
      const rawHistory = historyRes.data?.data || historyRes.data || [];
      const now = Date.now();
      const historyData = rawHistory.filter((item) => {
        const t = new Date(item.createdAt).getTime();
        return Number.isFinite(t) && now - t <= 24 * 60 * 60 * 1000; // 24h
      });

      // Combine following and connections, remove duplicates
      const allConnectedUsers = [...followingData];
      connectionsData.forEach(conn => {
        if (!allConnectedUsers.some(u => u._id === conn._id)) {
          allConnectedUsers.push(conn);
        }
      });
      
      setFollowing(Array.isArray(allConnectedUsers) ? allConnectedUsers : []);
      setConnections(Array.isArray(connectionsData) ? connectionsData : []);
      setMutualConnections(mutualData);
      setPendingRequests(requestsData);
      setRequestHistory(historyData);

      // Calculate stats
      setStats({
        totalConnections: allConnectedUsers.length || 0,
        mutualConnections: mutualData.length || 0,
        followingCount: allConnectedUsers.length || 0,
      });

      setError(null);
    } catch (err) {
      console.error("Error fetching network data:", err);
      setError("Failed to load network data");
      toast.error("Failed to load network data");
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    console.log("NetworkPage useEffect - user:", user);
    if (user?._id) {
      fetchNetworkData();
    } else {
      console.log("No user available, skipping network data fetch");
      setLoading(false);
    }
  }, [fetchNetworkData, user]);

  // Fetch AI alumni recommendations for students only
  useEffect(() => {
    const isStudent = String(user?.role || "").toLowerCase() === "student";
    if (!user?._id || !isStudent) {
      console.log("Not fetching recommendations - user role:", user?.role);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        console.log("Fetching alumni recommendations for user:", user._id);
        setRecLoading(true);
        const res = await recommendationsAPI.getAlumni(user._id);
        console.log("Recommendations response:", res.data);
        if (mounted) {
          const recs = Array.isArray(res.data) ? res.data : [];
          console.log("Setting recommendations:", recs.length, "alumni");
          setRecommendations(recs);
        }
      } catch (e) {
        console.error("Recommendations fetch error:", e);
        toast.error("Failed to load alumni recommendations");
      } finally {
        if (mounted) setRecLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?._id, user?.role]);

  // Load connection history from localStorage
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('alumniConnectionHistory') || '[]');
    setConnectionHistory(history);
  }, []);

  const handleAcceptRequest = async (connectionId) => {
    try {
      await connectionAPI.acceptRequest(connectionId);
      toast.success("Connection request accepted!");
      // Keep a 24h history entry locally
      setRequestHistory((prev) => [
        {
          _id: connectionId,
          status: "accepted",
          createdAt: new Date().toISOString(),
          requesterId: pendingRequests.find((r) => r._id === connectionId)
            ?.requester,
        },
        ...prev,
      ]);
      // Remove from pending immediately
      setPendingRequests((prev) => prev.filter((r) => r._id !== connectionId));
      // Also refresh following/mutual counts
      fetchNetworkData();
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Failed to accept request");
    }
  };

  const handleRejectRequest = async (connectionId) => {
    try {
      await connectionAPI.rejectRequest(connectionId);
      toast.success("Connection request rejected");
      setRequestHistory((prev) => [
        {
          _id: connectionId,
          status: "rejected",
          createdAt: new Date().toISOString(),
          requesterId: pendingRequests.find((r) => r._id === connectionId)
            ?.requester,
        },
        ...prev,
      ]);
      setPendingRequests((prev) => prev.filter((r) => r._id !== connectionId));
      fetchNetworkData();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    }
  };

  const handleFollow = async (userId) => {
    try {
      const response = await followAPI.followUser(userId);
      toast.success(response.data.message);
      fetchNetworkData(); // Refresh all data
    } catch (error) {
      console.error("Error following user:", error);
      toast.error("Failed to follow user");
    }
  };

  const handleUnfollow = async (userId) => {
    try {
      await followAPI.unfollowUser(userId);
      toast.success("Successfully unfollowed");
      // Refresh all network data to ensure consistency
      await fetchNetworkData();
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast.error("Failed to unfollow user");
    }
  };

  const handleConnect = async (userId, alumniData = null) => {
    try {
      await connectionAPI.sendRequest(userId);
      toast.success("Connection request sent!");
      
      // If connecting from alumni recommendations, add to history
      if (alumniData) {
        const historyEntry = {
          ...alumniData,
          connectedAt: new Date().toISOString(),
          status: 'requested'
        };
        
        // Save to localStorage
        const existingHistory = JSON.parse(localStorage.getItem('alumniConnectionHistory') || '[]');
        const updatedHistory = [historyEntry, ...existingHistory].slice(0, 50); // Keep last 50
        localStorage.setItem('alumniConnectionHistory', JSON.stringify(updatedHistory));
        setConnectionHistory(updatedHistory);
      }
      
      // Update local state to show "Requested" status
      setMutualConnections((prev) =>
        prev.map((user) =>
          user._id === userId
            ? { ...user, connectionStatus: "requested" }
            : user
        )
      );
      setRecommendations((prev) =>
        prev.map((user) =>
          user._id === userId
            ? { ...user, connectionStatus: "requested" }
            : user
        )
      );
    } catch (error) {
      console.error("Error sending connection request:", error);
      toast.error("Failed to send connection request");
    }
  };

  // Helper function to check if user is mutual
  const isMutual = (userId) => {
    return mutualConnections.some((mutual) => mutual._id === userId);
  };

  // Helper function to check if user has pending request
  const hasPendingRequest = (userId) => {
    return pendingRequests.some((request) => request.requester?._id === userId);
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Please log in
          </h2>
          <p className="text-gray-600">
            You need to be logged in to view your network.
          </p>
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
          <h3 className="text-lg font-medium text-red-800 mb-2">
            Error Loading Network
          </h3>
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
          <p className="mt-2 text-gray-600">
            Connect and grow your professional network
          </p>
        </div>
      </div>

      {/* Mobile Quick Access Blocks - Only visible on mobile */}
      <div className="md:hidden mb-8">
        <div className="grid grid-cols-2 gap-4">
          {/* Following Block */}
          <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab("following")}
            className={`bg-gradient-to-br ${
              activeTab === "following"
                ? "from-blue-500 to-blue-600 text-white"
                : "from-white to-gray-50 text-gray-800"
            } rounded-2xl shadow-lg p-6 cursor-pointer border-2 ${
              activeTab === "following" ? "border-blue-300" : "border-gray-200"
            } transition-all`}
          >
            <div className="flex flex-col items-center">
              <FaUserFriends className="text-3xl mb-3" />
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">
                Following
              </p>
              <h3 className="text-2xl font-bold">
                {stats.followingCount || stats.totalConnections}
              </h3>
            </div>
          </motion.div>

          {/* Mutual Connections Block */}
          <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab("mutual")}
            className={`bg-gradient-to-br ${
              activeTab === "mutual"
                ? "from-green-500 to-green-600 text-white"
                : "from-white to-gray-50 text-gray-800"
            } rounded-2xl shadow-lg p-6 cursor-pointer border-2 ${
              activeTab === "mutual" ? "border-green-300" : "border-gray-200"
            } transition-all`}
          >
            <div className="flex flex-col items-center">
              <FaNetworkWired className="text-3xl mb-3" />
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">
                Mutual
              </p>
              <h3 className="text-2xl font-bold">
                {stats.mutualConnections}
              </h3>
            </div>
          </motion.div>

          {/* Requests Block */}
          <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab("requests")}
            className={`bg-gradient-to-br ${
              activeTab === "requests"
                ? "from-orange-500 to-orange-600 text-white"
                : "from-white to-gray-50 text-gray-800"
            } rounded-2xl shadow-lg p-6 cursor-pointer border-2 ${
              activeTab === "requests" ? "border-orange-300" : "border-gray-200"
            } transition-all relative`}
          >
            <div className="flex flex-col items-center">
              <FaUserCheck className="text-3xl mb-3" />
              <p className="text-xs font-semibold uppercase tracking-wide mb-1">
                Requests
              </p>
              <h3 className="text-2xl font-bold">
                {pendingRequests.length}
              </h3>
              {pendingRequests.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                  {pendingRequests.length}
                </span>
              )}
            </div>
          </motion.div>

          {/* AI Alumni Block - Only for Students */}
          {String(user?.role || '').toLowerCase() === 'student' && (
            <motion.div
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab('ai')}
              className={`bg-gradient-to-br ${
                activeTab === 'ai'
                  ? "from-purple-500 to-purple-600 text-white"
                  : "from-white to-gray-50 text-gray-800"
              } rounded-2xl shadow-lg p-6 cursor-pointer border-2 ${
                activeTab === 'ai' ? "border-purple-300" : "border-gray-200"
              } transition-all`}
            >
              <div className="flex flex-col items-center">
                <span className="text-3xl mb-3">🧠</span>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1">
                  AI Alumni
                </p>
                <h3 className="text-2xl font-bold">
                  {recommendations.filter(r => Math.round(r.matchScore || 60) >= matchFilter).length}
                </h3>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Desktop Network Stats - Hidden on mobile */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer"
          onClick={() => setActiveTab("following")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Following</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {stats.followingCount || stats.totalConnections}
              </h3>
            </div>
            <FaUserFriends className="text-3xl text-primary-600" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer"
          onClick={() => setActiveTab("mutual")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Mutual Connections</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {stats.mutualConnections}
              </h3>
            </div>
            <FaNetworkWired className="text-3xl text-primary-600" />
          </div>
        </motion.div>
      </div>

      {/* Navigation Tabs - Hidden on mobile, visible on desktop */}
      <div className="border-b border-gray-200 mb-8 hidden md:block">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("following")}
            className={`${
              activeTab === "following"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium flex items-center`}
          >
            <FaUserFriends className="mr-2" />
            Following ({stats.followingCount || stats.totalConnections})
          </button>
          <button
            onClick={() => setActiveTab("mutual")}
            className={`${
              activeTab === "mutual"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap pb-4 px-1 border-b-2 font-medium flex items-center`}
          >
            <FaNetworkWired className="mr-2" />
            Mutual Connections ({stats.mutualConnections})
          </button>
          {/* Suggested tab removed */}
          <button
            onClick={() => setActiveTab("requests")}
            className={`${
              activeTab === "requests"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
          {String(user?.role || '').toLowerCase() === 'student' && (
            <button
              onClick={() => setActiveTab('ai')}
              className={`$
                {activeTab === 'ai'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap pb-4 px-1 border-b-2 font-medium flex items-center`}
            >
              🧠 AI Alumni
            </button>
          )}
          {/* Request History tab removed */}
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === "following" ? (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Total Connections:{" "}
              {stats.followingCount || stats.totalConnections}
            </h2>
            <p className="text-gray-600">All users you follow</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {following.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <FaUserFriends className="text-6xl mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-medium">Not following anyone yet</p>
                <p className="text-sm mt-2">
                  Discover and follow people you're interested in
                </p>
              </div>
            ) : (
              following.map((followedUser) => (
                <motion.div
                  key={followedUser._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  onClick={() =>
                    (window.location.href = `/profile/${
                      followedUser.username || followedUser._id
                    }`)
                  }
                >
                  <div className="flex items-center mb-4">
                    <img
                      src={followedUser.avatarUrl ? getAvatarUrl(followedUser.avatarUrl) : "/default-avatar.png"}
                      alt={followedUser.name || "User"}
                      className="h-12 w-12 rounded-full object-cover border-2 border-gray-100"
                    />
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {followedUser.name || "Unknown User"}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        @{followedUser.username || "unknown"}
                      </p>
                      <p className="text-xs text-blue-600 font-medium">
                        @{(followedUser.role || "user").toLowerCase()}
                      </p>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] mt-1 ${
                          isMutual(followedUser._id)
                            ? "bg-green-100 text-green-700"
                            : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {isMutual(followedUser._id) ? "Mutual" : "Following"}
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
                      to={`/profile/${
                        followedUser.username || followedUser._id
                      }`}
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
      ) : activeTab === "mutual" ? (
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Mutual Connections: {stats.mutualConnections}
            </h2>
            <p className="text-gray-600">
              Users who follow each other (bidirectional connections)
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mutualConnections.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <FaNetworkWired className="text-6xl mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-medium">
                  No mutual connections found
                </p>
                <p className="text-sm mt-2">
                  Follow more people to discover mutual connections
                </p>
              </div>
            ) : (
              mutualConnections.map((connection) => (
                <motion.div
                  key={connection._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                  onClick={() =>
                    (window.location.href = `/profile/${
                      connection.username || connection._id
                    }`)
                  }
                >
                  <div className="flex items-center mb-4">
                    <img
                      src={connection.avatarUrl ? getAvatarUrl(connection.avatarUrl) : "/default-avatar.png"}
                      alt={connection.name || "User"}
                      className="h-12 w-12 rounded-full object-cover border-2 border-gray-100"
                    />
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {connection.name || "Unknown User"}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        @{connection.username || "unknown"}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">
                        {connection.role || "user"}
                      </p>
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-green-100 text-green-700 mt-1">
                        Mutual
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const isAlreadyConnected = connections.some(c => c._id === connection._id);
                        const isRequestPending = hasPendingRequest(connection._id) || connection.connectionStatus === 'requested';
                        if (!isAlreadyConnected && !isRequestPending) {
                          handleConnect(connection._id);
                        }
                      }}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${
                        connections.some(c => c._id === connection._id)
                          ? 'bg-green-500 text-white cursor-default'
                          : (hasPendingRequest(connection._id) || connection.connectionStatus === 'requested')
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                      disabled={connections.some(c => c._id === connection._id) || hasPendingRequest(connection._id) || connection.connectionStatus === 'requested'}
                    >
                      {connections.some(c => c._id === connection._id)
                        ? (<><FaUserCheck /> Connected</>)
                        : (hasPendingRequest(connection._id) || connection.connectionStatus === 'requested')
                          ? (<><FaUserPlus /> Requested</>)
                          : (<><FaUserPlus /> Connect</>)}
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === "requests" ? (
        <div className="space-y-8">
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
                    <img
                      src={request.requester?.avatarUrl ? getAvatarUrl(request.requester.avatarUrl) : "/default-avatar.png"}
                      alt={request.requester?.name || "User"}
                      className="h-12 w-12 rounded-full object-cover border-2 border-gray-100"
                    />
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {request.requester?.name || "Unknown User"}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        @{request.requester?.username || "unknown"}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">
                        {request.requester?.role || "user"}
                      </p>
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

          {/* Resolved in last 24 hours */}
          {requestHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Recent activity (last 24 hours)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requestHistory.map((item) => {
                  const actor = item.requester || item.requesterId || {};
                  const name = actor.name || "User";
                  const username = actor.username || "unknown";
                  const avatar = actor.avatarUrl;
                  const isAccepted = item.status === "accepted";
                  return (
                    <motion.div
                      key={item._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl shadow-md p-4 border cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => {
                        if (actor._id || actor.username) {
                          window.location.href = `/profile/${actor.username || actor._id}`;
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src="/default-avatar.png"
                          alt={name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            @{username}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            isAccepted
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {isAccepted ? "Accepted" : "Rejected"}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* AI Alumni Recommendations - student only under tab */}
      {String(user?.role || "").toLowerCase() === "student" && activeTab === 'ai' && (
        <div className="mt-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              🎯 AI-Powered Alumni Matches
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Discover alumni who share your interests, skills, and career aspirations
            </p>
          </div>

          {/* Match Filter Slider */}
          <div className="max-w-4xl mx-auto mb-10 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-8 shadow-lg border-2 border-cyan-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="text-2xl">🎚️</span>
                  Match Filter
                </h3>
                <p className="text-sm text-gray-600 mt-1">Show alumni with at least <span className="font-bold text-cyan-600">{matchFilter}%</span> match</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  {matchFilter}%
                </div>
                <p className="text-xs text-gray-500">Minimum Match</p>
              </div>
            </div>
            <input
              type="range"
              min="70"
              max="100"
              step="5"
              value={matchFilter}
              onChange={(e) => setMatchFilter(parseInt(e.target.value))}
              className="w-full h-3 bg-gradient-to-r from-cyan-200 to-blue-200 rounded-full appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, #06b6d4 ${(matchFilter-70)/30*100}%, #e0f2fe ${(matchFilter-70)/30*100}%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
              <span>70%</span>
              <span>80%</span>
              <span>90%</span>
              <span>95%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Sub-tabs for Recommendations and History */}
          <div className="flex gap-4 mb-8 border-b-2 border-gray-200">
            <button
              onClick={() => setAiSubTab('recommendations')}
              className={`pb-3 px-4 font-semibold ${aiSubTab === 'recommendations' ? 'text-cyan-600 border-b-4 border-cyan-600' : 'text-gray-500 hover:text-cyan-600 border-b-4 border-transparent hover:border-cyan-300'} transition-colors`}
            >
              🎯 Recommendations ({recommendations.filter(r => Math.round(r.matchScore || 60) >= matchFilter).length})
            </button>
            <button
              onClick={() => setAiSubTab('history')}
              className={`pb-3 px-4 font-semibold ${aiSubTab === 'history' ? 'text-cyan-600 border-b-4 border-cyan-600' : 'text-gray-500 hover:text-cyan-600 border-b-4 border-transparent hover:border-cyan-300'} transition-colors`}
            >
              📜 Connection History ({connectionHistory.length})
            </button>
          </div>
          
          {/* Recommendations Tab Content */}
          {aiSubTab === 'recommendations' && (recLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl">🧠</span>
                </div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Finding your perfect matches...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-3xl shadow-lg border-2 border-dashed border-cyan-200">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Complete Your Profile</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                To get personalized alumni recommendations, please add your skills, career interests, or department to your profile.
              </p>
              <Link
                to="/profile/edit"
                className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
              >
                Complete Profile →
              </Link>
            </div>
          ) : (
            <>
              {(() => {
                const filteredRecs = recommendations.filter(alum => {
                  const matchPercent = Math.round(alum.matchScore || 60);
                  return matchPercent >= matchFilter;
                });
                
                if (filteredRecs.length === 0) {
                  // Check if there are ANY recommendations at all
                  const hasAnyRecs = recommendations.length > 0;
                  
                  return (
                    <div className="text-center py-16 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-3xl shadow-lg border-2 border-dashed border-orange-200">
                      <div className="text-6xl mb-4">{hasAnyRecs ? '🎚️' : '🔍'}</div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">
                        {hasAnyRecs ? `No Matches at ${matchFilter}%` : 'No Matching Alumni Found'}
                      </h3>
                      <p className="text-gray-600 max-w-md mx-auto mb-4">
                        {hasAnyRecs 
                          ? 'Try lowering the match filter to see more alumni recommendations!' 
                          : 'We couldn\'t find any alumni that match your profile based on skills, department, interests, or industry. This could mean:'
                        }
                      </p>
                      {!hasAnyRecs && (
                        <ul className="text-left text-gray-600 max-w-md mx-auto mb-6 space-y-2">
                          <li>• No alumni have similar profiles yet</li>
                          <li>• Alumni haven't completed their profiles</li>
                          <li>• Your profile needs more details for better matching</li>
                        </ul>
                      )}
                      <div className="flex gap-3 justify-center">
                        {hasAnyRecs && (
                          <button
                            onClick={() => setMatchFilter(70)}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                          >
                            Reset to 70%
                          </button>
                        )}
                        <Link
                          to="/profile/edit"
                          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                        >
                          Update Profile
                        </Link>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredRecs.map((alum, idx) => {
                // Use actual match score from backend
                const matchScore = alum.matchScore || 0;
                const matchPercent = Math.round(matchScore);
                const matchColor = matchPercent >= 80 ? 'from-green-500 to-emerald-600' : 
                                  matchPercent >= 70 ? 'from-blue-500 to-cyan-600' : 
                                  'from-cyan-500 to-teal-600';
                
                // Check if this alumni is already connected (check both following and connections)
                const isConnected = following.some(f => f._id === alum._id) || 
                                   connections.some(c => c._id === alum._id);
                
                return (
                  <motion.div
                    key={alum._id || idx}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
                    whileHover={{ scale: 1.03, y: -5 }}
                    className="relative bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-xl hover:shadow-2xl border-2 border-transparent hover:border-cyan-300 transition-all p-6 cursor-pointer overflow-hidden group"
                    onClick={() => (window.location.href = `/profile/${alum.username || alum._id}`)}
                  >
                    {/* Match Badge */}
                    <div className="absolute top-4 right-4 z-10">
                      <div className={`bg-gradient-to-r ${matchColor} text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-bold text-sm`}>
                        <span className="text-lg">✨</span>
                        {matchPercent}% Match
                      </div>
                    </div>

                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/20 to-blue-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    {/* Content */}
                    <div className="relative z-10">
                      {/* Avatar Section */}
                      <div className="flex flex-col items-center mb-6 mt-8">
                        <div className="relative">
                          <img
                            src={alum.avatarUrl ? getAvatarUrl(alum.avatarUrl) : "/default-avatar.png"}
                            alt={alum.name}
                            className="h-24 w-24 rounded-full object-cover ring-4 ring-cyan-200 shadow-xl"
                          />
                          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full p-2 shadow-lg">
                            <FaUserCheck className="text-sm" />
                          </div>
                        </div>
                        <h3 className="font-bold text-xl text-gray-900 mt-4 text-center">
                          {alum.name}
                        </h3>
                        <p className="text-sm text-gray-600 text-center">
                          {alum.department || "Department"} • {alum.graduationYear || "—"}
                        </p>
                        {alum.company && (
                          <div className="mt-2 px-3 py-1 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-full">
                            <p className="text-xs font-semibold text-gray-700">
                              🏢 {alum.company}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Skills */}
                      {Array.isArray(alum.skills) && alum.skills.length > 0 && (
                        <div className="mb-6">
                          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                            Top Skills
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {alum.skills.slice(0, 4).map((s, i) => (
                              <span
                                key={`${s}-${i}`}
                                className="px-3 py-1.5 bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-700 rounded-full text-xs font-semibold shadow-sm hover:shadow-md transition-shadow"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          className={`flex-1 px-4 py-3 ${
                            isConnected ? 'bg-green-500 cursor-default' : 
                            alum.connectionStatus === 'requested' ? 'bg-gray-400 cursor-not-allowed' : 
                            'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700'
                          } text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isConnected && alum.connectionStatus !== 'requested') {
                              handleConnect(alum._id, { ...alum, matchPercent });
                            }
                          }}
                          disabled={isConnected || alum.connectionStatus === 'requested'}
                        >
                          {isConnected ? <><FaUserCheck /> Connected</> : 
                           alum.connectionStatus === 'requested' ? <><FaUserPlus /> Requested</> : 
                           <><FaUserPlus /> Connect</>}
                        </button>
                        <Link
                          to={`/profile/${alum.username || alum._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg border-2 border-gray-200 hover:border-cyan-300 flex items-center justify-center"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
                      })}
                    </div>
                  );
              })()}
            </>
          ))}

          {/* History Tab Content */}
          {aiSubTab === 'history' && (
            <div>
              {connectionHistory.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-3xl shadow-lg border-2 border-dashed border-cyan-200">
                  <div className="text-6xl mb-4">📜</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">No Connection History Yet</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Start connecting with alumni from recommendations to build your history!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {connectionHistory.map((entry, idx) => {
                    const matchPercent = Math.round(entry.matchPercent || entry.matchScore || 60);
                    const matchColor = matchPercent >= 80 ? 'from-green-500 to-emerald-600' : 
                                      matchPercent >= 70 ? 'from-blue-500 to-cyan-600' : 
                                      'from-purple-500 to-pink-600';
                    
                    return (
                      <motion.div
                        key={entry._id || idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white rounded-2xl shadow-lg hover:shadow-xl border-2 border-gray-100 p-6 cursor-pointer transition-all"
                        onClick={() => (window.location.href = `/profile/${entry.username || entry._id}`)}
                      >
                        {/* Match Badge */}
                        <div className="flex justify-between items-start mb-4">
                          <div className={`bg-gradient-to-r ${matchColor} text-white px-3 py-1 rounded-full shadow-md text-xs font-bold`}>
                            ✨ {matchPercent}% Match
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(entry.connectedAt).toLocaleDateString()}
                          </div>
                        </div>

                        {/* Avatar and Info */}
                        <div className="flex items-center gap-4 mb-4">
                          <img
                            src={entry.avatarUrl ? getAvatarUrl(entry.avatarUrl) : "/default-avatar.png"}
                            alt={entry.name}
                            className="h-16 w-16 rounded-full object-cover ring-2 ring-cyan-200"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-gray-900 truncate">
                              {entry.name}
                            </h3>
                            <p className="text-sm text-gray-600 truncate">
                              {entry.department || "Department"}
                            </p>
                            {entry.company && (
                              <p className="text-xs text-gray-500 truncate">
                                🏢 {entry.company}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center justify-between">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            connections.some(c => c._id === entry._id) || following.some(f => f._id === entry._id) ? 'bg-green-100 text-green-700' :
                            entry.status === 'requested' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {connections.some(c => c._id === entry._id) || following.some(f => f._id === entry._id) ? '✅ Connected' :
                             entry.status === 'requested' ? '⏳ Pending' : '📤 Sent'}
                          </span>
                          <Link
                            to={`/profile/${entry.username || entry._id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-cyan-600 hover:text-cyan-700 text-sm font-semibold"
                          >
                            View Profile →
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkPage;
