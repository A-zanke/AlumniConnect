// Input validation and sanitization middleware

const sanitizeInput = (req, res, next) => {
  // Remove any potential script tags from string inputs
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// Prevent SQL/NoSQL injection in queries
const preventInjection = (req, res, next) => {
  const checkForInjection = (str) => {
    if (typeof str !== 'string') return false;
    
    const patterns = [
      /(\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex)/i,
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i,
      /<script|javascript:|onerror=|onload=/i
    ];
    
    return patterns.some(pattern => pattern.test(str));
  };

  const validate = (obj) => {
    if (typeof obj === 'string' && checkForInjection(obj)) {
      return false;
    }
    if (Array.isArray(obj)) {
      return obj.every(validate);
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).every(validate);
    }
    return true;
  };

  if (!validate(req.body) || !validate(req.query) || !validate(req.params)) {
    return res.status(400).json({ message: 'Invalid input detected' });
  }

  next();
};

// CSRF protection for state-changing operations
const csrfProtection = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.get('origin');
    const referer = req.get('referer');
    
    const allowedOrigins = [
      process.env.FRONTEND_ORIGIN,
      'http://localhost:3000',
      'http://localhost:5000'
    ].filter(Boolean);

    // Skip CSRF check in development
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    const isValidOrigin = origin && allowedOrigins.some(allowed => origin.includes(allowed));
    const isValidReferer = referer && allowedOrigins.some(allowed => referer.includes(allowed));

    if (!isValidOrigin && !isValidReferer) {
      return res.status(403).json({ message: 'Invalid request origin' });
    }
  }
  next();
};

// File upload validation
const validateFileUpload = (req, res, next) => {
  if (req.file) {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type. Only images allowed.' });
    }

    if (req.file.size > maxSize) {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }
  }
  next();
};

// Request size limiter
const requestSizeLimit = (req, res, next) => {
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    return res.status(413).json({ message: 'Request entity too large' });
  }
  next();
};

module.exports = {
  sanitizeInput,
  preventInjection,
  csrfProtection,
  validateFileUpload,
  requestSizeLimit
};
