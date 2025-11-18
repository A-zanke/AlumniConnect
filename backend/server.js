const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const connectDB = require("./config/db");
const { validateEnv } = require("./config/validateEnv");
const { errorHandler } = require("./middleware/errorHandler");
const { sanitizeInput, preventInjection, csrfProtection, requestSizeLimit } = require("./middleware/security");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const Notification = require("./models/Notification");

// Load environment variables
dotenv.config();

// Validate environment variables
validateEnv();

connectDB();

// Initialize Express
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  ...(process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  "http://localhost:3000",
].filter(Boolean);

const io = new Server(http, {
  cors: { origin: allowedOrigins, credentials: true },
});
global.io = io;

// Middleware to access io in controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Security Middleware
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Prevent XSS attacks
app.use(hpp()); // Prevent HTTP Parameter Pollution

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: ["Content-Length", "Content-Type"],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Enhanced Helmet configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// Whitelist auth/OTP/search + event writes + ALL admin routes
const AUTH_OTP_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/auth/send-personal-email-otp",
  "/api/auth/verify-personal-email-otp",
  "/api/auth/forgot/send-otp",
  "/api/auth/forgot/verify-otp",
  "/api/auth/forgot/reset",
  "/api/search/users",
  "/api/search/departments",
  "/api/events", // POST
]);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 500 : 1000,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  skip: (req) => {
    // Disable rate limit entirely in development for easier local testing
    if (process.env.NODE_ENV !== "production") return true;

    if (req.method === "OPTIONS") return true;
    const p = req.path || "";

    // Skip all /api/admin/* requests
    if (p.startsWith("/api/admin")) return true;

    // Skip all auth routes
    if (p.startsWith("/api/auth")) return true;

    // Skip POSTs for whitelisted paths
    if (req.method === "POST" && AUTH_OTP_PATHS.has(p)) return true;

    // Skip PUT/DELETE for /api/events/:id
    if (
      (req.method === "PUT" || req.method === "DELETE") &&
      /^\/api\/events\/[^/]+$/.test(p)
    )
      return true;

    return false;
  },
});

// Apply limiter before routes
app.use(globalLimiter);

// Specific rate limiters for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, please try again after 15 minutes.",
  skipSuccessfulRequests: true,
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Too many OTP requests, please try again after an hour.",
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many upload requests, please try again later.",
});

// Logging in development
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Security middleware
app.use(requestSizeLimit);
app.use(sanitizeInput);
app.use(preventInjection);
app.use(csrfProtection);

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const connectionRoutes = require("./routes/connectionRoutes");
const searchRoutes = require("./routes/searchRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const postsRoutes = require("./routes/postsRoutes");
const eventsRoutes = require("./routes/eventsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const messagesRoutes = require("./routes/messagesRoutes");
const avatarRoutes = require("./routes/avatarRoutes");
const forumRoutes = require("./routes/forumRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const aiRoutes = require("./routes/aiRoutes");
const recommendationsRoutes = require("./routes/recommendationsRoutes");

app.use("/api/forum", forumRoutes);
app.use("/api/chatbot", chatbotRoutes);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api", avatarRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/recommendations", recommendationsRoutes);

// NOTE: Local '/uploads' static serving has been removed.

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend", "build", "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("API is running...");
  });
}

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
http.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// Socket.IO basic chat
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Message = require("./models/Message");
const Thread = require("./models/Thread");
const Block = require("./models/Block");
const { encryptMessage, compactToPem } = require("./services/encryptionService");

const unreadTotalDebounce = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id");
    if (!user) return next(new Error("User not found"));
    socket.userId = user._id.toString();
    next();
  } catch (e) {
    next(new Error("Auth failed"));
  }
});

io.on("connection", (socket) => {
  // Join personal room for notifications
  socket.join(socket.userId);

  // Join notification room
  socket.join(`notif_${socket.userId}`);

  // Join room by role
  socket.on("joinRoom", (role) => {
    socket.join(role); // students join "student" room, etc.
  });

  // For students, join department-year room for section notifications
  socket.on("joinSectionRoom", ({ department, year }) => {
    if (department && year) {
      const room = `student-${department}-${year}`;
      socket.join(room);
    }
  });

  // For teachers, join department room
  socket.on("joinTeacherRoom", ({ department }) => {
    if (department) {
      const room = `teacher-${department}`;
      socket.join(room);
    }
  });

  // For alumni, join department-graduationYear room
  socket.on("joinAlumniRoom", ({ department, graduationYear }) => {
    if (department && graduationYear) {
      const room = `alumni-${department}-${graduationYear}`;
      socket.join(room);
    }
  });

  // Notification subscribe event
  socket.on("notification:subscribe", () => {
    socket.join(`notif_${socket.userId}`);
  });

  // Chat: idempotent send + status lifecycle + presence/typing
  socket.on("typing", ({ recipientId }) => {
    if (!recipientId) return;
    io.to(recipientId).emit("typing:update", {
      from: socket.userId,
      typing: true,
      at: Date.now(),
    });
  });

  socket.on("stop_typing", ({ recipientId }) => {
    if (!recipientId) return;
    io.to(recipientId).emit("typing:update", {
      from: socket.userId,
      typing: false,
      at: Date.now(),
    });
  });

  socket.on("presence:ping", () => {
    io.emit("presence:update", {
      userId: socket.userId,
      lastSeenAt: Date.now(),
    });
  });

  const handleSend = async (payload) => {
    try {
      const from = socket.userId;
      const { to, content, attachments, clientKey } = payload || {};
      if (!to || (!content && !attachments)) return;
      const me = await User.findById(from).select("connections");
      if (!me) return;
      const isConnected = me.connections.some((id) => id.toString() === to);
      if (!isConnected) return;
      // Block checks
      // Validate ObjectIds to avoid casting errors if payloads are wrong
      const isValidFrom = /^[0-9a-fA-F]{24}$/.test(String(from));
      const isValidTo = /^[0-9a-fA-F]{24}$/.test(String(to));
      let ab = null;
      let ba = null;
      if (isValidFrom && isValidTo) {
        [ab, ba] = await Promise.all([
          Block.findOne({ blocker: from, blocked: to }).lean(),
          Block.findOne({ blocker: to, blocked: from }).lean(),
        ]);
      }
      if (ab || ba) return;
      const participants = [String(from), String(to)].sort();
      
      // Server-side encryption
      let encryptedData = null;
      let senderEncryptionData = null;
      const originalContent = content || "";
      let plainContent = originalContent;
      
      if (plainContent.trim()) {
        try {
          // Get recipient & sender public keys
          const [recipient, sender] = await Promise.all([
            User.findById(to).select('publicKey'),
            User.findById(from).select('publicKey'),
          ]);
          
          if (recipient && recipient.publicKey) {
            // Convert compact key back to PEM format
            const recipientPublicKey = compactToPem(recipient.publicKey, 'public');
            
            // Encrypt the message with recipient's public key
            const encrypted = encryptMessage(plainContent, recipientPublicKey);
            
            // Validate encryption data completeness
            if (encrypted && encrypted.encryptedMessage && encrypted.encryptedAESKey && encrypted.iv) {
              encryptedData = {
                encryptedMessage: encrypted.encryptedMessage,
                encryptedAESKey: encrypted.encryptedAESKey,
                iv: encrypted.iv,
                version: encrypted.version || 'v1'
              };
              
              // Clear plain content only if encryption succeeded
              plainContent = '';
              if (process.env.NODE_ENV !== 'production') {
                console.log('🔒 Socket message encrypted successfully for recipient');
              }

              if (sender && sender.publicKey) {
                try {
                  const senderPublicKey = compactToPem(sender.publicKey, 'public');
                  const senderEncrypted = encryptMessage(originalContent, senderPublicKey);
                  if (senderEncrypted && senderEncrypted.encryptedMessage && senderEncrypted.encryptedAESKey && senderEncrypted.iv) {
                    senderEncryptionData = {
                      encryptedMessage: senderEncrypted.encryptedMessage,
                      encryptedAESKey: senderEncrypted.encryptedAESKey,
                      iv: senderEncrypted.iv,
                      version: senderEncrypted.version || 'v1',
                    };
                  } else {
                    if (process.env.NODE_ENV !== 'production') {
                      console.warn('⚠️ Socket: sender encryption produced incomplete data');
                    }
                  }
                } catch (senderErr) {
                  if (process.env.NODE_ENV !== 'production') {
                    console.warn('⚠️ Socket: Failed to encrypt sender copy:', senderErr.message);
                  }
                }
              } else {
                if (process.env.NODE_ENV !== 'production') {
                  console.warn('⚠️ Socket: Sender has no public key - cannot retain self-encrypted copy');
                }
              }
            } else {
              console.error('❌ Socket encryption returned incomplete data - sending as plaintext');
              encryptedData = null;
            }
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('⚠️ Socket: Recipient has no public key - sending unencrypted');
            }
          }
        } catch (encryptError) {
          console.error('❌ Socket encryption failed:', encryptError.message);
          encryptedData = null;
        }
      }
      
      const messageData = {
        from,
        to,
        content: plainContent, // Plaintext cleared when encryption succeeds
        isRead: false,
      };
      
      if (attachments && attachments.length > 0) {
        messageData.attachments = attachments;
      }
      
      // Add encryption data if message was encrypted AND clear content
      if (encryptedData && encryptedData.encryptedMessage && encryptedData.encryptedAESKey && encryptedData.iv) {
        messageData.encrypted = true;
        messageData.encryptionData = encryptedData;
        if (senderEncryptionData) {
          messageData.senderEncryptionData = senderEncryptionData;
        }
        // Plaintext already cleared from content – database stores only encrypted payload
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Socket: Message will be stored encrypted (plaintext cleared)');
        }
      } else {
        messageData.encrypted = false;
        messageData.encryptionData = null;
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Socket: Message will be stored as plaintext');
        }
      }
      // Ensure a Thread exists without trying to $set participants in an update (avoids NotSingleValueField)
      let thread = await Thread.findOne({
        participants: { $all: participants, $size: 2 },
      });
      if (!thread) {
        thread = await Thread.create({ participants });
      }
      const threadId = String(thread._id);
      messageData.threadId = threadId;

      // Idempotent insert by (threadId, clientKey) to avoid duplicates
      const query = clientKey ? { threadId, clientKey } : { _id: undefined };
      const update = { $setOnInsert: { ...messageData, clientKey } };
      const options = { upsert: true, new: true };
      let msg = clientKey
        ? await Message.findOneAndUpdate(query, update, options)
        : await Message.create(messageData);

      // Update thread fields separately without touching participants
      thread.lastMessageAt = new Date();
      thread.lastMessage = msg._id;
      const currentUnread = thread.unreadCount?.get?.(String(to)) || thread.unreadCount?.[String(to)] || 0;
      if (thread.unreadCount?.set) thread.unreadCount.set(String(to), currentUnread + 1);
      await thread.save();
      const messagePayload = {
        conversationId: String(thread._id),
        messageId: String(msg._id),
        senderId: String(from),
        body: msg.encrypted ? null : originalContent,
        fallbackContent: originalContent,
        attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
        createdAt: msg.createdAt,
        encrypted: msg.encrypted || false,
        encryptionData: msg.encrypted ? msg.encryptionData : null,
        senderEncryptionData: msg.encrypted ? msg.senderEncryptionData || null : null,
      };
      // Acknowledge to sender: sent (include clientKey if present)
      socket.emit("message:ack", {
        id: String(msg._id),
        messageId: String(msg._id),
        status: "sent",
        clientKey: clientKey || null,
      });
      socket.emit("message:sent", {
        id: String(msg._id),
        messageId: String(msg._id),
        status: "sent",
        clientKey: clientKey || null,
      });
      // Targeted delivery only to recipient
      io.to(to).emit("message:new", messagePayload);
      // Unread update to recipient
      const newUnread =
        thread.unreadCount?.get?.(String(to)) ||
        thread.unreadCount?.[String(to)] ||
        0;
      io.to(to).emit("unread:update", {
        conversationId: String(thread._id),
        newCount: newUnread,
      });
      // If recipient is currently online (in room), then it's delivered
      const isRecipientOnline = !!io.sockets.adapter.rooms.get(String(to));
      if (isRecipientOnline) {
        io.to(from).emit("message:delivered", {
          id: String(msg._id),
          messageId: String(msg._id),
          clientKey: clientKey || null,
        });
      }
    } catch (e) {
      console.error("Socket chat error:", e);
    }
  };

  socket.on("chat:send", handleSend);
  // Alias to meet API contract
  socket.on("sendMessage", handleSend);

  // Messages markRead API via socket
  const handleMarkRead = async ({
    conversationId,
    upToMessageId,
    timestamp,
  }) => {
    try {
      const me = socket.userId;
      if (!conversationId) return;
      const thread = await Thread.findById(conversationId);
      if (!thread) return;
      const now = new Date();
      // Mark all messages in this thread addressed to me as read
      const participants = (thread.participants || []).map((p) => String(p));
      const other = participants.find((p) => p !== String(me));
      if (other) {
        await Message.updateMany(
          { from: other, to: me, isRead: false },
          { $set: { isRead: true, readAt: now } }
        );
      }
      thread.lastReadAt.set(String(me), now);
      thread.unreadCount.set(String(me), 0);
      await thread.save();
      io.to(String(me)).emit("unread:update", {
        conversationId: String(thread._id),
        newCount: 0,
      });
      // emit total unread for navbar with debouncing
      const userId = String(me);
      if (unreadTotalDebounce.has(userId)) {
        clearTimeout(unreadTotalDebounce.get(userId));
      }
      unreadTotalDebounce.set(
        userId,
        setTimeout(async () => {
          try {
            const total = await Message.countDocuments({
              to: me,
              isRead: false,
            });
            io.to(userId).emit("unread:total", { total });
          } catch {}
          unreadTotalDebounce.delete(userId);
        }, 500)
      );
      // broadcast readReceipt to participants
      for (const p of thread.participants) {
        io.to(String(p)).emit("messages:readReceipt", {
          conversationId: String(thread._id),
          readerId: String(me),
          readUpTo: now,
        });
      }
    } catch (e) {}
  };
  socket.on("messages:markRead", handleMarkRead);
  // Alias accepting same payload
  socket.on("messageSeen", handleMarkRead);

  // On connect or refresh: send unread snapshot
  (async () => {
    try {
      const threads = await Thread.find({
        participants: { $all: [socket.userId] },
      })
        .select("unreadCount")
        .lean();
      const snapshot = threads.map((t) => ({
        conversationId: String(t._id),
        count:
          t.unreadCount &&
          (t.unreadCount[socket.userId] ||
            (t.unreadCount.get && t.unreadCount.get(socket.userId)) ||
            0),
      }));
      io.to(socket.id).emit("unread:snapshot", snapshot);
      // Also emit navbar total unread count
      try {
        const total = await Message.countDocuments({
          to: socket.userId,
          isRead: false,
        });
        io.to(socket.id).emit("unread:total", { total });
      } catch {}
    } catch (e) {}
  })();

  socket.join(socket.userId);

  // Forum rooms
  socket.on("forum:join_post", (payload) => {
    try {
      const postId = payload?.postId;
      if (postId) socket.join(`forum_post_${postId}`);
    } catch (e) {}
  });

  socket.on("forum:leave_post", (payload) => {
    try {
      const postId = payload?.postId;
      if (postId) socket.leave(`forum_post_${postId}`);
    } catch (e) {}
  });

  // Posts rooms
  socket.on("post:join", (payload) => {
    try {
      const postId = payload?.postId;
      if (postId) socket.join(`post_${postId}`);
    } catch (e) {}
  });

  socket.on("post:leave", (payload) => {
    try {
      const postId = payload?.postId;
      if (postId) socket.leave(`post_${postId}`);
    } catch (e) {}
  });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Set shorter timeout for development
  const shutdownTimeout = process.env.NODE_ENV === 'production' ? 10000 : 2000;
  
  const shutdownTimer = setTimeout(() => {
    console.log('Forcing shutdown');
    process.exit(0);
  }, shutdownTimeout);

  try {
    // Close all connections in parallel
    await Promise.race([
      // Close Socket.IO connections
      new Promise((resolve) => {
        io.close(() => {
          console.log('Socket.IO connections closed');
          resolve();
        });
      }),
      
      // Close HTTP server
      new Promise((resolve) => {
        http.close(() => {
          console.log('HTTP server closed');
          resolve();
        });
      }),
      
      // Close database connection
      (async () => {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        console.log('Database connection closed');
      })(),
    ]);

    // Clear the shutdown timer and exit immediately
    clearTimeout(shutdownTimer);
    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    clearTimeout(shutdownTimer);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
