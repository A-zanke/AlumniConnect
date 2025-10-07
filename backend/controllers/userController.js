const User = require('../models/User');
const Student = require('../models/Student');
const Alumni = require('../models/Alumni');

// Get user profile by username
async function getUserByUsername(req, res) {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password -connectionRequests')
      .populate('connections', 'name username avatarUrl role');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let additionalData = {};
    if (user.role === 'student') {
      // Student profile now primarily uses fields on the User model for consistency
      additionalData = {
        department: user.department,
        year: user.year,
        graduationYear: user.graduationYear,
        skills: user.skills,
        socials: user.socials,
        careerInterests: user.careerInterests,
        activities: user.activities,
        mentorshipOpen: user.mentorshipOpen
      };
    } else if (user.role === 'alumni') {
      additionalData = {
        department: user.department,
        graduationYear: user.graduationYear,
        degree: user.degree,
        company: user.company,
        position: user.position,
        industry: user.industry,
        skills: user.skills,
        socials: user.socials,
        mentorshipAvailable: user.mentorshipAvailable,
        guidanceAreas: user.guidanceAreas
      };
    }

    const fullProfile = { ...user.toObject(), ...additionalData };
    res.json({ data: fullProfile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Error fetching user profile' });
  }
}

// Get following of a user (with fallback to connections)
async function getFollowing(req, res) {
  try {
    const user = await User.findById(req.params.userId)
      .select('following connections')
      .populate('following', 'name username avatarUrl role email department year industry current_job_title bio')
      .populate('connections', 'name username avatarUrl role email department year industry current_job_title bio');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let following = Array.isArray(user.following) ? user.following : [];
    if ((!following || following.length === 0) && Array.isArray(user.connections) && user.connections.length > 0) {
      following = user.connections;
    }
    res.json({ data: following });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ message: 'Error fetching following' });
  }
}

// Mutual connections with a specific target user (intersection)
async function getMutualConnections(req, res) {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    const currentUser = await User.findById(currentUserId).select('following');
    const targetUser = await User.findById(targetUserId).select('following');

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const mutualIds = (currentUser.following || []).filter(id =>
      (targetUser.following || []).some(targetId => targetId.toString() === id.toString())
    );

    const mutualConnections = await User.find({ _id: { $in: mutualIds } })
      .select('name username avatarUrl role bio createdAt email department year industry current_job_title');

    res.json({ data: mutualConnections });
  } catch (error) {
    console.error('Error fetching mutual connections:', error);
    res.status(500).json({ message: 'Error fetching mutual connections' });
  }
}

// Follow/Unfollow a user
async function followUser(req, res) {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    if (currentUserId.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isFollowing = (currentUser.following || []).some(id => id.toString() === targetUserId.toString());

    if (isFollowing) {
      currentUser.following = (currentUser.following || []).filter(id => id.toString() !== targetUserId.toString());
      targetUser.followers = (targetUser.followers || []).filter(id => id.toString() !== currentUserId.toString());
      await currentUser.save();
      await targetUser.save();
      res.json({ message: 'Unfollowed successfully', isFollowing: false });
    } else {
      currentUser.following = [...(currentUser.following || []), targetUserId];
      targetUser.followers = [...(targetUser.followers || []), currentUserId];
      await currentUser.save();
      await targetUser.save();
      res.json({ message: 'Followed successfully', isFollowing: true });
    }
  } catch (error) {
    console.error('Error following/unfollowing user:', error);
    res.status(500).json({ message: 'Error following/unfollowing user' });
  }
}

// Get my mutual connections (friends-of-friends with fallback to connections)
async function getMyMutualConnections(req, res) {
  try {
    const currentUserId = req.user._id?.toString();
    const currentUser = await User.findById(currentUserId).select('following connections');

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const myFollowing = Array.isArray(currentUser.following) ? currentUser.following.map(id => id.toString()) : [];
    const myConnections = Array.isArray(currentUser.connections) ? currentUser.connections.map(id => id.toString()) : [];

    const firstLevelIds = Array.from(new Set([...(myFollowing || []), ...(myConnections || [])]));
    if (firstLevelIds.length === 0) {
      return res.json({ data: [] });
    }

    const neighbors = await User.find({ _id: { $in: firstLevelIds } })
      .select('following connections')
      .populate('following', 'name username avatarUrl role email department year industry current_job_title bio createdAt')
      .populate('connections', 'name username avatarUrl role email department year industry current_job_title bio createdAt');

    const mutualMap = new Map();
    neighbors.forEach(neighbor => {
      let outward = Array.isArray(neighbor.following) ? neighbor.following : [];
      if (!outward || outward.length === 0) {
        outward = Array.isArray(neighbor.connections) ? neighbor.connections : [];
      }
      outward.forEach(candidate => {
        const candId = candidate?._id?.toString();
        if (!candId) return;
        if (
          candId !== currentUserId &&
          !myFollowing.includes(candId) &&
          !myConnections.includes(candId) &&
          !firstLevelIds.includes(candId) &&
          !mutualMap.has(candId)
        ) {
          mutualMap.set(candId, candidate);
        }
      });
    });

    const mutualConnections = Array.from(mutualMap.values());
    res.json({ data: mutualConnections });
  } catch (error) {
    console.error('Error fetching mutual connections:', error);
    res.status(500).json({ message: 'Error fetching mutual connections' });
  }
}

// Suggested connections (friends-of-friends excluding followed/connected)
async function getSuggestedConnections(req, res) {
  try {
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId).select('following connections');

    const followingUsers = await User.find({ _id: { $in: currentUser.following || [] } })
      .select('following')
      .populate('following', 'name username avatarUrl role bio');

    const suggestedUserIds = new Set();
    followingUsers.forEach(user => {
      (user.following || []).forEach(followedUser => {
        if (
          followedUser._id.toString() !== currentUserId.toString() &&
          !(currentUser.following || []).some(id => id.toString() === followedUser._id.toString()) &&
          !(currentUser.connections || []).some(id => id.toString() === followedUser._id.toString())
        ) {
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
}

// Presence
async function updatePresence(req, res) {
  try {
    const userId = req.user._id;
    const { isOnline } = req.body;

    await User.findByIdAndUpdate(userId, {
      isOnline: isOnline,
      lastSeen: new Date()
    });

    res.json({ message: 'Presence updated successfully' });
  } catch (error) {
    console.error('Error updating presence:', error);
    res.status(500).json({ message: 'Error updating presence' });
  }
}

async function getPresence(req, res) {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).select('isOnline lastSeen');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      isOnline: user.isOnline,
      lastSeen: user.lastSeen
    });
  } catch (error) {
    console.error('Error fetching presence:', error);
    res.status(500).json({ message: 'Error fetching presence' });
  }
}

// Remove user avatar
const removeUserAvatar = async (req, res) => {
  try {
    // Get user from auth middleware
    const userId = req.user._id;
    console.log('Removing avatar for user:', userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user document
    user.avatarUrl = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile picture removed successfully'
    });

  } catch (error) {
    console.error('removeUserAvatar error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove profile picture'
    });
  }
};

module.exports = {
  getUserByUsername,
  getFollowing,
  getMutualConnections,
  getMyMutualConnections,
  followUser,
  getSuggestedConnections,
  updatePresence,
  getPresence,
  removeUserAvatar
};