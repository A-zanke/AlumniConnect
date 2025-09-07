import React, { useMemo, useState } from 'react';
import { forumAPI } from '../utils/forumApi';
import { motion, AnimatePresence } from 'framer-motion';

const buildTree = (comments) => {
  const map = new Map();
  comments.forEach(c => map.set(String(c._id), { ...c, children: [] }));
  const roots = [];
  comments.forEach(c => {
    if (c.parentComment) {
      const parent = map.get(String(c.parentComment));
      if (parent) parent.children.push(map.get(String(c._id)));
      else roots.push(map.get(String(c._id)));
    } else {
      roots.push(map.get(String(c._id)));
    }
  });
  return roots;
};

const CommentNode = ({ node, postId, onChanged, depth = 0 }) => {
  const [reply, setReply] = useState('');
  const [anon, setAnon] = useState(false);
  const [showChildren, setShowChildren] = useState(true);
  const [anim, setAnim] = useState(false);

  const submit = async () => {
    if (!reply.trim()) return;
    await forumAPI.addComment(postId, { content: reply, parentComment: node._id, isAnonymous: anon });
    setReply(''); setAnon(false);
    onChanged && onChanged();
  };

  const upvote = async () => {
    setAnim(true);
    await forumAPI.upvoteComment(node._id);
    onChanged && onChanged();
    setTimeout(() => setAnim(false), 250);
  };

  return (
    <div className="mt-4">
      <div className={`p-3 rounded-xl border ${depth ? 'bg-gray-50' : 'bg-white'}`}>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">{node.content}</div>
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-3">
          <span>{new Date(node.createdAt).toLocaleString()}</span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            animate={anim ? { scale: [1, 1.2, 1], transition: { duration: 0.25 } } : {}}
            onClick={upvote}
            className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700"
          >
            ▲ {node.upvotes?.length || 0}
          </motion.button>
          {node.children?.length > 0 && (
            <button onClick={() => setShowChildren(s => !s)} className="text-indigo-600 hover:underline">
              {showChildren ? 'Hide replies' : `View ${node.children.length} repl${node.children.length > 1 ? 'ies' : 'y'}`}
            </button>
          )}
        </div>
      </div>

      {/* Reply input */}
      <div className="ml-6 mt-2">
        <div className="flex gap-2">
          <input className="border rounded-lg px-2 py-1 flex-1" placeholder="Reply..." value={reply} onChange={e => setReply(e.target.value)} />
          <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} /> Anonymous</label>
          <button onClick={submit} className="px-3 py-1 rounded bg-gradient-to-r from-indigo-600 to-purple-600 text-white">Reply</button>
        </div>

        {/* Child replies */}
        <AnimatePresence initial={false}>
          {showChildren && node.children?.length > 0 && (
            <motion.div
              key="children"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-2 ml-4 border-l pl-4"
            >
              {node.children.map(child => (
                <CommentNode key={child._id} node={child} postId={postId} onChanged={onChanged} depth={depth + 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const CommentThread = ({ postId, comments, onChanged }) => {
  const [text, setText] = useState('');
  const [anon, setAnon] = useState(false);

  const tree = useMemo(() => buildTree(comments || []), [comments]);

  const submit = async () => {
    if (!text.trim()) return;
    await forumAPI.addComment(postId, { content: text, isAnonymous: anon });
    setText(''); setAnon(false);
    onChanged && onChanged();
  };

  return (
    <div>
      <div className="flex gap-2">
        <input className="border rounded-lg px-3 py-2 flex-1" placeholder="Add a comment..." value={text} onChange={e => setText(e.target.value)} />
        <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} /> Anonymous</label>
        <button onClick={submit} className="px-4 py-2 rounded bg-gradient-to-r from-indigo-600 to-purple-600 text-white">Comment</button>
      </div>
      <div className="mt-4">
        {tree.map(n => <CommentNode key={n._id} node={n} postId={postId} onChanged={onChanged} />)}
      </div>
    </div>
  );
};

export default CommentThread;