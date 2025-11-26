const User = require("../models/User");
const Notification = require("../models/Notification");
const Connection = require("../models/Connection");

// Send a connection request
exports.sendRequest = async (req, res) => {
  try {
    // Accept both userId and recipientId for backward compatibility
    const userId = req.body.userId || req.body.recipientId;
    console.log("Send request - userId:", userId, "sender:", req.user._id);

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (req.user._id.toString() === userId) {
      return res
        .status(400)
        .json({ message: "You can't connect with yourself" });
    }

    const sender = await User.findById(req.user._id);
    const receiver = await User.findById(userId);

    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!receiver.connectionRequests) receiver.connectionRequests = [];
    if (!receiver.connections) receiver.connections = [];

    if (receiver.connectionRequests.includes(sender._id)) {
      return res.status(400).json({ message: "Request already sent" });
    }

    if (receiver.connections.includes(sender._id)) {
      return res.status(400).json({ message: "Already connected" });
    }

    receiver.connectionRequests.push(sender._id);
    await receiver.save();

    await Connection.create({
      requesterId: sender._id,
      recipientId: receiver._id,
      status: "pending",
    });

    // Create notification using the new API
    const notification = await Notification.create({
      recipient: receiver._id,
      sender: sender._id,
      type: "connection_request",
      content: `${sender.name} sent you a connection request`,
      status: "pending",
    });

    // Emit real-time notification to receiver
    req.io.to(receiver._id.toString()).emit("newNotification", {
      _id: notification._id,
      recipient: notification.recipient,
      sender: notification.sender,
      type: notification.type,
      content: notification.content,
      read: notification.read,
      createdAt: notification.createdAt,
    });

    res.json({ message: "Connection request sent" });
  } catch (error) {
    console.error("Send request error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Accept a connection request
exports.acceptRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("Accept request - userId:", userId, "accepter:", req.user._id);

    const me = await User.findById(req.user._id);
    const sender = await User.findById(userId);

    if (!me) return res.status(404).json({ message: "Current user not found" });
    if (!sender) return res.status(404).json({ message: "User not found" });

    if (!me.connectionRequests) me.connectionRequests = [];
    if (!me.connections) me.connections = [];
    if (!sender.connections) sender.connections = [];

    if (!me.connectionRequests.includes(sender._id)) {
      return res.status(400).json({ message: "No request from this user" });
    }

    // Add connections (bidirectional)
    if (!me.connections.some((id) => id.toString() === sender._id.toString())) {
      me.connections.push(sender._id);
    }
    if (!sender.connections.some((id) => id.toString() === me._id.toString())) {
      sender.connections.push(me._id);
    }

    // Also sync follow graph so Following lists/counts work
    if (!me.following) me.following = [];
    if (!sender.followers) sender.followers = [];
    if (!sender.following) sender.following = [];
    if (!me.followers) me.followers = [];

    if (!me.following.some((id) => id.toString() === sender._id.toString())) {
      me.following.push(sender._id);
    }
    if (!sender.followers.some((id) => id.toString() === me._id.toString())) {
      sender.followers.push(me._id);
    }
    if (!sender.following.some((id) => id.toString() === me._id.toString())) {
      sender.following.push(me._id);
    }
    if (!me.followers.some((id) => id.toString() === sender._id.toString())) {
      me.followers.push(sender._id);
    }

    // Remove pending
    me.connectionRequests = me.connectionRequests.filter(
      (id) => id.toString() !== sender._id.toString()
    );

    await me.save();
    await sender.save();

    await Connection.findOneAndUpdate(
      { requesterId: sender._id, recipientId: me._id, status: "pending" },
      { status: "accepted" }
    );

    // Update the receiver's notification to accepted and mark as read
    const receiverNotif = await Notification.findOne({
      recipient: me._id,
      sender: sender._id,
      type: "connection_request",
      status: "pending",
    });

    let receiverNotifId = null;
    if (receiverNotif) {
      receiverNotif.status = "accepted";
      receiverNotif.read = true;
      receiverNotif.readAt = new Date();
      receiverNotif.type = "connection_accepted";
      receiverNotif.content = `You are now connected with ${sender.name}`;
      await receiverNotif.save();
      receiverNotifId = receiverNotif._id;
    }

    // Create new notification for sender
    const senderNotif = await Notification.create({
      recipient: sender._id,
      sender: me._id,
      type: "connection_accepted",
      content: `${me.name} accepted your connection request. You are now connected.`,
      status: "accepted",
      read: false,
    });

    // Emit real-time updates
    // To receiver: notification updated (mark as read)
    if (receiverNotifId) {
      req.io.to(me._id.toString()).emit("notificationUpdated", {
        _id: receiverNotifId,
        read: true,
        type: "connection_accepted",
        content: `You are now connected with ${sender.name}`,
      });
    }

    // To sender: new notification
    req.io.to(sender._id.toString()).emit("newNotification", {
      _id: senderNotif._id,
      recipient: senderNotif.recipient,
      sender: senderNotif.sender,
      type: senderNotif.type,
      content: senderNotif.content,
      read: senderNotif.read,
      createdAt: senderNotif.createdAt,
    });

    res.json({ message: "Connection request accepted" });
  } catch (error) {
    console.error("Accept request error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Reject a connection request
exports.rejectRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("Reject request - userId:", userId, "rejecter:", req.user._id);

    const me = await User.findById(req.user._id);
    const sender = await User.findById(userId);
    if (!me) return res.status(404).json({ message: "Current user not found" });
    if (!sender) return res.status(404).json({ message: "Sender not found" });

    if (!me.connectionRequests) me.connectionRequests = [];
    me.connectionRequests = me.connectionRequests.filter(
      (id) => id.toString() !== userId
    );
    await me.save();

    await Connection.findOneAndUpdate(
      { requesterId: userId, recipientId: me._id, status: "pending" },
      { status: "rejected" }
    );

    // Delete the original connection_request notification for receiver
    const deletedNotif = await Notification.findOneAndDelete({
      recipient: me._id,
      sender: userId,
      type: "connection_request",
    });

    // Emit real-time updates
    // To receiver: notification deleted/removed
    if (deletedNotif) {
      req.io.to(me._id.toString()).emit("notificationDeleted", {
        _id: deletedNotif._id,
      });
    }

    res.json({ message: "Connection request rejected" });
  } catch (error) {
    console.error("Reject request error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Remove a connection
exports.removeConnection = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(
      "Remove connection - userId:",
      userId,
      "remover:",
      req.user._id
    );

    const me = await User.findById(req.user._id);
    const other = await User.findById(userId);

    if (!me) return res.status(404).json({ message: "Current user not found" });
    if (!other) return res.status(404).json({ message: "User not found" });

    if (!me.connections) me.connections = [];
    if (!other.connections) other.connections = [];

    // Check if they were actually connected
    const wereConnected =
      me.connections.some((id) => id.toString() === userId) &&
      other.connections.some((id) => id.toString() === me._id.toString());

    me.connections = me.connections.filter((id) => id.toString() !== userId);
    other.connections = other.connections.filter(
      (id) => id.toString() !== me._id.toString()
    );

    // Also remove follow graph edges to keep in sync
    if (!me.following) me.following = [];
    if (!me.followers) me.followers = [];
    if (!other.following) other.following = [];
    if (!other.followers) other.followers = [];

    me.following = me.following.filter((id) => id.toString() !== userId);
    me.followers = me.followers.filter((id) => id.toString() !== userId);
    other.following = other.following.filter(
      (id) => id.toString() !== me._id.toString()
    );
    other.followers = other.followers.filter(
      (id) => id.toString() !== me._id.toString()
    );

    await me.save();
    await other.save();

    // Emit socket events to both users to update their UIs in real-time
    if (wereConnected) {
      // Emit to the user who initiated the removal
      if (global.io) {
        global.io.to(me._id.toString()).emit("connection:updated", {
          userId: me._id,
          targetUserId: other._id,
          status: "removed",
        });

        // Emit to the other user as well
        global.io.to(other._id.toString()).emit("connection:updated", {
          userId: me._id,
          targetUserId: other._id,
          status: "removed",
        });
      }
    }

    res.json({ message: "Connection removed" });
  } catch (error) {
    console.error("Remove connection error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get connection status with another user
exports.getConnectionStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(
      "Get connection status - userId:",
      userId,
      "requester:",
      req.user._id
    );

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const me = await User.findById(req.user._id);
    const other = await User.findById(userId);

    if (!me) return res.status(404).json({ message: "Current user not found" });
    if (!other) return res.status(404).json({ message: "User not found" });

    if (!me.connections) {
      me.connections = [];
      await me.save();
    }
    if (!me.connectionRequests) {
      me.connectionRequests = [];
      await me.save();
    }
    if (!other.connections) {
      other.connections = [];
      await other.save();
    }
    if (!other.connectionRequests) {
      other.connectionRequests = [];
      await other.save();
    }

    const isConnected =
      (me.connections || []).some((id) => id.toString() === userId) &&
      (other.connections || []).some(
        (id) => id.toString() === me._id.toString()
      );

    if (isConnected) return res.json({ status: "connected" });

    const iRequestedOther = (other.connectionRequests || []).some(
      (id) => id.toString() === me._id.toString()
    );
    if (iRequestedOther) return res.json({ status: "requested" });

    const otherRequestedMe = (me.connectionRequests || []).some(
      (id) => id.toString() === userId
    );
    if (otherRequestedMe) return res.json({ status: "incoming" });

    return res.json({ status: "none" });
  } catch (error) {
    console.error("Get connection status error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all connections (enriched for UI)
exports.getConnections = async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    if (!me) return res.status(404).json({ message: "User not found" });

    if (!me.connections) {
      me.connections = [];
      await me.save();
    }

    const populatedConnections = await User.populate(me, {
      path: "connections",
      select:
        "name username avatarUrl email department year industry current_job_title",
    });
    res.json(populatedConnections.connections || []);
  } catch (error) {
    console.error("Get connections error:", error);
    res.status(500).json({ message: "Get connections failed" });
  }
};

// Get pending requests
exports.getPendingRequests = async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    if (!me) return res.status(404).json({ message: "User not found" });

    if (!me.connectionRequests) {
      me.connectionRequests = [];
      await me.save();
    }

    const populatedRequests = await User.populate(me, {
      path: "connectionRequests",
      select: "name username avatarUrl role",
    });
    const response = (populatedRequests.connectionRequests || []).map((u) => ({
      _id: u._id,
      requester: u,
      status: "pending",
    }));
    res.json(response);
  } catch (error) {
    console.error("Get pending requests error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get suggested connections
exports.getSuggestedConnections = async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    if (!me) return res.status(404).json({ message: "User not found" });

    if (!me.connections) me.connections = [];
    if (!me.connectionRequests) me.connectionRequests = [];

    const excludeIds = [
      me._id,
      ...(me.connections || []),
      ...(me.connectionRequests || []),
    ];
    const users = await User.find({ _id: { $nin: excludeIds } }).select(
      "name username avatarUrl role"
    );

    res.json(users);
  } catch (error) {
    console.error("Get suggested connections error:", error);
    res.status(500).json({ message: error.message });
  }
};
