const express = require('express');
const router = express.Router();
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const {
  getAnalytics, listUsers, setUserRole, deleteUser,
  listPendingPosts, approvePost
} = require('../controllers/adminController');
const { listPending } = require('../controllers/eventsController');

router.use(protect, roleMiddleware('admin'));

router.get('/analytics', getAnalytics);
router.get('/users', listUsers);
router.put('/users/:id/role', setUserRole);
router.delete('/users/:id', deleteUser);

// Pending content
router.get('/posts/pending', listPendingPosts);
router.post('/posts/:id/approve', approvePost);

router.get('/events/pending', listPending);

module.exports = router;
