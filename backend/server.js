const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const connectDB = require("./config/db");
const { errorHandler } = require("./middleware/errorHandler");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Notification = require("./models/Notification"); // Add at top if missing

// Load environment variables
dotenv.config();

connectDB();

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
const testimonialRoutes = require('./routes/testimonialRoutes');
app.use('/api/testimonials', testimonialRoutes);

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

// Serve message images
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

// Start server
const PORT = process.env.PORT || 5000;
http.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// Socket.IO basic chat
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Message = require("./models/Message");

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

  // Chat: idempotent send + status lifecycle + presence/typing
  socket.on("typing", ({ recipientId }) => {
    if (!recipientId) return;
    io.to(recipientId).emit("typing:update", { from: socket.userId, typing: true, at: Date.now() });
  });

  socket.on("stop_typing", ({ recipientId }) => {
    if (!recipientId) return;
    io.to(recipientId).emit("typing:update", { from: socket.userId, typing: false, at: Date.now() });
  });

  socket.on("presence:ping", () => {
    io.emit("presence:update", { userId: socket.userId, lastSeenAt: Date.now() });
  });

  socket.on("chat:send", async (payload) => {
    try {
      const from = socket.userId;
      const { to, content, attachments, clientKey } = payload || {};
      if (!to || (!content && !attachments)) return;
      const me = await User.findById(from).select("connections");
      if (!me) return;
      const isConnected = me.connections.some((id) => id.toString() === to);
      if (!isConnected) return;
      const participants = [from, to].sort();
      const threadId = `${participants[0]}_${participants[1]}`;
      const messageData = { threadId, clientKey, from, to, content: content || "" };
      if (attachments && attachments.length > 0) {
        messageData.attachments = attachments;
      }
      let msg;
      if (clientKey) {
        msg = await Message.findOneAndUpdate(
          { threadId, clientKey },
          { $setOnInsert: messageData },
          { upsert: true, new: true }
        );
      } else {
        msg = await Message.create(messageData);
      }
      const messagePayload = {
        _id: msg._id,
        threadId,
        from,
        to,
        content: msg.content,
        attachments: msg.attachments || [],
        createdAt: msg.createdAt,
      };
      socket.emit("message:ack", { id: msg._id, status: "sent" });
      io.to(to).emit("chat:receive", messagePayload);
      io.to(from).emit("message:delivered", { id: msg._id });
    } catch (e) {
      console.error("Socket chat error:", e);
    }
  });

  socket.on("thread:read", async ({ threadId }) => {
    try {
      if (!threadId) return;
      await Message.updateMany({ threadId, to: socket.userId, status: { $ne: 'read' } }, { $set: { status: 'read', readAt: new Date() } });
      io.emit("message:read", { threadId, userId: socket.userId, at: Date.now() });
    } catch (e) {}
  });

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
