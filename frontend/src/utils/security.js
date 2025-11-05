// Frontend security utilities

// Sanitize user input to prevent XSS
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return input.replace(/[&<>"'/]/g, (char) => map[char]);
};

// Validate email format
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Validate password strength
export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return {
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
    errors: {
      length: password.length < minLength ? `Password must be at least ${minLength} characters` : null,
      uppercase: !hasUpperCase ? 'Password must contain an uppercase letter' : null,
      lowercase: !hasLowerCase ? 'Password must contain a lowercase letter' : null,
      numbers: !hasNumbers ? 'Password must contain a number' : null,
    }
  };
};

// Prevent SQL/NoSQL injection in user inputs
export const preventInjection = (input) => {
  if (typeof input !== 'string') return input;
  
  const dangerousPatterns = [
    /(\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex)/gi,
    /(union|select|insert|update|delete|drop|create|alter|exec|execute)/gi,
    /<script|javascript:|onerror=|onload=/gi
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input)) ? '' : input;
};

// Secure local storage operations
export const secureLocalStorage = {
  setItem: (key, value) => {
    try {
      const encrypted = btoa(JSON.stringify(value)); // Basic encoding
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },
  
  getItem: (key) => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      return JSON.parse(atob(encrypted));
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },
  
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }
};

// Validate file uploads
export const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
  } = options;
  
  if (!file) return { isValid: false, error: 'No file selected' };
  
  if (file.size > maxSize) {
    return { 
      isValid: false, 
      error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit` 
    };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: 'Invalid file type. Only images are allowed.' 
    };
  }
  
  return { isValid: true, error: null };
};

// Secure API request headers
export const getSecureHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  
  if (includeAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

// Detect and prevent rapid form submissions
export const createSubmitThrottle = (delay = 2000) => {
  let lastSubmit = 0;
  
  return () => {
    const now = Date.now();
    if (now - lastSubmit < delay) {
      return false; // Too soon
    }
    lastSubmit = now;
    return true; // OK to submit
  };
};

// Content Security Policy helper
export const setupCSP = () => {
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;";
  document.head.appendChild(meta);
};
