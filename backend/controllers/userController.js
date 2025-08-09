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