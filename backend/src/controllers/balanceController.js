const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const { toRupees } = require("../utils/money");
const {
  getNetBalances,
  getSuggestedSettlements,
} = require("../services/balanceService");

// GET /api/groups/:groupId/balances
const getGroupBalances = asyncHandler(async (req, res) => {
  const memberIds = req.group.members.map((m) =>
    (m.user?._id || m.user).toString()
  );
  const balancesInPaise = await getNetBalances(req.params.groupId, memberIds);
  const suggestedInPaise = getSuggestedSettlements(balancesInPaise);

  // convert to rupees only at the API boundary — internal math stays in paise
  const balancesInRupees = req.group.members.map((member) => {
    const userIdStr = (member.user?._id || member.user).toString();
    return {
      user: member.user, // ObjectId or Populated object — frontend has user info
      netBalance: toRupees(balancesInPaise[userIdStr] || 0),
    };
  });

  const suggestedInRupees = suggestedInPaise.map((t) => ({
    from: t.from,
    to: t.to,
    amount: toRupees(t.amount),
  }));

  res.status(200).json(
    new ApiResponse(
      {
        balances: balancesInRupees,
        suggestedSettlements: suggestedInRupees,
      },
      "Balances calculated"
    )
  );
});

module.exports = { getGroupBalances };
