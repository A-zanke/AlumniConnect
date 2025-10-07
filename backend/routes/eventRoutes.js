const express = require("express");
const {
  createEvent,
  getEventsForUser,
  listMyEvents,
  getEventById,
  rsvpEvent,
  updateEvent,
  deleteEvent,
  listPending,
  approveEvent,
  rejectEvent
} = require("../controllers/eventsController");
const { protect, authorize } = require("../middleware/auth"); // Assuming auth middleware exists
const router = express.Router();

// Protected routes
router.use(protect);

// Create Event
router.post("/", createEvent);

// Get events for current user based on audience
router.get("/", getEventsForUser);

// Get my created events
router.get("/my", listMyEvents);

// Get event by ID
router.get("/:id", getEventById);

// RSVP to event
router.post("/:id/rsvp", rsvpEvent);

// Update event
router.put("/:id", updateEvent);

// Delete event
router.delete("/:id", deleteEvent);

// Admin routes
router.use(authorize("admin"));

// List pending events
router.get("/pending", listPending);

// Approve event
router.put("/:id/approve", approveEvent);

// Reject event
router.put("/:id/reject", rejectEvent);

module.exports = router;
