const express = require('express');
const path = require('path');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
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
  deleteEvent,
  registerForEvent,
  getEventRegistrations,
  markAttendance,
  downloadRegistrationsCSV,
  getMyRegisteredEvents,
  checkRegistration
} = require('../controllers/eventsController');

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'alumni-connect/events',
    resource_type: 'image',
    public_id: `event_${Date.now()}`,
    overwrite: false,
  }),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Important: specific routes BEFORE param routes to avoid conflicts
// Most specific routes first to prevent param matching
router.get('/registered/mine', protect, getMyRegisteredEvents);
router.get('/mine', protect, listMyEvents);
router.get('/', protect, listEvents);
router.get('/:eventId', protect, getEventById);

router.post('/', protect, teacherOrAlumni, upload.single('image'), createEvent);
router.put('/:id', protect, teacherOrAlumni, upload.single('image'), updateEvent);
router.delete('/:id', protect, teacherOrAlumni, deleteEvent);

router.post('/:eventId/rsvp', protect, rsvpEvent);

// Registration endpoints
router.post('/:eventId/register', protect, registerForEvent);
router.get('/:eventId/check-registration', protect, checkRegistration);
router.get('/:eventId/registrations', protect, getEventRegistrations);
router.get('/:eventId/registrations/download', protect, downloadRegistrationsCSV);
router.put('/registrations/:registrationId/attendance', protect, markAttendance);

// Admin approvals
router.put('/:eventId/approve', protect, adminOnly, approveEvent);
router.put('/:eventId/reject', protect, adminOnly, rejectEvent);
router.post('/:eventId/approve', protect, adminOnly, approveEvent);
router.post('/:eventId/reject', protect, adminOnly, rejectEvent);

module.exports = router;
