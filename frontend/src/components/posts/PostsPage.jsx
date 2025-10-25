import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiRss,
  FiBookmark,
  FiPlus,
  FiFilter,
  FiRefreshCw,
} from "react-icons/fi";
import axios from "axios";
import { toast } from "react-hot-toast";

import PostCard from "./PostCard";
import CreatePost from "./CreatePost";
import { useAuth } from "../../context/AuthContext";
import "../../styles/PostsPage.css";

const PostsPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [view, setView] = useState("feed"); // 'feed' or 'saved'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const canCreatePost =
    user && ["alumni", "teacher", "admin"].includes(user.role);

  const fetchPosts = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const url = view === "saved" ? "/api/posts/saved" : "/api/posts";
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setPosts(response.data);
      } catch (error) {
        toast.error("Failed to load posts. Please try again.");
        console.error("Fetch posts error:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [view]
  );

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
    setShowComposer(false);
    setView("feed");
    toast.success("Post created successfully!");
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    );
  };

  const handlePostDelete = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  const handleRefresh = () => {
    fetchPosts(true);
  };

  return (
    <div className="posts-page-container">
      <AnimatePresence>
        {showComposer && (
          <CreatePost
            onClose={() => setShowComposer(false)}
            onPostCreated={handlePostCreated}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="posts-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="posts-title">Community Feed</h1>
            <p className="posts-subtitle">
              {user?.role === "student"
                ? `Discover posts from ${user.department} department`
                : "Share knowledge and connect with your community"}
            </p>
          </div>

          <div className="header-actions">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="refresh-btn"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <FiRefreshCw className={refreshing ? "spinning" : ""} />
            </motion.button>

            {canCreatePost && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="create-post-btn"
                onClick={() => setShowComposer(true)}
              >
                <FiPlus />
                Create Post
              </motion.button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="posts-nav">
        <div className="nav-tabs">
          <button
            className={`nav-tab ${view === "feed" ? "active" : ""}`}
            onClick={() => setView("feed")}
          >
            <FiRss />
            <span>Feed</span>
          </button>
          <button
            className={`nav-tab ${view === "saved" ? "active" : ""}`}
            onClick={() => setView("saved")}
          >
            <FiBookmark />
            <span>Saved</span>
          </button>
        </div>
      </nav>

      {/* Main Feed */}
      <main className="posts-feed">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="empty-feed"
          >
            <div className="empty-feed-content">
              {view === "saved" ? (
                <>
                  <FiBookmark className="empty-icon" />
                  <h2>No saved posts yet</h2>
                  <p>
                    Posts you bookmark will appear here for easy access later.
                  </p>
                </>
              ) : (
                <>
                  <FiRss className="empty-icon" />
                  <h2>Welcome to the community!</h2>
                  <p>
                    {canCreatePost
                      ? "Be the first to share something with your community."
                      : "No posts to show yet. Check back later for updates from your department."}
                  </p>
                  {canCreatePost && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="empty-action-btn"
                      onClick={() => setShowComposer(true)}
                    >
                      <FiPlus />
                      Create First Post
                    </motion.button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="posts-list">
            <AnimatePresence mode="popLayout">
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onUpdate={handlePostUpdate}
                  onDelete={handlePostDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Department Info for Students */}
      {user?.role === "student" && (
        <aside className="department-info">
          <div className="info-card">
            <h3>Department Filter</h3>
            <p>
              You're viewing posts from <strong>{user.department}</strong>{" "}
              department and posts visible to all departments.
            </p>
          </div>
        </aside>
      )}
    </div>
  );
};

export default PostsPage;
