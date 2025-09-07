const express = require('express');
const path = require('path');
const multer = require('multer');
const { protect, teacherOrAlumni, adminOnly } = require('../middleware/auth');
const { 
  createEvent, 
  listEvents, 
  approveEvent, 
  rejectEvent,
  getEventById, 
  rsvpEvent, 
  updateEvent, 
  deleteEvent,
  listPending 
} = require('../controllers/eventsController');

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

// Public routes
router.get('/', protect, listEvents);
router.get('/:eventId', protect, getEventById);
router.post('/:eventId/rsvp', protect, rsvpEvent);

// Teacher/Alumni routes
router.post('/', protect, teacherOrAlumni, upload.single('image'), createEvent);
router.put('/:id', protect, teacherOrAlumni, upload.single('image'), updateEvent);
router.delete('/:id', protect, teacherOrAlumni, deleteEvent);

// Admin routes for event approval
router.get('/admin/pending', protect, adminOnly, listPending);
router.put('/:eventId/approve', protect, adminOnly, approveEvent);
router.put('/:eventId/reject', protect, adminOnly, rejectEvent);

module.exports = router;
