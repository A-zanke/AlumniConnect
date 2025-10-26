// backend/routes/postsRoutes.js
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const rateLimit = require("express-rate-limit");

const {
  getAllPosts,
  getSavedPosts,
  createPost,
  reactToPost,
  commentOnPost,
  deletePost,
  toggleBookmark,
  searchUsers,
  searchPosts,
  getMyAnalytics,
  getReactions,
  getPostAnalytics,
  sharePost,
  reportPost,
  reactToComment,
  getPopularTags,
  searchTags,
} = require("../controllers/postsController");

const { protect } = require("../middleware/authMiddleware");
const { hasRole } = require("../middleware/roleMiddleware");

// Upload pipeline (Cloudinary via multer)
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// If Cloudinary is not configured, fall back to disk storage to avoid 500s.
let upload;
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "alumni-connect/posts",
      resource_type: "auto",
      allowed_formats: [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "mp4",
        "mov",
        "webm",
        "pdf",
        "doc",
        "docx",
      ],
    },
  });
  upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit
} else {
  // Enforce Cloudinary-only; reject if not configured to avoid local storage
  console.error(
    "[postsRoutes] Cloudinary env not found. Rejecting media uploads to avoid local storage."
  );
  const rejectStorage = multer.memoryStorage();
  upload = multer({ storage: rejectStorage });
}

// Rate limiter for report endpoint to prevent abuse
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 reports per windowMs
  message: "Too many reports submitted from this IP, please try again later.",
});

// Rate limiter for search endpoints to prevent abuse
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 searches per windowMs
  message: "Too many searches from this IP, please try again later.",
});

// Routes
router.get("/", protect, getAllPosts);
router.get("/saved", protect, getSavedPosts);
router.get("/users/search", protect, searchUsers); // For @mentions

// New tag routes
router.get("/tags/popular", getPopularTags);
router.get("/tags/search", protect, searchLimiter, searchTags);

router.post(
  "/",
  protect,
  hasRole(["alumni", "teacher", "admin"]), // only these roles can create
  upload.array("media", 5), // IMPORTANT: field name must be "media"
  [check("content").optional({ nullable: true }).isLength({ max: 5000 })],
  createPost
);

router.post("/:id/react", protect, reactToPost);
router.post(
  "/:id/comment",
  protect,
  [check("content").notEmpty()],
  commentOnPost
);
router.delete("/:id", protect, deletePost);
router.post("/:id/bookmark", protect, toggleBookmark);

// New routes for enhanced features
router.get("/search", protect, searchPosts);
router.get("/my-analytics", protect, getMyAnalytics);
router.get("/:id/reactions", protect, getReactions);
router.get("/:id/analytics", protect, getPostAnalytics); // Authorization handled in controller for owners/admins
router.post("/:id/share", protect, sharePost);
router.post("/:id/report", protect, reportLimiter, reportPost);
router.post("/comments/:commentId/react", protect, reactToComment);

module.exports = router;
