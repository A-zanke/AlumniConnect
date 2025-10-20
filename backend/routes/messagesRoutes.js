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
  starMessage,
  pinMessage,
  getMessageInfo,
  deleteChat,
  report,
  block,
  getMedia,
  getBlocks,
  searchMessages,
} = require("../controllers/messagesController");

// Configure multer for file uploads with enhanced support
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, "../uploads/messages");
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `message-${uniqueSuffix}-${name}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5, // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    const mime = file.mimetype || "";
    const isImage = /image\/(jpeg|jpg|png|gif|webp|svg)/i.test(mime);
    const isVideo = /video\/(mp4|webm|ogg|quicktime|x-msvideo)/i.test(mime);
    const isAudio = /audio\/(mpeg|wav|ogg|m4a|aac)/i.test(mime);
    const isPdf = mime === "application/pdf";
    const isDoc =
      /application\/(msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)/i.test(
        mime
      );
    const isPpt =
      /application\/(vnd\.ms-powerpoint|vnd\.openxmlformats-officedocument\.presentationml\.presentation)/i.test(
        mime
      );
    const isSpreadsheet =
      /application\/(vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)/i.test(
        mime
      );
    const isArchive =
      /application\/(zip|x-rar-compressed|x-7z-compressed)/i.test(mime);
    const isText = /text\/(plain|csv)/i.test(mime);

    if (
      isImage ||
      isVideo ||
      isAudio ||
      isPdf ||
      isDoc ||
      isPpt ||
      isSpreadsheet ||
      isArchive ||
      isText
    ) {
      return cb(null, true);
    }
    cb(new Error("File type not supported!"));
  },
});

// Conversations list + total unread
router.get("/", protect, getConversations);

// Get blocked users
router.get("/blocks", protect, getBlocks);

// Search messages
router.get("/search", protect, searchMessages);

// Media listing for chat
router.get("/media/:userId", protect, getMedia);

// Get message info
router.get("/info/:messageId", protect, getMessageInfo);

// Get messages between current user and another user
router.get("/:userId", protect, getMessages);

// Send a message with optional files (enhanced file support)
router.post(
  "/:userId",
  protect,
  upload.fields([
    { name: "image", maxCount: 5 },
    { name: "media", maxCount: 5 },
    { name: "document", maxCount: 5 },
    { name: "audio", maxCount: 3 },
  ]),
  sendMessage
);

// React to message
router.post("/react", protect, react);

// Star/unstar message
router.post("/star", protect, starMessage);

// Pin/unpin message
router.post("/pin", protect, pinMessage);

// Bulk delete and single delete
router.delete("/bulk-delete", protect, bulkDelete);
router.delete("/:messageId", protect, deleteMessage);

// Delete entire chat
router.delete("/chat/:userId", protect, deleteChat);

// Report and block
router.post("/report", protect, report);
router.post("/block", protect, block);

module.exports = router;
