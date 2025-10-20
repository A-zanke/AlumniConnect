// c:/Users/ASUS/Downloads/Telegram Desktop/AlumniConnect/AlumniConnect/backend/routes/messagesRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
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
  getStarredMessages,
  bulkDeleteChats,
  bulkBlockUsers,
  bulkReportUsers,
} = require("../controllers/messagesController");

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Configure enhanced multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, "../uploads/messages");
    ensureDirectoryExists(uploadsDir);

    // Create subdirectories based on file type
    let subDir = "documents";
    if (file.mimetype.startsWith("image/")) subDir = "images";
    else if (file.mimetype.startsWith("video/")) subDir = "videos";
    else if (file.mimetype.startsWith("audio/")) subDir = "audio";

    const finalDir = path.join(uploadsDir, subDir);
    ensureDirectoryExists(finalDir);
    cb(null, finalDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, "_")
      .substring(0, 50); // Limit filename length
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10, // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    const mime = file.mimetype || "";

    // Enhanced file type support
    const allowedTypes = {
      // Images
      images: /^image\/(jpeg|jpg|png|gif|webp|svg\+xml|bmp|tiff)$/i,
      // Videos
      videos:
        /^video\/(mp4|webm|ogg|quicktime|x-msvideo|x-ms-wmv|3gpp|x-flv)$/i,
      // Audio
      audio: /^audio\/(mpeg|wav|ogg|m4a|aac|flac|wma|opus)$/i,
      // Documents
      documents:
        /^application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|vnd\.ms-powerpoint|vnd\.openxmlformats-officedocument\.presentationml\.presentation|zip|x-rar-compressed|x-7z-compressed|json|xml)$/i,
      // Text files
      text: /^text\/(plain|csv|html|css|javascript|xml)$/i,
    };

    const isAllowed = Object.values(allowedTypes).some((regex) =>
      regex.test(mime)
    );

    if (isAllowed) {
      return cb(null, true);
    }

    cb(
      new Error(
        `File type ${mime} not supported! Allowed types: images, videos, audio, documents, text files`
      )
    );
  },
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File too large. Maximum size is 100MB",
        success: false,
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        message: "Too many files. Maximum is 10 files per message",
        success: false,
      });
    }
  }

  if (error.message.includes("File type")) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }

  next(error);
};

// Validation middleware for bulk actions
const validateBulkAction = (req, res, next) => {
  const { action, userIds } = req.body;
  if (!action || !["delete", "block", "report"].includes(action)) {
    return res.status(400).json({
      message: "Invalid action. Must be 'delete', 'block', or 'report'",
      success: false,
    });
  }
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res
      .status(400)
      .json({ message: "userIds must be a non-empty array", success: false });
  }
  next();
};

// Routes

// Get conversations list with unread counts
router.get("/", protect, getConversations);

// Get blocked users
router.get("/blocks", protect, getBlocks);

// Search messages
router.get("/search", protect, searchMessages);

// Get starred messages
router.get("/starred", protect, getStarredMessages);

// Get shared media for a conversation
router.get("/media/:userId", protect, getMedia);

// Get detailed message info
router.get("/info/:messageId", protect, getMessageInfo);

// NOTE: Dynamic :userId routes MUST be defined AFTER all fixed subpaths

// React to message
router.post("/react", protect, react);

// Star/unstar message
router.post("/star", protect, starMessage);

// Pin/unpin message
router.post("/pin", protect, pinMessage);

// Forward message
router.post("/forward", protect, async (req, res) => {
  try {
    const { messageId, recipients } = req.body;

    if (!messageId || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        message: "messageId and recipients array required",
        success: false,
      });
    }

    const originalMessage = await Message.findById(messageId).populate(
      "from",
      "name username"
    );

    if (!originalMessage) {
      return res.status(404).json({
        message: "Original message not found",
        success: false,
      });
    }

    const forwardResults = [];

    for (const recipientId of recipients) {
      try {
        // Create forwarded message
        const forwardedMessage = {
          from: req.user._id,
          to: recipientId,
          content: originalMessage.content,
          attachments: originalMessage.attachments,
          messageType: originalMessage.messageType,
          forwardedFrom: {
            originalSender: originalMessage.from._id,
            forwardCount:
              (originalMessage.forwardedFrom?.forwardCount || 0) + 1,
          },
          location: originalMessage.location,
          contact: originalMessage.contact,
        };

        const newMessage = await Message.create(forwardedMessage);
        forwardResults.push({
          recipientId,
          success: true,
          messageId: newMessage._id,
        });

        // Emit real-time notification
        if (req.io) {
          req.io.to(String(recipientId)).emit("message:new", {
            message: newMessage,
            conversationId: `${req.user._id}_${recipientId}`,
            senderId: String(req.user._id),
            isForwarded: true,
          });
        }
      } catch (error) {
        forwardResults.push({
          recipientId,
          success: false,
          error: error.message,
        });
      }
    }

    return res.json({
      results: forwardResults,
      success: true,
    });
  } catch (error) {
    console.error("Error forwarding message:", error);
    return res.status(500).json({
      message: "Error forwarding message",
      success: false,
    });
  }
});

// Bulk operations
router.post("/bulk", protect, async (req, res) => {
  try {
    const { action, messageIds, data } = req.body;

    if (!action || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        message: "action and messageIds array required",
        success: false,
      });
    }

    const results = [];

    switch (action) {
      case "star":
        for (const messageId of messageIds) {
          try {
            const message = await Message.findById(messageId);
            if (message) {
              await message.toggleStar(req.user._id);
              results.push({ messageId, success: true });
            }
          } catch (error) {
            results.push({ messageId, success: false, error: error.message });
          }
        }
        break;

      case "delete":
        return bulkDelete(req, res);

      case "forward":
        if (!data?.recipients) {
          return res.status(400).json({
            message: "recipients required for forward action",
            success: false,
          });
        }

        for (const messageId of messageIds) {
          for (const recipientId of data.recipients) {
            try {
              const originalMessage = await Message.findById(messageId);
              if (originalMessage) {
                const forwardedMessage = await Message.create({
                  from: req.user._id,
                  to: recipientId,
                  content: originalMessage.content,
                  attachments: originalMessage.attachments,
                  messageType: originalMessage.messageType,
                  forwardedFrom: {
                    originalSender: originalMessage.from,
                    forwardCount:
                      (originalMessage.forwardedFrom?.forwardCount || 0) + 1,
                  },
                });
                results.push({ messageId, recipientId, success: true });
              }
            } catch (error) {
              results.push({
                messageId,
                recipientId,
                success: false,
                error: error.message,
              });
            }
          }
        }
        break;

      default:
        return res.status(400).json({
          message: "Invalid action. Supported: star, delete, forward",
          success: false,
        });
    }

    return res.json({
      action,
      results,
      success: true,
    });
  } catch (error) {
    console.error("Error in bulk operation:", error);
    return res.status(500).json({
      message: "Error in bulk operation",
      success: false,
    });
  }
});

// Bulk delete messages
router.delete("/bulk-delete", protect, bulkDelete);

// Delete entire chat
router.delete("/chat/:userId", protect, deleteChat);

// Report user/message
router.post("/report", protect, report);

// Block/unblock user
router.post("/block", protect, block);
router.post(
  "/bulk-block",
  protect,
  require("../controllers/messagesController").bulkBlockUsers
);
router.delete(
  "/bulk-delete-chats",
  protect,
  require("../controllers/messagesController").bulkDeleteChats
);
router.post(
  "/bulk-report",
  protect,
  require("../controllers/messagesController").bulkReportUsers
);

// Mark messages as read
router.post("/mark-read", protect, async (req, res) => {
  try {
    const { conversationId, messageIds } = req.body;
    const me = req.user._id;

    let query = { to: me, isRead: false };

    if (messageIds && Array.isArray(messageIds)) {
      query._id = { $in: messageIds };
    } else if (conversationId) {
      // Extract other user ID from conversation ID
      const [user1, user2] = conversationId.split("_");
      const otherId = user1 === String(me) ? user2 : user1;
      query.from = otherId;
    }

    const result = await Message.updateMany(query, {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Emit read receipts
    if (req.io && conversationId) {
      const [user1, user2] = conversationId.split("_");
      const otherId = user1 === String(me) ? user2 : user1;

      req.io.to(otherId).emit("messages:readReceipt", {
        conversationId,
        readerId: String(me),
        readAt: new Date(),
        count: result.modifiedCount,
      });
    }

    return res.json({
      markedCount: result.modifiedCount,
      success: true,
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return res.status(500).json({
      message: "Error marking messages as read",
      success: false,
    });
  }
});

// Mark messages as delivered
router.post("/mark-delivered", protect, async (req, res) => {
  try {
    const { messageIds } = req.body;
    const me = req.user._id;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        message: "messageIds array required",
        success: false,
      });
    }

    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        to: me,
        deliveredAt: null,
      },
      {
        $set: {
          deliveredAt: new Date(),
        },
      }
    );

    // Emit delivery receipts to senders
    if (req.io) {
      const messages = await Message.find({ _id: { $in: messageIds } }).select(
        "from messageId"
      );

      messages.forEach((msg) => {
        req.io.to(String(msg.from)).emit("message:delivered", {
          messageId: String(msg._id),
          clientKey: msg.messageId,
          status: "delivered",
        });
      });
    }

    return res.json({
      deliveredCount: result.modifiedCount,
      success: true,
    });
  } catch (error) {
    console.error("Error marking messages as delivered:", error);
    return res.status(500).json({
      message: "Error marking messages as delivered",
      success: false,
    });
  }
});

// Get conversation settings
router.get("/settings/:userId", protect, async (req, res) => {
  try {
    const me = req.user._id;
    const other = req.params.userId;

    // Check if blocked
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: me, blocked: other },
        { blocker: other, blocked: me },
      ],
    });

    // Get pinned messages count
    const pinnedCount = await Message.countDocuments({
      $or: [
        { from: me, to: other },
        { from: other, to: me },
      ],
      isPinned: true,
      deletedForEveryone: false,
      deletedFor: { $ne: me },
    });

    // Get shared media count
    const mediaCount = await Message.countDocuments({
      $or: [
        { from: me, to: other },
        { from: other, to: me },
      ],
      "attachments.0": { $exists: true },
      deletedForEveryone: false,
      deletedFor: { $ne: me },
    });

    return res.json({
      settings: {
        isBlocked: !!isBlocked,
        blockedBy: isBlocked ? String(isBlocked.blocker) : null,
        pinnedMessagesCount: pinnedCount,
        sharedMediaCount: mediaCount,
        // Add more settings as needed
        notifications: true, // You can implement this
        wallpaper: null, // You can implement custom wallpapers
      },
      success: true,
    });
  } catch (error) {
    console.error("Error fetching conversation settings:", error);
    return res.status(500).json({
      message: "Error fetching conversation settings",
      success: false,
    });
  }
});

// Update conversation settings
router.put("/settings/:userId", protect, async (req, res) => {
  try {
    const me = req.user._id;
    const other = req.params.userId;
    const { notifications, wallpaper } = req.body;

    // Here you can implement conversation-specific settings
    // For now, we'll just return success

    return res.json({
      message: "Settings updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error updating conversation settings:", error);
    return res.status(500).json({
      message: "Error updating conversation settings",
      success: false,
    });
  }
});

// Bulk actions route
router.post("/bulk-actions", protect, validateBulkAction, async (req, res) => {
  try {
    const { action, userIds } = req.body;

    let result;
    switch (action) {
      case "delete":
        result = await bulkDeleteChats(req, res);
        break;
      case "block":
        result = await bulkBlockUsers(req, res);
        break;
      case "report":
        result = await bulkReportUsers(req, res);
        break;
    }

    // Since the controller functions handle the response, we don't need to return here
    // But to match the requirement, we can return the result if needed
    // Actually, the controller functions call res.json, so we can just let them handle it
  } catch (error) {
    console.error("Error in bulk actions:", error);
    return res.status(500).json({
      message: "Error in bulk actions",
      success: false,
    });
  }
});

// Bulk delete chats
router.delete("/bulk-delete-chats", protect, bulkDeleteChats);

// Bulk block users
router.post("/bulk-block", protect, bulkBlockUsers);

// Bulk report users
router.post("/bulk-report", protect, bulkReportUsers);

// Health check route
router.get("/health", async (req, res) => {
  try {
    const healthStatus = {
      fileSystem: false,
      database: false,
      socketIO: false,
    };

    // Check uploads directory
    const uploadsDir = path.join(__dirname, "../uploads");
    try {
      await fs.promises.access(
        uploadsDir,
        fs.constants.F_OK | fs.constants.W_OK
      );
      healthStatus.fileSystem = true;
    } catch (err) {
      console.error("Uploads directory check failed:", err);
    }

    // Check database connection
    try {
      const mongoose = require("mongoose");
      if (mongoose.connection.readyState === 1) {
        healthStatus.database = true;
      }
    } catch (err) {
      console.error("Database check failed:", err);
    }

    // Check socket.io
    if (req.io) {
      healthStatus.socketIO = true;
    }

    const overallStatus =
      healthStatus.fileSystem && healthStatus.database && healthStatus.socketIO
        ? "healthy"
        : "unhealthy";

    return res.json({
      status: overallStatus,
      checks: healthStatus,
      success: true,
    });
  } catch (error) {
    console.error("Error in health check:", error);
    return res.status(500).json({
      status: "error",
      message: "Health check failed",
      success: false,
    });
  }
});

module.exports = router;
