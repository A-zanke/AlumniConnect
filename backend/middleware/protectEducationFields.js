const protectEducationFields = (req, res, next) => {
  // Always block department changes
  if (req.body.department) {
    delete req.body.department;
  }

  // Block graduation year changes for alumni
  if (req.user?.role?.toLowerCase() === 'alumni' && req.body.graduationYear) {
    delete req.body.graduationYear;
  }

  next();
};

module.exports = protectEducationFields;