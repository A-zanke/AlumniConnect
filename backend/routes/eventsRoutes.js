const express = require('express');
const path = require('path');
const multer = require('multer');
const { protect, teacherOrAlumni } = require('../middleware/auth');
const { createEvent, listEvents, approveEvent, getEventById, rsvpEvent, updateEvent, deleteEvent } = require('../controllers/eventsController');

const router = express.Router();

// Multer storage for event images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../uploads');
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'event-' + unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

router.get('/', protect, listEvents);
router.post('/', protect, teacherOrAlumni, upload.single('image'), createEvent);
router.put('/:id', protect, teacherOrAlumni, upload.single('image'), updateEvent);
router.delete('/:id', protect, teacherOrAlumni, deleteEvent);
router.get('/:eventId', protect, getEventById);
router.post('/:eventId/rsvp', protect, rsvpEvent);

module.exports = router;
