const express = require("express");
const router = express.Router();

// Middleware
const { protect, roleMiddleware } = require("../middleware/authMiddleware");

// Controllers
const {
  getAnalytics,
  listUsers,
  deleteUser,
  exportUsers,
  listAllEvents,
  listEventRequests,
  approveEvent,
  rejectEvent,
  deleteEvent,
  listPendingPosts,
  approvePost,
  deletePost,
  listAllPosts,
  exportEvents,
  listForumPosts,
  deleteForumPost,
  exportForum,
  listReports,
  resolveReport,
  deleteReport,
  listTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getEventByIdAdmin,
} = require("../controllers/adminController");

// Admin-only routes
router.use(protect, roleMiddleware("admin"));

// ===================== Analytics =====================
router.get("/analytics", getAnalytics);

// ===================== Users =====================
router.get("/users", listUsers);
router.delete("/users/:id", deleteUser);
router.get("/export/users", exportUsers);

// ===================== Events =====================
router.get("/events", listAllEvents);
router.get("/events/pending", async (req, res, next) => next());
router.put("/events/:id/approve", approveEvent);
router.put("/events/:id/reject", rejectEvent);
router.delete("/events/:id", deleteEvent);
router.get("/export/events", exportEvents);
router.get("/events/:id", getEventByIdAdmin);

// ===== Event Requests (Alumni-submitted pending events) =====
router.get("/event-requests", listEventRequests);
router.put("/event-requests/:id/approve", approveEvent);
router.put("/event-requests/:id/reject", rejectEvent);
router.delete("/event-requests/:id", deleteEvent);

// ===================== Posts moderation =====================
router.get("/posts", listAllPosts);
router.get("/posts/pending", listPendingPosts);
router.post("/posts/:id/approve", approvePost);
router.delete("/posts/:id", deletePost);

// ===================== Forum moderation =====================
router.get("/forum/posts", listForumPosts);
router.get("/forums", listForumPosts);
router.delete("/forum/posts/:id", deleteForumPost);
router.delete("/forums/:id", deleteForumPost);
router.get("/export/forum", exportForum);

// ===================== Reports Management =====================
router.get("/reports", listReports);
router.put("/reports/:id/resolve", resolveReport);
router.delete("/reports/:id", deleteReport);

// ===================== Testimonials Management =====================
router.get("/testimonials", listTestimonials);
router.post("/testimonials", createTestimonial);
router.put("/testimonials/:id", updateTestimonial);
router.delete("/testimonials/:id", deleteTestimonial);

// Export the router
module.exports = router;
