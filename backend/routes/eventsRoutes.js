const express = require('express');
const path = require('path');
const multer = require('multer');
const { protect, teacherOrAlumni, admin: adminOnly } = require('../middleware/auth');
const {
  createEvent,
  listEvents,
  listMyEvents,
  approveEvent,
  rejectEvent,
  getEventById,
  rsvpEvent,
  updateEvent,
  deleteEvent
} = require('../controllers/eventsController');

const router = express.Router();

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

// Important: specific routes BEFORE param routes to avoid conflicts
router.get('/', protect, listEvents);
router.get('/mine', protect, listMyEvents);
router.get('/:eventId', protect, getEventById);

router.post('/', protect, teacherOrAlumni, upload.single('image'), createEvent);
router.put('/:id', protect, teacherOrAlumni, upload.single('image'), updateEvent);
router.delete('/:id', protect, teacherOrAlumni, deleteEvent);

router.post('/:eventId/rsvp', protect, rsvpEvent);

// Admin approvals
router.put('/:eventId/approve', protect, adminOnly, approveEvent);
router.put('/:eventId/reject', protect, adminOnly, rejectEvent);
router.post('/:eventId/approve', protect, adminOnly, approveEvent);
router.post('/:eventId/reject', protect, adminOnly, rejectEvent);

module.exports = router;
