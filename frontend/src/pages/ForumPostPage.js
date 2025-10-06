import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { forumAPI } from '../components/utils/forumApi';
import PostCard from '../components/forum/PostCard';
import CommentThread from '../components/forum/CommentThread';
import { useAuth } from '../context/AuthContext';

const ForumPostPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await forumAPI.getPost(id);
      const data = res.data?.data || {};
      setPost(data.post);
      setComments(data.comments || []);
    } catch (e) {
      setError('Failed to load post');
      navigate('/forum');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */}, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Loading post...</p>
            </div>
          </div>
        ) : !post ? (
          <div className="text-center py-16 text-gray-600">Post not found</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <PostCard post={post} full onChanged={load} currentUser={user} />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg border border-blue-100 p-6"
              >
                <CommentThread postId={post._id} comments={comments} onChanged={load} />
              </motion.div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              {/* Placeholder for future: related posts, guidelines, etc. */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumPostPage;
