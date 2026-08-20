const Group = require("../models/Group");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const generateInviteCode = require("../utils/generateInviteCode");

// POST /api/groups
const createGroup = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw new ApiError(400, "Group name is required");

  let inviteCode;
  let isUnique = false;
  // retry on the rare chance of a collision
  while (!isUnique) {
    inviteCode = generateInviteCode();
    const existing = await Group.findOne({ inviteCode });
    if (!existing) isUnique = true;
  }

  const group = await Group.create({
    name,
    description,
    inviteCode,
    createdBy: req.user.id,
    members: [{ user: req.user.id, role: "admin", joinedAt: new Date() }],
  });

  res.status(201).json(new ApiResponse({ group }, "Group created"));
});

// GET /api/groups  (groups the current user belongs to)
const getMyGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ "members.user": req.user.id })
    .select("name description inviteCode members createdAt")
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse({ groups }, "Groups fetched"));
});

// GET /api/groups/:id
const getGroupById = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id).populate(
    "members.user",
    "name email avatarUrl"
  );
  if (!group) throw new ApiError(404, "Group not found");

  res.status(200).json(new ApiResponse({ group }, "Group fetched"));
  // Note: membership check already happened in groupMembership middleware
  // before this controller runs — see routes file below.
});

// POST /api/groups/join
const joinGroup = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode) throw new ApiError(400, "Invite code is required");

  const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!group) throw new ApiError(404, "Invalid invite code");

  const alreadyMember = group.members.some(
    (m) => m.user.toString() === req.user.id
  );
  if (alreadyMember) throw new ApiError(409, "You are already a member of this group");

  group.members.push({ user: req.user.id, role: "member", joinedAt: new Date() });
  await group.save();

  res.status(200).json(new ApiResponse({ group }, "Joined group successfully"));
});

// DELETE /api/groups/:id/leave
const leaveGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) throw new ApiError(404, "Group not found");

  // NOTE: balance-zero check will be added in Milestone 6/7 once
  // balanceService exists. For Milestone 2, leaving is allowed freely —
  // this is a deliberate placeholder, not an oversight.
  group.members = group.members.filter(
    (m) => m.user.toString() !== req.user.id
  );
  await group.save();

  res.status(200).json(new ApiResponse(null, "Left group successfully"));
});

// DELETE /api/groups/:id/members/:userId  (admin only)
const removeMember = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) throw new ApiError(404, "Group not found");

  const targetIsMember = group.members.some(
    (m) => m.user.toString() === req.params.userId
  );
  if (!targetIsMember) throw new ApiError(404, "User is not a member of this group");

  group.members = group.members.filter(
    (m) => m.user.toString() !== req.params.userId
  );
  await group.save();

  res.status(200).json(new ApiResponse(null, "Member removed"));
});

module.exports = {
  createGroup,
  getMyGroups,
  getGroupById,
  joinGroup,
  leaveGroup,
  removeMember,
};
