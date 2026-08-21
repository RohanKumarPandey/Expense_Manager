const Group = require("../models/Group");
const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const generateInviteCode = require("../utils/generateInviteCode");
const { getNetBalances } = require("../services/balanceService");
const { toRupees } = require("../utils/money");

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
    (m) => (m.user?._id || m.user).toString() === req.user.id.toString()
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

  const currentMember = group.members.find(
    (m) => (m.user?._id || m.user).toString() === req.user.id.toString()
  );
  if (!currentMember) throw new ApiError(403, "You are not a member of this group");

  // Admin edge case: Sole admin cannot abandon a group that still has other members
  const otherAdmins = group.members.filter(
    (m) =>
      m.role === "admin" &&
      (m.user?._id || m.user).toString() !== req.user.id.toString()
  );
  if (currentMember.role === "admin" && otherAdmins.length === 0 && group.members.length > 1) {
    throw new ApiError(
      400,
      "Cannot leave group as the sole admin while other members remain. Assign another admin or delete the group."
    );
  }

  const memberIds = group.members.map((m) =>
    (m.user?._id || m.user).toString()
  );
  const balances = await getNetBalances(req.params.id, memberIds);
  const myBalance = balances[req.user.id] || 0;

  if (myBalance !== 0) {
    throw new ApiError(
      400,
      `Cannot leave group with an outstanding balance of ₹${Math.abs(
        toRupees(myBalance)
      )}. Settle up first.`
    );
  }

  group.members = group.members.filter(
    (m) => (m.user?._id || m.user).toString() !== req.user.id.toString()
  );

  // If the last member leaves, delete the group and related data
  if (group.members.length === 0) {
    await Expense.deleteMany({ group: req.params.id });
    await Settlement.deleteMany({ group: req.params.id });
    await Group.findByIdAndDelete(req.params.id);
  } else {
    await group.save();
  }

  res.status(200).json(new ApiResponse(null, "Left group successfully"));
});

// DELETE /api/groups/:id  (admin only)
const deleteGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) throw new ApiError(404, "Group not found");

  const currentMember = group.members.find(
    (m) => (m.user?._id || m.user).toString() === req.user.id.toString()
  );
  if (!currentMember || currentMember.role !== "admin") {
    throw new ApiError(403, "Only group admins can delete the group");
  }

  // Delete all associated expenses and settlements
  await Expense.deleteMany({ group: req.params.id });
  await Settlement.deleteMany({ group: req.params.id });

  // Delete the group itself
  await Group.findByIdAndDelete(req.params.id);

  res.status(200).json(
    new ApiResponse(null, "Group and associated data deleted successfully")
  );
});

// DELETE /api/groups/:id/members/:userId  (admin only)
const removeMember = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) throw new ApiError(404, "Group not found");

  const targetIsMember = group.members.some(
    (m) => (m.user?._id || m.user).toString() === req.params.userId
  );
  if (!targetIsMember) throw new ApiError(404, "User is not a member of this group");

  group.members = group.members.filter(
    (m) => (m.user?._id || m.user).toString() !== req.params.userId
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
  deleteGroup,
  removeMember,
};
