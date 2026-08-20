const Group = require("../models/Group");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const groupMembership = asyncHandler(async (req, res, next) => {
  const groupId = req.params.id || req.params.groupId;
  const group = await Group.findById(groupId);

  if (!group) throw new ApiError(404, "Group not found");

  const membership = group.members.find(
    (m) => m.user.toString() === req.user.id
  );
  if (!membership) throw new ApiError(403, "You are not a member of this group");

  req.group = group;              // attach for downstream use, avoids refetching
  req.membership = membership;    // exposes req.membership.role for requireAdmin
  next();
});

module.exports = groupMembership;
