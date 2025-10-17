const User = require("../models/User"); // Adjust path if needed

/**
 * Middleware to check if a user has one of the allowed roles.
 * @param {string[]} allowedRoles - Array of roles that are allowed to access the route.
 */
const hasRole = (allowedRoles) => async (req, res, next) => {
  // Ensure a user object is attached to the request by the auth middleware
  if (!req.user || !req.user.id) {
    return res
      .status(401)
      .json({ message: "Authentication Error: User not found in request." });
  }

  try {
    // Find the user in the database to get the most up-to-date role
    const user = await User.findById(req.user.id).select("role").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Normalize roles for case-insensitive comparison
    const userRole = String(user.role || "").toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map((role) =>
      role.toLowerCase()
    );

    if (normalizedAllowedRoles.includes(userRole)) {
      // User has a valid role, proceed to the next middleware or controller
      next();
    } else {
      // User's role is not in the allowed list
      return res
        .status(403)
        .json({
          message: `Forbidden: Access denied. Required role: ${allowedRoles.join(
            " or "
          )}.`,
        });
    }
  } catch (error) {
    console.error("Role validation error:", error);
    return res
      .status(500)
      .json({ message: "Server error during role verification." });
  }
};

module.exports = { hasRole };
