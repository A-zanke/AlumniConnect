import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRss, FiBookmark, FiPlus } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import PostCard from '../components/posts/PostCard';
import CreatePost from '../components/posts/CreatePost';
import { useAuth } from '../context/AuthContext';
import './PostsPage.css';

const PostsPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [view, setView] = useState('feed'); // 'feed' or 'saved'
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);

  const canCreatePost = user && ['alumni', 'teacher', 'admin'].includes(user.role);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const url = view === 'saved' ? '/api/posts/saved' : '/api/posts';
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setPosts(response.data);
    } catch (error) {
      toast.error('Failed to load posts. Please try again.');
      console.error('Fetch posts error:', error);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
    setShowComposer(false);
    setView('feed');
  };
  
  const handlePostUpdate = (updatedPost) => {
    setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
  };
  
  const handlePostDelete = (postId) => {
    setPosts(prev => prev.filter(p => p._id !== postId));
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

      <header className="posts-header">
        <h1 className="posts-title">Community Feed</h1>
        {canCreatePost && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="create-post-btn"
            onClick={() => setShowComposer(true)}
          >
            <FiPlus />
            Create Post
          </motion.button>
        )}
      </header>

      <nav className="posts-nav">
        <button
          className={`nav-tab ${view === 'feed' ? 'active' : ''}`}
          onClick={() => setView('feed')}
        >
          <FiRss /> Feed
        </button>
        <button
          className={`nav-tab ${view === 'saved' ? 'active' : ''}`}
          onClick={() => setView('saved')}
        >
          <FiBookmark /> Saved
        </button>
      </nav>

      <main className="posts-feed">
        {loading ? (
          <div className="loading-spinner"></div>
        ) : posts.length === 0 ? (
          <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="empty-feed">
            <h2>It's quiet here...</h2>
            <p>{view === 'saved' ? 'Posts you save will appear here.' : 'No posts to show yet. Be the first to share!'}</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {posts.map((post) => (
              <PostCard 
                key={post._id} 
                post={post} 
                onUpdate={handlePostUpdate}
                onDelete={handlePostDelete}
              />
            ))}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
};

export default PostsPage;
