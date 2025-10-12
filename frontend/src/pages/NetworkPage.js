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
  const [mutualConnections, setMutualConnections] = useState([]);
  // Suggested tab removed per request
  const [pendingRequests, setPendingRequests] = useState([]);
  // Request history is now shown inside Requests tab for 24h only
  const [requestHistory, setRequestHistory] = useState([]);
  // AI Alumni Recommendations (student-only)
  const [recLoading, setRecLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
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

      const [followingRes, mutualRes, requestsRes, historyRes] =
        await Promise.all([
          followAPI.getFollowing(user._id).catch((err) => {
            console.error("Error fetching following:", err);
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
        mutual: mutualRes.data,
        requests: requestsRes.data,
        history: historyRes.data,
      });

      const followingData = followingRes.data?.data || followingRes.data || [];
      const mutualData = mutualRes.data?.data || mutualRes.data || [];
      const requestsData = requestsRes.data?.data || requestsRes.data || [];
      // Filter history to only last 24 hours since resolution
      const rawHistory = historyRes.data?.data || historyRes.data || [];
      const now = Date.now();
      const historyData = rawHistory.filter((item) => {
        const t = new Date(item.createdAt).getTime();
        return Number.isFinite(t) && now - t <= 24 * 60 * 60 * 1000; // 24h
      });

      setFollowing(followingData);
      setMutualConnections(mutualData);
      setPendingRequests(requestsData);
      setRequestHistory(historyData);

      // Calculate stats
      setStats({
        totalConnections: followingData.length || 0, // for Following tab display only
        mutualConnections: mutualData.length || 0,
        followingCount: followingData.length || 0,
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
    if (!user?._id || !isStudent) return;
    let mounted = true;
    (async () => {
      try {
        setRecLoading(true);
        const res = await recommendationsAPI.getAlumni(user._id);
        if (mounted) setRecommendations(res.data || []);
      } catch (e) {
        console.error("Recommendations fetch error", e);
      } finally {
        if (mounted) setRecLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?._id, user?.role]);

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
      // Optimistically update UI counts and list
      setFollowing((prev) => prev.filter((u) => u._id !== userId));
      setStats((prev) => ({
        ...prev,
        followingCount: Math.max((prev.followingCount || 0) - 1, 0),
        totalConnections: Math.max((prev.totalConnections || 0) - 1, 0),
      }));
    } catch (error) {
      console.error("Error unfollowing user:", error);
      toast.error("Failed to unfollow user");
    }
  };

  const handleConnect = async (userId) => {
    try {
      await connectionAPI.sendRequest(userId);
      toast.success("Connection request sent!");
      // Update local state to show "Requested" status
      setMutualConnections((prev) =>
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

      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
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
                    {followedUser.avatarUrl ? (
                      <img
                        src={getAvatarUrl(followedUser.avatarUrl)}
                        alt={followedUser.name || "User"}
                        className="h-12 w-12 rounded-full object-cover border-2 border-gray-100"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {(followedUser.name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="ml-4 flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {followedUser.name || "Unknown User"}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        @{followedUser.username || "unknown"}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">
                        {followedUser.role || "user"}
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
                    {connection.avatarUrl ? (
                      <img
                        src={getAvatarUrl(connection.avatarUrl)}
                        alt={connection.name || "User"}
                        className="h-12 w-12 rounded-full object-cover border-2 border-gray-100"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {(connection.name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
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
                        handleUnfollow(connection._id);
                      }}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                    >
                      <FaUserTimes className="mr-2" />
                      Unfollow
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
                    {request.requester?.avatarUrl ? (
                      <img
                        src={getAvatarUrl(request.requester.avatarUrl)}
                        alt={request.requester?.name || "User"}
                        className="h-12 w-12 rounded-full object-cover border-2 border-gray-100"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {(request.requester?.name || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
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
                      className="bg-white rounded-xl shadow-md p-4 border"
                    >
                      <div className="flex items-center gap-3">
                        {avatar ? (
                          <img
                            src={getAvatarUrl(avatar)}
                            alt={name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
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
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            🧠 AI Alumni Recommendations
          </h2>
          <p className="text-gray-600 mb-6">
            Discover alumni profiles most relevant to your skills, department,
            and career interests.
          </p>
          {recLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-12 text-gray-600 bg-white rounded-2xl shadow-md">
              No suitable alumni recommendations yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((alum, idx) => (
                <motion.div
                  key={alum._id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-transparent hover:border-indigo-200 transition-all p-6 cursor-pointer hover:-translate-y-1"
                  onClick={() =>
                    (window.location.href = `/profile/${
                      alum.username || alum._id
                    }`)
                  }
                >
                  <div className="flex items-center gap-4 mb-4">
                    {alum.avatarUrl ? (
                      <img
                        src={getAvatarUrl(alum.avatarUrl)}
                        alt={alum.name}
                        className="h-16 w-16 rounded-full object-cover ring-2 ring-indigo-100"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                        {(alum.name || "A").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-lg text-gray-900 truncate">
                        {alum.name}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {alum.department || "Department"} •{" "}
                        {alum.graduationYear || "—"}
                      </div>
                      {alum.company && (
                        <div className="text-sm text-gray-500 truncate">
                          {alum.company}
                        </div>
                      )}
                    </div>
                  </div>
                  {Array.isArray(alum.skills) && alum.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {alum.skills.slice(0, 5).map((s, i) => (
                        <span
                          key={`${s}-${i}`}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium shadow-sm"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnect(alum._id);
                      }}
                    >
                      Connect
                    </button>
                    <Link
                      to={`/profile/${alum.username || alum._id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium transition-all shadow-sm"
                    >
                      View Profile
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkPage;
