// backend/routes/messageRoutes.js
// Express routes for chat APIs with multer for media. No extra files beyond uploads dir.

const express = require("express"); // [attached_file:4]
const path = require("path"); // [attached_file:4]
const fs = require("fs"); // [attached_file:4]
const multer = require("multer"); // [attached_file:4]

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
} = require("../controllers/messageController"); // [attached_file:4]

// Ensure uploads dir exists
const uploadsDir = path.join(process.cwd(), "uploads", "media"); // [attached_file:4]
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true }); // [attached_file:4]

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const name = `media-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
}); // [attached_file:4]

const fileFilter = (_req, file, cb) => {
  const ok = /image\/(jpeg|jpg|png|gif|webp)/i.test(file.mimetype);
  if (!ok) return cb(new Error("Only image files are allowed!"));
  cb(null, true);
}; // [attached_file:4]

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB // [attached_file:4]
}); // [attached_file:4]

const router = express.Router(); // [attached_file:4]

// Conversations list + presence info
router.get("/messages", getConversations); // [attached_file:4]
router.get("/messages/blocks", getBlocks); // [attached_file:4]

// Conversation and media
router.get("/messages/:userId", getMessages); // [attached_file:4]
router.get("/media/:userId", getMedia); // [attached_file:4]

// Send with optional media
router.post("/messages", upload.single("media"), sendMessage); // [attached_file:4]

// Delete single and bulk
router.delete("/messages/:messageId", deleteMessage); // [attached_file:4]
router.delete("/messages/bulk-delete", express.json(), bulkDelete); // [attached_file:4]

// React to message
router.post("/messages/react", express.json(), react); // [attached_file:4]

// Delete chat
router.delete("/messages/chat/:userId", deleteChat); // [attached_file:4]

// Report user and block/unblock
router.post("/report", express.json(), report); // [attached_file:4]
router.post("/block", express.json(), block); // [attached_file:4]

// Static serve for uploaded media (optional: serve via main app)
// In main app, ensure: app.use('/uploads/media', express.static(path.join(process.cwd(),'uploads','media')));

module.exports = router; // [attached_file:4]
