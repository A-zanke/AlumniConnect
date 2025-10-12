const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    kind: {
      type: String,
      enum: ["text", "image", "video", "file"],
      default: "text",
    },
    body: { type: String, trim: true },
    media: [
      {
        url: String,
        type: { type: String, enum: ["image", "video", "file"] },
        filename: String,
        size: Number,
        mimeType: String,
      },
    ],
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    clientKey: { type: String, index: true },
    status: {
      sent: { type: Boolean, default: true },
      deliveredTo: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          at: Date,
        },
      ],
      readBy: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          at: Date,
        },
      ],
    },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    editedAt: Date,
  },
  { timestamps: true }
);

MessageSchema.index({ threadId: 1, createdAt: -1 });
MessageSchema.index(
  { threadId: 1, clientKey: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model("Message", MessageSchema);
