const express = require("express");
const router = express.Router();
const Testimonial = require("../models/Testimonial");

// Public route to get active testimonials for homepage
router.get("/", async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ isActive: true }).sort({
      order: 1,
      createdAt: -1,
    });
    res.json(testimonials);
  } catch (err) {
    console.error("Get testimonials error:", err);
    res.status(500).json({ message: "Failed to fetch testimonials" });
  }
});

module.exports = router;
