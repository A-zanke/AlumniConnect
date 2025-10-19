const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, default: "" },
    attachments: [{ type: String }],
    // Message-level read state for receiver
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

MessageSchema.index({ from: 1, to: 1, createdAt: -1 });
MessageSchema.index({ to: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("Message", MessageSchema);
