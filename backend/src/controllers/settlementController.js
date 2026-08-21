const Settlement = require("../models/Settlement");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { toPaise, toRupees } = require("../utils/money");

// POST /api/groups/:groupId/settlements
const createSettlement = asyncHandler(async (req, res) => {
  const { to, amount, note } = req.body;
  let { from } = req.body;

  from = from ? from.toString() : req.user.id.toString();
  const toStr = to ? to.toString() : "";

  if (!toStr) throw new ApiError(400, "Recipient (to) is required");
  if (!from) throw new ApiError(400, "Sender (from) is required");
  if (!amount || amount <= 0) throw new ApiError(400, "Amount must be greater than zero");
  if (toStr === from) throw new ApiError(400, "Cannot record a settlement to yourself");

  // both users must actually be members of this group
  const memberIds = req.group.members.map((m) =>
    (m.user?._id || m.user).toString()
  );
  if (!memberIds.includes(toStr)) {
    throw new ApiError(400, "Recipient is not a member of this group");
  }
  if (!memberIds.includes(from)) {
    throw new ApiError(400, "Sender is not a member of this group");
  }

  const settlement = await Settlement.create({
    group: req.params.groupId,
    from,
    to: toStr,
    amount: toPaise(amount),
    note: note || "",
    recordedBy: req.user.id,
  });

  res.status(201).json(new ApiResponse({ settlement }, "Settlement recorded"));
});

// GET /api/groups/:groupId/settlements
const getSettlements = asyncHandler(async (req, res) => {
  const settlements = await Settlement.find({ group: req.params.groupId })
    .populate("from to", "name email")
    .sort({ date: -1 });

  const formatted = settlements.map((s) => ({
    id: s._id,
    from: s.from,
    to: s.to,
    amount: toRupees(s.amount),
    note: s.note,
    date: s.date,
  }));

  res.status(200).json(new ApiResponse({ settlements: formatted }, "Settlements fetched"));
});

module.exports = { createSettlement, getSettlements };
