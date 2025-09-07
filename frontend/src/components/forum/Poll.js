import React, { useState } from 'react';
import { forumAPI } from '../utils/forumApi';

const Poll = ({ post, onVoted }) => {
  const [selected, setSelected] = useState(-1);

  const vote = async () => {
    if (selected < 0) return;
    await forumAPI.votePoll(post._id, selected);
    onVoted && onVoted();
  };

  return (
    <div className="p-4 rounded-xl border bg-white">
      <div className="font-semibold mb-2">{post.poll?.question}</div>
      <div className="space-y-2">
        {post.poll?.options?.map((opt, idx) => (
          <label key={idx} className="flex items-center gap-2">
            <input type="radio" name={`poll_${post._id}`} onChange={() => setSelected(idx)} />
            <span>{opt.text}</span>
            <span className="ml-auto text-xs text-gray-500">{opt.votes?.length || 0} votes</span>
          </label>
        ))}
      </div>
      <div className="mt-3">
        <button onClick={vote} className="px-4 py-2 rounded bg-gradient-to-r from-indigo-600 to-purple-600 text-white">Vote</button>
      </div>
    </div>
  );
};

export default Poll;