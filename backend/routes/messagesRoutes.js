// backend/routes/messagesRoutes.js
// Express routes for chat APIs with multer for media. No extra code files are created.

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { protect } = require("../middleware/authMiddleware");

const {
  getMessages,
  sendMessage,
  deleteMessage,
  getConversations,
  react,
  bulkDelete,
  report,
  block,
  getMedia,
  deleteChat,
  getBlocks,
} = require("../controllers/messagesController");

// Ensure uploads/media dir exists (server serves /uploads/*)
const uploadsDir = path.join(__dirname, "..", "uploads", "media");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const name = `media-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req, file, cb) => {
  const ok = /image\/(jpeg|jpg|png|gif|webp)/i.test(file.mimetype);
  if (!ok) return cb(new Error("Only image files are allowed!"));
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB
});

const router = express.Router();

// All routes protected
router.use(protect);

// Conversations list + presence info
router.get("/", getConversations);
router.get("/blocks", getBlocks);

// Conversation and media (order matters: static paths first)
router.get("/media/:userId", getMedia);
router.get("/:userId", getMessages);

// React to message (avoid being captured by /:userId)
router.post("/react", react);

// Send with optional media (support both `/` and `/:userId`)
router.post(
  "/",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "media", maxCount: 1 },
  ]),
  sendMessage
);
router.post(
  "/:userId",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "media", maxCount: 1 },
  ]),
  sendMessage
);

// Delete single and bulk (bulk route before dynamic id)
router.delete("/bulk-delete", bulkDelete);
router.delete("/:messageId", deleteMessage);

// Delete chat
router.delete("/chat/:userId", deleteChat);

// Report user and block/unblock
router.post("/report", report);
router.post("/block", block);

module.exports = router;
