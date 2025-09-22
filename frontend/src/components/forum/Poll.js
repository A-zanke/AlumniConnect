import React, { useState, useMemo } from 'react';
import { forumAPI } from '../utils/forumApi';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

const Poll = ({ post, onVoted }) => {
  const [selectedOption, setSelectedOption] = useState(-1);
  const [isVoting, setIsVoting] = useState(false);

  const pollData = useMemo(() => {
    if (!post.poll) return null;
    
    const totalVotes = post.poll.options.reduce((sum, option) => sum + (option.votes?.length || 0), 0);
    
    return {
      question: post.poll.question,
      options: post.poll.options.map((option, index) => ({
        text: option.text,
        votes: option.votes?.length || 0,
        percentage: totalVotes > 0 ? Math.round((option.votes?.length || 0) / totalVotes * 100) : 0,
        index
      })),
      totalVotes,
      hasVoted: post.hasUserVoted || false
    };
  }, [post.poll, post.hasUserVoted]);

  const handleVote = async () => {
    if (selectedOption < 0 || isVoting || pollData.hasVoted) return;

    setIsVoting(true);
    try {
      await forumAPI.votePoll(post._id, selectedOption);
      onVoted && onVoted();
      toast.success('Vote submitted successfully!');
    } catch (error) {
      console.error('Error voting:', error);
      if (error.response?.status === 400) {
        toast.error('You have already voted in this poll');
      } else {
        toast.error('Failed to submit vote');
      }
    } finally {
      setIsVoting(false);
    }
  };

  if (!pollData) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100"
    >
      <h4 className="font-semibold text-gray-900 mb-4 text-lg">
        📊 {pollData.question}
      </h4>
      
      <div className="space-y-3 mb-4">
        {pollData.options.map((option) => (
          <motion.div
            key={option.index}
            whileHover={{ scale: pollData.hasVoted ? 1 : 1.02 }}
            className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
              pollData.hasVoted
                ? 'border-gray-200 cursor-default'
                : selectedOption === option.index
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
            }`}
            onClick={() => !pollData.hasVoted && setSelectedOption(option.index)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!pollData.hasVoted && (
                  <input
                    type="radio"
                    name={`poll_${post._id}`}
                    checked={selectedOption === option.index}
                    onChange={() => setSelectedOption(option.index)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                )}
                <span className={`font-medium ${pollData.hasVoted ? 'text-gray-700' : 'text-gray-900'}`}>
                  {option.text}
                </span>
              </div>
              
              {pollData.hasVoted && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{option.votes} votes</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {option.percentage}%
                  </span>
                </div>
              )}
            </div>
            
            {/* Progress bar for voted polls */}
            {pollData.hasVoted && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${option.percentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full"
                  />
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {pollData.totalVotes} total vote{pollData.totalVotes !== 1 ? 's' : ''}
        </span>
        
        {!pollData.hasVoted && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleVote}
            disabled={selectedOption < 0 || isVoting}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              selectedOption >= 0 && !isVoting
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isVoting ? 'Voting...' : 'Vote'}
          </motion.button>
        )}
        
        {pollData.hasVoted && (
          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
            ✓ Voted
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default Poll;