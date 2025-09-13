import React, { useEffect, useState } from 'react';
import { FaThumbsUp, FaShare, FaComment } from 'react-icons/fa';
import { postsAPI } from '../utils/api';
import PostComposer from '../posts/PostComposer';
import { useAuth } from '../../context/AuthContext';

const PostsFeed = ({ userId }) => {
  const { user, canCreateContent } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentDrafts, setCommentDrafts] = useState({});

  const isOwn = user?._id === userId;

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchPosts = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await postsAPI.getUserPosts(userId);
      const data = res.data?.data || res.data || [];
      setPosts(Array.isArray(data) ? data.slice().reverse() : []);
    } catch (_) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const like = async (postId) => {
    try {
      await postsAPI.likePost(postId);
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p));
    } catch (_) {}
  };

  const addComment = async (postId) => {
    const content = (commentDrafts[postId] || '').trim();
    if (!content) return;
    try {
      await postsAPI.commentOnPost(postId, content);
      setCommentDrafts(prev => ({ ...prev, [postId]: '' }));
      // Optimistic update: increment comments length if available
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: Array.isArray(p.comments) ? [...p.comments, { _tmp: true }] : [{ _tmp: true }] } : p));
    } catch (_) {}
  };

  const share = async (postId) => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      // Optional: toast success if toast available
    } catch (_) {}
  };

  return (
    <div className="space-y-4">
      {(isOwn || canCreateContent()) && (
        <PostComposer onPosted={fetchPosts} />
      )}
      {loading ? (
        <div className="flex justify-center py-10">Loading...</div>
      ) : posts.length === 0 ? (
        <p className="text-center text-slate-600 dark:text-slate-300">No posts yet.</p>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post._id} className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow border dark:border-gray-800">
              <div className="text-sm text-slate-500 dark:text-slate-400">{new Date(post.createdAt).toLocaleString()}</div>
              <div className="mt-3 whitespace-pre-wrap">{post.content}</div>
              <div className="flex gap-6 mt-4 text-slate-500 dark:text-slate-400">
                <button onClick={() => like(post._id)} className="hover:text-indigo-600"><FaThumbsUp /> {post.likes || 0}</button>
                <span className=""><FaComment /> {Array.isArray(post.comments) ? post.comments.length : 0}</span>
                <button onClick={() => share(post._id)} className="hover:text-indigo-600"><FaShare /></button>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={commentDrafts[post._id] || ''}
                  onChange={(e)=>setCommentDrafts(prev=>({ ...prev, [post._id]: e.target.value }))}
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
                <button onClick={() => addComment(post._id)} className="px-3 py-2 bg-indigo-600 text-white rounded-lg">Comment</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostsFeed;

