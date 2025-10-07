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
      const studentData = await Student.findOne({ email: user.email });
      if (studentData) {
        additionalData = {
          department: studentData.department,
          year: studentData.year,
          batch: studentData.batch,
          rollNumber: studentData.rollNumber,
          major: studentData.major,
          graduationYear: studentData.graduationYear,
          specialization: studentData.specialization,
          projects: studentData.projects,
          desired_roles: studentData.desired_roles,
          preferred_industries: studentData.preferred_industries,
          higher_studies_interest: studentData.higher_studies_interest,
          entrepreneurship_interest: studentData.entrepreneurship_interest,
          internships: studentData.internships,
          hackathons: studentData.hackathons,
          research_papers: studentData.research_papers,
          mentorship_needs: studentData.mentorship_needs,
          preferred_location: studentData.preferred_location,
          preferred_mode: studentData.preferred_mode,
          certifications: studentData.certifications,
          achievements: studentData.achievements,
          detailed_projects: studentData.detailed_projects,
          detailed_internships: studentData.detailed_internships
        };
      }
    } else if (user.role === 'alumni') {
      const alumniData = await Alumni.findOne({ email: user.email });
      if (alumniData) {
        additionalData = {
          specialization: alumniData.specialization,
          higher_studies: alumniData.higher_studies,
          current_job_title: alumniData.current_job_title,
          company: alumniData.company,
          industry: alumniData.industry,
          past_experience: alumniData.past_experience,
          mentorship_interests: alumniData.mentorship_interests,
          preferred_students: alumniData.preferred_students,
          availability: alumniData.availability,
          certifications: alumniData.certifications,
          publications: alumniData.publications,
          entrepreneurship: alumniData.entrepreneurship,
          linkedin: alumniData.linkedin,
          github: alumniData.github,
          website: alumniData.website
        };
      }
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

// Explicit unfollow endpoint for clarity (idempotent)
async function unfollowUser(req, res) {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.userId;

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);
    if (!currentUser || !targetUser) return res.status(404).json({ message: 'User not found' });

    currentUser.following = (currentUser.following || []).filter(id => id.toString() !== targetUserId.toString());
    targetUser.followers = (targetUser.followers || []).filter(id => id.toString() !== currentUserId.toString());
    await currentUser.save();
    await targetUser.save();
    res.json({ message: 'Unfollowed successfully', isFollowing: false });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ message: 'Error unfollowing user' });
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

module.exports = {
  getUserByUsername,
  getFollowing,
  getMutualConnections,
  getMyMutualConnections,
  followUser,
  getSuggestedConnections,
  updatePresence,
  getPresence
};