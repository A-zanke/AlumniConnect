function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    const userRole = (req.user.role || '').toLowerCase();
    const normalized = allowedRoles.map(r => r.toLowerCase());
    if (!normalized.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { roleMiddleware };

