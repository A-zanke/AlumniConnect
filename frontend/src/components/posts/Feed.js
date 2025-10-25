import React from "react";
import { motion } from "framer-motion";
import PostCard from "./PostCard";

const Feed = ({ posts, onPostUpdate, onPostDelete, loading }) => {
  if (loading) {
    return (
      <div className="feed-loading">
        <div className="loading-spinner"></div>
        <p>Loading posts...</p>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <motion.div
        className="feed-empty"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3>No posts yet</h3>
        <p>Be the first to share something with the community!</p>
      </motion.div>
    );
  }

  return (
    <div className="feed-container">
      {posts.map((post, index) => (
        <motion.div
          key={post._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <PostCard
            post={post}
            onUpdate={onPostUpdate}
            onDelete={onPostDelete}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default Feed;
