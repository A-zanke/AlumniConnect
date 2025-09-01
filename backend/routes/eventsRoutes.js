const express = require('express');
const router = express.Router();
const { protect, roleMiddleware } = require('../middleware/authMiddleware');
const { createEvent, listEvents, approveEvent, rsvpEvent } = require('../controllers/eventsController');

router.get('/', protect, listEvents);
router.post('/', protect, roleMiddleware('teacher', 'alumni', 'admin'), createEvent);
router.post('/:id/rsvp', protect, rsvpEvent);
router.post('/:id/approve', protect, roleMiddleware('admin'), approveEvent);

module.exports = router;

