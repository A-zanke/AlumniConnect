const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const { errorHandler } = require("./middleware/errorHandler");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Notification = require("./models/Notification"); // Add at top if missing

// Load environment variables
dotenv.config();

// Ensure MongoDB connection before starting server
let dbConnection;
const startServer = async () => {
  try {
    console.log('🚀 Starting AlumniConnect Backend...');
    
    // Connect to database first
    console.log('📡 Connecting to MongoDB...');
    dbConnection = await connectDB();
    
    // Verify database is ready
    if (!dbConnection || mongoose.connection.readyState !== 1) {
      throw new Error('Database connection not established');
    }
    
    console.log('✅ Database connection verified');
    
    // Start HTTP server only after DB is connected
    const PORT = process.env.PORT || 5000;
    http.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Database: ${mongoose.connection.name}@${mongoose.connection.host}`);
    });
    
  } catch (error) {
    console.error('💥 Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

// Initialize Express
const app = express();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http, {
  cors: { origin: "http://localhost:3000", credentials: true },
});
global.io = io;

// Middleware to access io in controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(helmet());

// Whitelist auth/OTP/search + event writes + ALL admin routes
const AUTH_OTP_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/auth/forgot/send-otp",
  "/api/auth/forgot/verify-otp",
  "/api/auth/forgot/reset",
  "/api/search/users",
  "/api/search/departments",
  "/api/events", // POST
]);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
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

// Logging in development
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

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
const testimonialRoutes = require("./routes/testimonialRoutes");
app.use("/api/testimonials", testimonialRoutes);

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

// Create uploads directory if it doesn't exist
const fs = require("fs");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files with CORS headers
app.use(
  "/uploads",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
  },
  express.static(uploadsDir)
);

// Serve message images (explicit directory) - kept for backward compatibility
app.use(
  "/uploads/messages",
  (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
  },
  express.static(path.join(__dirname, "uploads/messages"))
);

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

// Server startup is now handled in startServer() function above

// Socket.IO basic chat
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Message = require("./models/Message");
const Thread = require("./models/Thread");
const Block = require("./models/Block");

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
      
      // Validate input
      if (!to || (!content && !attachments)) {
        console.log('Invalid message payload:', { to, hasContent: !!content, hasAttachments: !!attachments });
        return;
      }
      
      // Validate user IDs
      if (!mongoose.Types.ObjectId.isValid(from) || !mongoose.Types.ObjectId.isValid(to)) {
        console.log('Invalid user IDs:', { from, to });
        return;
      }
      
      const me = await User.findById(from).select("connections");
      if (!me) {
        console.log('User not found:', from);
        return;
      }
      
      const isConnected = me.connections.some((id) => id.toString() === to);
      if (!isConnected) {
        console.log('Users not connected:', { from, to });
        return;
      }
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
      const threadId = `${participants[0]}_${participants[1]}`;
      const messageData = {
        threadId,
        clientKey,
        from,
        to,
        content: content || "",
        isRead: false,
        deliveredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      if (attachments && attachments.length > 0) {
        messageData.attachments = attachments;
      }
      
      let msg;
      try {
        if (clientKey) {
          msg = await Message.findOneAndUpdate(
            { threadId, clientKey },
            { $setOnInsert: messageData },
            { upsert: true, new: true }
          );
        } else {
          msg = await Message.createMessage(messageData);
        }
        
        if (!msg) {
          console.error('Failed to create message');
          return;
        }
      } catch (messageError) {
        console.error('Error creating message in socket:', messageError);
        return; // Exit early if message creation fails
      }
      // Update per-user unread in Thread using safe method
      let thread;
      try {
        thread = await Thread.findOrCreateThread(from, to);
        if (thread) {
          thread.lastMessageAt = new Date();
          thread.lastMessage = msg._id;
          
          // Update unread count safely
          const currentUnread = thread.unreadCount.get(String(to)) || 0;
          thread.unreadCount.set(String(to), currentUnread + 1);
          
          await thread.save();
        } else {
          console.error('Failed to create or find thread');
          thread = { _id: `${participants[0]}_${participants[1]}` };
        }
      } catch (threadError) {
        console.error('Error updating thread in socket:', threadError);
        // Create a minimal thread object for socket events
        thread = { _id: `${participants[0]}_${participants[1]}` };
      }
      const messagePayload = {
        conversationId: String(thread._id),
        messageId: String(msg._id),
        senderId: String(from),
        body: msg.content,
        createdAt: msg.createdAt,
      };
      // Acknowledge to sender: sent (include clientKey if present)
      try {
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
      } catch (ackError) {
        console.error('Error sending message acknowledgments:', ackError);
      }
      // Unread update to recipient
      try {
        const newUnread =
          thread.unreadCount?.get?.(String(to)) ||
          thread.unreadCount?.[String(to)] ||
          0;
        io.to(to).emit("unread:update", {
          conversationId: String(thread._id),
          newCount: newUnread,
        });
      } catch (unreadError) {
        console.error('Error sending unread update:', unreadError);
      }
      // If recipient is currently online (in room), then it's delivered
      try {
        const isRecipientOnline = !!io.sockets.adapter.rooms.get(String(to));
        if (isRecipientOnline) {
          io.to(from).emit("message:delivered", {
            id: String(msg._id),
            messageId: String(msg._id),
            clientKey: clientKey || null,
          });
        }
      } catch (deliveryError) {
        console.error('Error sending delivery confirmation:', deliveryError);
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
      // Update thread safely
      try {
        thread.lastReadAt.set(String(me), now);
        thread.unreadCount.set(String(me), 0);
        await thread.save();
      } catch (threadError) {
        console.error('Error updating thread in markRead:', threadError);
      }
      io.to(String(me)).emit("unread:update", {
        conversationId: String(thread._id),
        newCount: 0,
      });
      // emit total unread for navbar with debouncing
      try {
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
            } catch (totalError) {
              console.error('Error getting total unread count:', totalError);
            }
            unreadTotalDebounce.delete(userId);
          }, 500)
        );
      } catch (debounceError) {
        console.error('Error setting up unread total debounce:', debounceError);
      }
      // broadcast readReceipt to participants
      try {
        for (const p of thread.participants) {
          io.to(String(p)).emit("messages:readReceipt", {
            conversationId: String(thread._id),
            readerId: String(me),
            readUpTo: now,
          });
        }
      } catch (socketError) {
        console.error('Error broadcasting read receipts:', socketError);
      }
    } catch (e) {
      console.error('Error in handleMarkRead:', e);
    }
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
      } catch (totalError) {
        console.error('Error getting total unread count on connect:', totalError);
      }
    } catch (e) {
      console.error('Error sending unread snapshot:', e);
    }
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
});
