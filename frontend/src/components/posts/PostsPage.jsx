import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiRss,
  FiBookmark,
  FiPlus,
  FiFilter,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiChevronDown,
  FiUser,
  FiBarChart2,
  FiTrash2,
  FiDownload,
  FiCheckSquare,
  FiSquare,
} from "react-icons/fi";
import axios from "axios";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

import PostCard from "./PostCard";
import CreatePost from "./CreatePost";
import PostAnalytics from "./PostAnalytics";
import { useAuth } from "../../context/AuthContext";
import "../../styles/PostsPage.css";

const PostsPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [view, setView] = useState("feed"); // 'feed', 'saved', 'my-posts', 'analytics'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchTags, setSearchTags] = useState([]);
  const [filter, setFilter] = useState("all"); // 'all', 'my-posts', 'saved', 'by-department'
  const [sort, setSort] = useState("recent"); // 'recent', 'most-reactions', 'most-comments'
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [showNewPostsBanner, setShowNewPostsBanner] = useState(false);
  const [socket, setSocket] = useState(null);
  const observerRef = useRef();
  const lastPostRef = useCallback(
    (node) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore]
  );

  const canCreatePost =
    user && ["alumni", "teacher", "admin"].includes(user.role);
  const isAdmin = user && user.role === "admin";
  const canViewAnalytics =
    user && ["alumni", "teacher", "admin"].includes(user.role);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
      setPosts([]);
      setHasMore(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Socket connection for real-time updates
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const s = io("/", { auth: { token } });
    s.on("post:new_post", () => {
      setNewPostsCount((prev) => prev + 1);
      setShowNewPostsBanner(true);
    });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  const fetchPosts = useCallback(
    async (append = false) => {
      if (!append) {
        setLoading(true);
      }

      try {
        let url = "/api/posts";
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", "10");

        if (debouncedQuery) params.append("q", debouncedQuery);
        if (searchTags.length > 0) params.append("tags", searchTags.join(","));
        if (sort !== "recent") params.append("sort", sort);
        if (filter === "saved") params.append("filter", "saved");

        if (view === "saved") url = "/api/posts/saved";
        else if (view === "my-posts") url = "/api/posts?userId=me";
        else if (view === "analytics") return; // Analytics handled separately

        const response = await axios.get(`${url}?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        const newPosts = response.data.posts || response.data;
        if (append) {
          setPosts((prev) => [...prev, ...newPosts]);
        } else {
          setPosts(newPosts);
        }
        setHasMore(newPosts.length === 10);
      } catch (error) {
        toast.error("Failed to load posts. Please try again.");
        console.error("Fetch posts error:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [view, debouncedQuery, searchTags, filter, sort, page]
  );

  useEffect(() => {
    if (view !== "analytics") {
      fetchPosts();
    }
  }, [fetchPosts, view]);

  useEffect(() => {
    if (page > 1) {
      fetchPosts(true);
    }
  }, [page, fetchPosts]);

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
    setSelectedPosts((prev) => prev.filter((id) => id !== postId));
  };

  const handleRefresh = () => {
    setPage(1);
    setPosts([]);
    setHasMore(true);
    setNewPostsCount(0);
    setShowNewPostsBanner(false);
    fetchPosts();
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedPosts.length} posts?`)) return;
    try {
      await axios.delete("/api/admin/posts/bulk-delete", {
        data: { postIds: selectedPosts },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setPosts((prev) => prev.filter((p) => !selectedPosts.includes(p._id)));
      setSelectedPosts([]);
      setShowBulkActions(false);
      toast.success("Posts deleted successfully");
    } catch (error) {
      toast.error("Failed to delete posts");
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get("/api/admin/posts/export", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "posts.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export completed");
    } catch (error) {
      toast.error("Failed to export posts");
    }
  };

  const togglePostSelection = (postId) => {
    setSelectedPosts((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    );
  };

  const selectAllPosts = () => {
    if (selectedPosts.length === posts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(posts.map((p) => p._id));
    }
  };

  const addTag = (tag) => {
    if (!searchTags.includes(tag)) {
      setSearchTags((prev) => [...prev, tag]);
    }
  };

  const removeTag = (tag) => {
    setSearchTags((prev) => prev.filter((t) => t !== tag));
  };

  const SkeletonPost = () => (
    <div className="skeleton-post">
      <div className="skeleton-header"></div>
      <div className="skeleton-content"></div>
      <div className="skeleton-actions"></div>
    </div>
  );

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

      {/* New Posts Banner */}
      <AnimatePresence>
        {showNewPostsBanner && newPostsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="new-posts-banner"
          >
            <span>{newPostsCount} new posts available</span>
            <button onClick={handleRefresh}>Refresh</button>
          </motion.div>
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

        {/* Search Bar */}
        {view !== "analytics" && (
          <div className="search-bar">
            <div className="search-input-container">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="clear-search"
                >
                  <FiX />
                </button>
              )}
            </div>
            <div className="search-filters">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Posts</option>
                <option value="saved">Saved Posts</option>
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="sort-select"
              >
                <option value="recent">Recent</option>
                <option value="most-reactions">Most Reactions</option>
                <option value="most-comments">Most Comments</option>
              </select>
            </div>
          </div>
        )}

        {/* Tag Chips */}
        {view !== "analytics" && (
          <div className="tag-chips">
            {searchTags.map((tag) => (
              <motion.span
                key={tag}
                className="tag-chip"
                whileHover={{ scale: 1.05 }}
                onClick={() => removeTag(tag)}
              >
                #{tag} <FiX />
              </motion.span>
            ))}
            <motion.span
              className="tag-chip add-tag"
              whileHover={{ scale: 1.05 }}
              onClick={() => {
                const tag = prompt("Add tag:");
                if (tag) addTag(tag);
              }}
            >
              + Add Tag
            </motion.span>
          </div>
        )}
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
            {newPostsCount > 0 && view !== "feed" && (
              <span className="notification-badge">{newPostsCount}</span>
            )}
          </button>
          <button
            className={`nav-tab ${view === "saved" ? "active" : ""}`}
            onClick={() => setView("saved")}
          >
            <FiBookmark />
            <span>Saved</span>
          </button>
          {canCreatePost && (
            <button
              className={`nav-tab ${view === "my-posts" ? "active" : ""}`}
              onClick={() => setView("my-posts")}
            >
              <FiUser />
              <span>My Posts</span>
            </button>
          )}
          {canViewAnalytics && (
            <button
              className={`nav-tab ${view === "analytics" ? "active" : ""}`}
              onClick={() => setView("analytics")}
            >
              <FiBarChart2 />
              <span>Analytics</span>
            </button>
          )}
        </div>
      </nav>

      {/* Bulk Actions for Admins */}
      {isAdmin && showBulkActions && (
        <div className="bulk-actions">
          <button onClick={selectAllPosts} className="bulk-btn">
            {selectedPosts.length === posts.length ? (
              <FiCheckSquare />
            ) : (
              <FiSquare />
            )}
            Select All
          </button>
          <button onClick={handleBulkDelete} className="bulk-btn delete">
            <FiTrash2 /> Delete Selected ({selectedPosts.length})
          </button>
          <button onClick={handleExport} className="bulk-btn export">
            <FiDownload /> Export
          </button>
          <button
            onClick={() => setShowBulkActions(false)}
            className="bulk-btn cancel"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main Feed */}
      <main className="posts-feed">
        {view === "analytics" ? (
          <PostAnalytics />
        ) : loading && page === 1 ? (
          <div className="loading-container">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonPost key={i} />
            ))}
          </div>
        ) : posts.length === 0 && !loading ? (
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
              ) : view === "my-posts" ? (
                <>
                  <FiUser className="empty-icon" />
                  <h2>No posts yet</h2>
                  <p>
                    Your posts will appear here. Start sharing with your
                    community!
                  </p>
                  {canCreatePost && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="empty-action-btn"
                      onClick={() => setShowComposer(true)}
                    >
                      <FiPlus />
                      Create Your First Post
                    </motion.button>
                  )}
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
              {posts.map((post, index) => (
                <div
                  key={post._id}
                  ref={index === posts.length - 1 ? lastPostRef : null}
                >
                  {isAdmin && (
                    <input
                      type="checkbox"
                      checked={selectedPosts.includes(post._id)}
                      onChange={() => togglePostSelection(post._id)}
                      className="post-checkbox"
                    />
                  )}
                  <PostCard
                    post={post}
                    onUpdate={handlePostUpdate}
                    onDelete={handlePostDelete}
                    searchQuery={debouncedQuery}
                  />
                </div>
              ))}
            </AnimatePresence>
            {loading && page > 1 && (
              <div className="loading-more">
                <SkeletonPost />
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <div className="no-more-posts">No more posts to load</div>
            )}
          </div>
        )}
      </main>

      {/* Floating Create Post Button for Mobile */}
      {canCreatePost && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="floating-create-btn"
          onClick={() => setShowComposer(true)}
        >
          <FiPlus />
        </motion.button>
      )}
    </div>
  );
};

export default PostsPage;
