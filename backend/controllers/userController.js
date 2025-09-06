const User = require('../models/User');

// Get user profile by username
exports.getUserByUsername = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password -connectionRequests') // Don't send sensitive data
      .populate('connections', 'name username avatarUrl role');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ data: user });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
};

// Get followers of a user
exports.getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('followers')
      .populate('followers', 'name username avatarUrl role bio');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ data: user.followers || [] });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ message: 'Error fetching followers' });
  }
};

// Get following of a user
exports.getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('following')
      .populate('following', 'name username avatarUrl role bio');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ data: user.following || [] });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ message: 'Error fetching following' });
  }
};

// Get mutual connections
exports.getMutualConnections = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    const currentUser = await User.findById(currentUserId).select('following');
    const targetUser = await User.findById(targetUserId).select('following');

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find mutual connections
    const mutualIds = currentUser.following.filter(id => 
      targetUser.following.some(targetId => targetId.toString() === id.toString())
    );

    const mutualConnections = await User.find({ _id: { $in: mutualIds } })
      .select('name username avatarUrl role bio');

    res.json({ data: mutualConnections });
  } catch (error) {
    console.error('Error fetching mutual connections:', error);
    res.status(500).json({ message: 'Error fetching mutual connections' });
  }
};

// Follow/Unfollow a user
exports.followUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    if (currentUserId === targetUserId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isFollowing = currentUser.following.includes(targetUserId);
    const isFollower = targetUser.followers.includes(currentUserId);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId);
      await currentUser.save();
      await targetUser.save();
      res.json({ message: 'Unfollowed successfully', isFollowing: false });
    } else {
      // Follow
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);
      await currentUser.save();
      await targetUser.save();
      res.json({ message: 'Followed successfully', isFollowing: true });
    }
  } catch (error) {
    console.error('Error following/unfollowing user:', error);
    res.status(500).json({ message: 'Error following/unfollowing user' });
  }
};

// Get suggested connections based on mutual connections
exports.getSuggestedConnections = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId).select('following connections');

    // Get users that current user is following
    const followingUsers = await User.find({ _id: { $in: currentUser.following } })
      .select('following')
      .populate('following', 'name username avatarUrl role bio');

    // Get all users that are followed by people the current user follows
    const suggestedUserIds = new Set();
    followingUsers.forEach(user => {
      user.following.forEach(followedUser => {
        if (followedUser._id.toString() !== currentUserId && 
            !currentUser.following.includes(followedUser._id) &&
            !currentUser.connections.includes(followedUser._id)) {
          suggestedUserIds.add(followedUser._id.toString());
        }
      });
    });

    const suggestedUsers = await User.find({ 
      _id: { $in: Array.from(suggestedUserIds) } 
    }).select('name username avatarUrl role bio').limit(20);

    res.json({ data: suggestedUsers });
  } catch (error) {
    console.error('Error fetching suggested connections:', error);
    res.status(500).json({ message: 'Error fetching suggested connections' });
  }
}; 