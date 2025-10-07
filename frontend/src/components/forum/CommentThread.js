import React, { useEffect, useMemo, useState } from 'react';
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

const CommentNode = ({ node, postId, onAddLocal, onChanged, depth = 0 }) => {
  const [reply, setReply] = useState('');
  const [showChildren, setShowChildren] = useState(true);
  const [anim, setAnim] = useState(false);

  const submit = async () => {
    if (!reply.trim()) return;
    const res = await forumAPI.addComment(postId, { content: reply, parentComment: node._id });
    const created = res?.data?.data;
    setReply('');
    if (created && onAddLocal) onAddLocal(created);
    else onChanged && onChanged();
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
        <div className="text-sm text-gray-800 whitespace-pre-wrap">
          <span className="font-medium text-gray-900 mr-1">{node.author?.name || node.author?.username || 'User'}:</span>
          {node.content}
        </div>
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-3">
          <span>{new Date(node.createdAt).toLocaleString()}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => forumAPI.upvoteComment(node._id).then(onChanged)}
              className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              title="Like comment"
            >
              👍 {node.upvotes?.length || 0}
            </button>
            <div className="relative group">
              <button
                className="px-2 py-0.5 rounded bg-gray-50 text-gray-700 hover:bg-gray-100"
                title="React"
              >
                😊
              </button>
              <div className="absolute -top-10 left-0 hidden group-hover:flex bg-white border rounded-full shadow p-1 gap-1">
                {['like','love','laugh','wow','sad','angry'].map(t => (
                  <button key={t} title={t} onClick={() => forumAPI.reactToComment(node._id, t).then(onChanged)} className="w-7 h-7 rounded hover:bg-gray-100">
                    {t==='like'?'👍':t==='love'?'❤️':t==='laugh'?'😂':t==='wow'?'😮':t==='sad'?'😢':'😡'}
                  </button>
                ))}
              </div>
            </div>
          </div>
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
                <CommentNode key={child._id} node={child} postId={postId} onAddLocal={onAddLocal} onChanged={onChanged} depth={depth + 1} />
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
  const [items, setItems] = useState(comments || []);

  useEffect(() => { setItems(comments || []); }, [comments]);

  const tree = useMemo(() => buildTree(items || []), [items]);

  const submit = async () => {
    if (!text.trim()) return;
    const res = await forumAPI.addComment(postId, { content: text });
    const created = res?.data?.data;
    setText('');
    if (created) setItems(prev => [...prev, created]);
    else onChanged && onChanged();
  };

  return (
    <div>
      <div className="flex gap-2">
        <input className="border rounded-lg px-3 py-2 flex-1" placeholder="Add a comment..." value={text} onChange={e => setText(e.target.value)} />
        <button onClick={submit} className="px-4 py-2 rounded bg-gradient-to-r from-indigo-600 to-purple-600 text-white">Comment</button>
      </div>
      <div className="mt-4">
        {tree.map(n => (
          <CommentNode key={n._id} node={n} postId={postId} onAddLocal={(c) => setItems(prev => [...prev, c])} onChanged={onChanged} />
        ))}
      </div>
    </div>
  );
};

export default CommentThread;