// backend/routes/postsRoutes.js
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");

const {
  getAllPosts,
  getSavedPosts,
  createPost,
  reactToPost,
  commentOnPost,
  deletePost,
  toggleBookmark,
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
      ],
    },
  });
  upload = multer({ storage });
} else {
  // Enforce Cloudinary-only; reject if not configured to avoid local storage
  console.error("[postsRoutes] Cloudinary env not found. Rejecting media uploads to avoid local storage.");
  const rejectStorage = multer.memoryStorage();
  upload = multer({ storage: rejectStorage });
}

// Routes
router.get("/", protect, getAllPosts);
router.get("/saved", protect, getSavedPosts);

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

module.exports = router;
