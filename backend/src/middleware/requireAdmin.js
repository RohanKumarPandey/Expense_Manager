const ApiError = require("../utils/ApiError");

const requireAdmin = (req, res, next) => {
  // must run AFTER groupMembership, which sets req.membership
  if (!req.membership || req.membership.role !== "admin") {
    throw new ApiError(403, "Only group admins can perform this action");
  }
  next();
};

module.exports = requireAdmin;
