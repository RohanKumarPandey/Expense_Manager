const asyncHandler = require("../utils/asyncHandler");
const ApiResponse = require("../utils/ApiResponse");
const { toRupees } = require("../utils/money");
const Group = require("../models/Group");
const {
  getCrossGroupBalances,
  getCategoryBreakdown,
  getMonthlyTrend,
  getRecentActivity,
} = require("../services/dashboardService");

// GET /api/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const groups = await Group.find({ "members.user": userId }).select("_id");
  const groupIds = groups.map((g) => g._id);

  const [crossGroupBalances, categoryBreakdownRaw, monthlyTrendRaw, recentActivity] =
    await Promise.all([
      getCrossGroupBalances(userId),
      getCategoryBreakdown(userId, groupIds),
      getMonthlyTrend(groupIds),
      getRecentActivity(groupIds, 10),
    ]);

  res.status(200).json(
    new ApiResponse(
      {
        totalOwed: toRupees(crossGroupBalances.totalOwed),
        totalOwing: toRupees(crossGroupBalances.totalOwing),
        groupsSummary: crossGroupBalances.groupsSummary.map((g) => ({
          groupId: g.groupId,
          groupName: g.groupName,
          netBalance: toRupees(g.netBalance),
        })),
        categoryBreakdown: categoryBreakdownRaw.map((c) => ({
          category: c.category,
          total: toRupees(c.totalPaise),
        })),
        monthlyTrend: monthlyTrendRaw.map((m) => ({
          year: m.year,
          month: m.month,
          total: toRupees(m.totalPaise),
        })),
        recentActivity: recentActivity.map((item) => ({
          type: item.type,
          date: item.date,
          data: item.type === "expense"
            ? {
                id: item.data._id,
                description: item.data.description,
                amount: toRupees(item.data.amount),
                category: item.data.category,
                paidBy: item.data.paidBy,
                date: item.data.date,
              }
            : {
                id: item.data._id,
                amount: toRupees(item.data.amount),
                from: item.data.from,
                to: item.data.to,
                note: item.data.note,
                date: item.data.date,
              },
        })),
      },
      "Dashboard data fetched"
    )
  );
});

module.exports = { getDashboard };
