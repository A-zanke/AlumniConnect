const rateLimit = require('express-rate-limit');

const connectionLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many connection requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? req.user._id.toString() : req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many connection requests. Please try again later.',
      retryAfter: Math.ceil((Date.now() + 24 * 60 * 60 * 1000 - Date.now()) / 1000)
    });
  }
});

module.exports = connectionLimiter;
