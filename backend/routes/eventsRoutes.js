const express = require('express');
const { protect, teacherOrAlumni } = require('../middleware/auth');
const { createEvent, listEvents, approveEvent } = require('../controllers/eventsController');

const router = express.Router();

router.get('/', protect, listEvents);
router.post('/', protect, teacherOrAlumni, createEvent);
router.post('/:id/approve', protect, approveEvent);

module.exports = router;