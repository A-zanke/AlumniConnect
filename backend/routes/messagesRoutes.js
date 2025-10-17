const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { protect } = require("../middleware/authMiddleware");
const {
  getMessages,
  sendMessage,
  deleteMessage,
  getConversations,
  bulkDelete,
  react,
  deleteChat,
  report,
  block,
  getMedia,
  getBlocks,
} = require("../controllers/messagesController");

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, "../uploads/messages");
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "message-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const mime = file.mimetype || "";
    const isImage = /image\/(jpeg|jpg|png|gif|webp)/i.test(mime);
    const isVideo = /video\/(mp4|webm|ogg|quicktime)/i.test(mime);
    const isPdf = mime === "application/pdf";
    const isDoc = /application\/(msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/i.test(mime);
    const isPpt = /application\/(vnd\.ms-powerpoint|vnd\.openxmlformats-officedocument\.presentationml\.presentation)/i.test(mime);
    if (isImage || isVideo || isPdf || isDoc || isPpt) return cb(null, true);
    cb(new Error("Only images, videos, and documents are allowed!"));
  },
});

// Conversations list
router.get("/", protect, getConversations);
router.get("/blocks", protect, getBlocks);

// Media listing for chat
router.get("/media/:userId", protect, getMedia);

// Get messages between current user and another user
router.get("/:userId", protect, getMessages);

// Send a message with optional files (image/video/doc)
router.post(
  "/:userId",
  protect,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "media", maxCount: 1 },
  ]),
  sendMessage
);

// React to message
router.post("/react", protect, react);

// Bulk delete and single delete
router.delete("/bulk-delete", protect, bulkDelete);
router.delete("/:messageId", protect, deleteMessage);

// Delete entire chat
router.delete("/chat/:userId", protect, deleteChat);

// Report and block
router.post("/report", protect, report);
router.post("/block", protect, block);

module.exports = router;
