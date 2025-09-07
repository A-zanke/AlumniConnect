import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { forumAPI } from '../utils/forumApi';
import { motion } from 'framer-motion';
import { FiMessageSquare } from 'react-icons/fi';

const MAX_PREVIEW = 200;

const PostCard = ({ post, onChanged, full }) => {
  const [anim, setAnim] = useState(false);

  const upvote = async () => {
    setAnim(true);
    await forumAPI.upvotePost(post._id);
    onChanged && onChanged();
    setTimeout(() => setAnim(false), 300);
  };
  const bookmark = async () => { await forumAPI.bookmarkPost(post._id); onChanged && onChanged(); };

  const preview = useMemo(() => {
    if (full) return post.content;
    if (!post?.content) return '';
    if (post.content.length <= MAX_PREVIEW) return post.content;
    return post.content.slice(0, MAX_PREVIEW) + '...';
  }, [post, full]);

  const Author = () => {
    if (post.isAnonymous || !post.author) return <span className="text-gray-500">Anonymous</span>;
    return (
      <Link to={`/profile/${post.author.username || post.author._id}`} className="text-indigo-600 hover:underline font-medium">
        {post.author.name}
      </Link>
    );
  };

  return (
    <div className={`bg-white rounded-2xl shadow-md border border-indigo-50 ${full ? '' : 'hover:shadow-lg hover:-translate-y-0.5 transition-all'} overflow-hidden`}>
      {/* Gradient category header */}
      <div className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs tracking-wide">
        {post.category}
      </div>

      <div className="p-5">
        <Link to={`/forum/${post._id}`} className="block">
          <h3 className="text-lg font-bold text-gray-900 hover:text-indigo-700 transition">{post.title}</h3>
        </Link>

        <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
          {preview}
          {!full && post.content?.length > MAX_PREVIEW && (
            <Link to={`/forum/${post._id}`} className="ml-2 text-indigo-600 hover:underline">Read more</Link>
          )}
        </div>

        {post.tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((t, i) => (
              <motion.span
                key={i}
                whileHover={{ scale: 1.05 }}
                className="px-2 py-1 text-xs rounded-full bg-indigo-50 text-indigo-700"
              >
                #{t}
              </motion.span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">By <Author /></div>
          <div className="flex gap-2 items-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              animate={anim ? { scale: [1, 1.2, 1], transition: { duration: 0.3 } } : {}}
              onClick={upvote}
              className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            >
              ▲ {post.upvotes?.length || 0}
            </motion.button>
            <button onClick={bookmark} className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100">★</button>
            <div className="px-3 py-1 rounded-full bg-gray-50 text-gray-600 flex items-center gap-1">
              <FiMessageSquare />
              {/* comment count not available in list response; icon only */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;