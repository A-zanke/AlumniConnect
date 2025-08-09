const express = require('express');
const router = express.Router();
// const User = require('../models/User');
// const Post = require('../models/Post');
// const Event = require('../models/Event');
// const Connection = require('../models/Connection');
const { protect } = require('../middleware/authMiddleware');

// // Helper function to create search query
// const createSearchQuery = (searchTerm) => {
//   const searchRegex = new RegExp(searchTerm, 'i');
//   return {
//     $or: [
//       { name: searchRegex },
//       { username: searchRegex },
//       { email: searchRegex },
//       { role: searchRegex },
//       { department: searchRegex },
//       { title: searchRegex },
//       { description: searchRegex },
//       { content: searchRegex },
//       { tags: searchRegex }
//     ]
//   };
// };

// // Main search function
// exports.search = async (req, res) => {
//   try {
//     const { q: searchTerm, filter = 'all' } = req.query;
    
//     if (!searchTerm) {
//       return res.json({ results: [] });
//     }

//     const searchQuery = createSearchQuery(searchTerm);
//     const results = [];
//     let users = [];

//     // Search based on filter
//     switch (filter) {
//       case 'alumni':
//         users = await User.find({
//           ...searchQuery,
//           role: 'alumni'
//         }).select('name username avatarUrl role department isPrivate');
//         break;

//       case 'students':
//         users = await User.find({
//           ...searchQuery,
//           role: 'student'
//         }).select('name username avatarUrl role department isPrivate');
//         break;

//       case 'teachers':
//         users = await User.find({
//           ...searchQuery,
//           role: 'teacher'
//         }).select('name username avatarUrl role department isPrivate');
//         break;

//       case 'events':
//         const events = await Event.find(searchQuery)
//           .select('title description date location organizer')
//           .populate('organizer', 'name username');
//         results.push(...events.map(event => ({ ...event.toObject(), type: 'event' })));
//         break;

//       case 'posts':
//         const posts = await Post.find(searchQuery)
//           .select('title content author createdAt')
//           .populate('author', 'name username avatarUrl');
//         results.push(...posts.map(post => ({ ...post.toObject(), type: 'post' })));
//         break;

//       default: // 'all'
//         users = await User.find(searchQuery).select('name username avatarUrl role department isPrivate');
//     }

//     // For people filters, add connection status and push to results
//     if (['all', 'alumni', 'students', 'teachers'].includes(filter)) {
//       const connections = await Connection.find({
//         $or: [
//           { requesterId: req.user._id },
//           { recipientId: req.user._id }
//         ]
//       });
//       users.forEach(user => {
//         const isSelf = user._id.equals(req.user._id);
//         const connection = connections.find(conn =>
//           (conn.requesterId.equals(req.user._id) && conn.recipientId.equals(user._id)) ||
//           (conn.recipientId.equals(req.user._id) && conn.requesterId.equals(user._id))
//         );
//         let isConnected = false;
//         let isPending = false;
//         if (connection) {
//           if (connection.status === 'accepted') isConnected = true;
//           if (connection.status === 'pending') isPending = true;
//         }
//         results.push({
//           ...user.toObject(),
//           type: 'user',
//           isConnected,
//           isPending,
//           isSelf,
//           isPublic: user.isPrivate === false
//         });
//       });
//     }

//     // Sort results by relevance (you can implement more sophisticated ranking)
//     results.sort((a, b) => {
//       const aScore = calculateRelevanceScore(a, searchTerm);
//       const bScore = calculateRelevanceScore(b, searchTerm);
//       return bScore - aScore;
//     });

//     // Limit results
//     const limitedResults = results.slice(0, 20);

//     res.cookie('jwt', token, {
//       httpOnly: true,
//       secure: false,
//       sameSite: 'lax',
//       maxAge: 30 * 24 * 60 * 60 * 1000
//     });

//     res.json({ results: limitedResults });
//   } catch (error) {
//     console.error('Search error:', error);
//     res.status(500).json({ message: 'Error performing search' });
//   }
// };

// // Helper function to calculate relevance score
// const calculateRelevanceScore = (item, searchTerm) => {
//   let score = 0;
//   const searchTerms = searchTerm.toLowerCase().split(' ');

//   // Check for exact matches
//   if (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) score += 10;
//   if (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) score += 10;
//   if (item.username && item.username.toLowerCase().includes(searchTerm.toLowerCase())) score += 8;

//   // Check for partial matches
//   searchTerms.forEach(term => {
//     if (item.name && item.name.toLowerCase().includes(term)) score += 5;
//     if (item.title && item.title.toLowerCase().includes(term)) score += 5;
//     if (item.description && item.description.toLowerCase().includes(term)) score += 3;
//     if (item.content && item.content.toLowerCase().includes(term)) score += 3;
//     if (item.tags && item.tags.some(tag => tag.toLowerCase().includes(term))) score += 2;
//   });

//   // Boost recent items
//   if (item.createdAt) {
//     const daysOld = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
//     score += Math.max(0, 5 - daysOld / 30); // Boost items up to 5 months old
//   }

//   return score;
// }; 

router.get('/', (req, res) => { /* ... */ });
module.exports = router; 