import React, { useEffect, useState } from 'react';
import { forumAPI } from '../components/utils/forumApi';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import CommentThread from '../components/forum/CommentThread';
import Poll from '../components/forum/Poll';
import PostCard from '../components/forum/PostCard';

const ForumPostPage = () => {
  const { postId } = useParams();
  const [data, setData] = useState(null);

  const fetchPost = async () => {
    const res = await forumAPI.getPost(postId);
    setData(res.data?.data || null);
  };

  useEffect(() => { fetchPost(); }, [postId]);

  if (!data) return <div className="p-6 text-gray-500">Loading...</div>;

  const { post, comments } = data;

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <PostCard post={post} full onChanged={fetchPost} />
      </motion.div>
      {post?.poll && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
          <Poll post={post} onVoted={fetchPost} />
        </motion.div>
      )}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
        <CommentThread postId={post._id} comments={comments} onChanged={fetchPost} />
      </motion.div>
    </div>
  );
};

export default ForumPostPage;