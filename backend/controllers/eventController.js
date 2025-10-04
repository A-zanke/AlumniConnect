const Event = require("../models/Event");
const Notification = require("../models/Notification");
const User = require("../models/User");

exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, audience } = req.body;
    const event = new Event({
      title,
      description,
      date,
      audience,
      createdBy: req.user._id
    });
    await event.save();

    // Find users belonging to audience type(s)
    const users = await User.find({ role: { $in: audience } });

    // Create notifications for all relevant users
    const notifications = users.map(u => ({
      user: u._id,
      event: event._id,
      message: `New event: ${title}`
    }));
    await Notification.insertMany(notifications);

    // 🔥 Emit real-time notification via Socket.io
    req.io.to(audience).emit("newEvent", {
      eventId: event._id,
      title: event.title,
      message: `New event: ${event.title}`
    });

    res.status(201).json({ success: true, event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create event" });
  }
};

exports.getEventsForUser = async (req, res) => {
  try {
    const userRole = req.user.role;
    const events = await Event.find({ audience: userRole });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
};
