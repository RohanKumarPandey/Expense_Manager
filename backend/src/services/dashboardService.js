const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const Group = require("../models/Group");
const User = require("../models/User");
const { getNetBalances } = require("./balanceService");

/**
 * Net balance across ALL of a user's groups, plus a per-group breakdown.
 * Reuses getNetBalances per group rather than writing a separate
 * cross-group balance formula — one source of truth for "how is balance
 * computed," whether it's asked for one group or summed across many.
 */
const getCrossGroupBalances = async (userId) => {
  const groups = await Group.find({ "members.user": userId }).select("name members");

  const perGroupResults = await Promise.all(
    groups.map(async (group) => {
      const memberIds = group.members.map((m) =>
        (m.user?._id || m.user).toString()
      );
      const balances = await getNetBalances(group._id, memberIds);
      return {
        groupId: group._id,
        groupName: group.name,
        netBalance: balances[userId.toString()] || 0, // paise
      };
    })
  );

  const totalOwed = perGroupResults
    .filter((g) => g.netBalance > 0)
    .reduce((acc, g) => acc + g.netBalance, 0);

  const totalOwing = perGroupResults
    .filter((g) => g.netBalance < 0)
    .reduce((acc, g) => acc + Math.abs(g.netBalance), 0);

  return { totalOwed, totalOwing, groupsSummary: perGroupResults };
};

/**
 * Category breakdown = sum of the user's SHARE (not full expense amount)
 * across all their groups, grouped by category. Uses an aggregation
 * pipeline rather than pulling every expense into Node and summing in
 * JS — this scales properly as expense count grows, and it's the
 * idiomatic MongoDB way to do a group-by-sum.
 */
const getCategoryBreakdown = async (userId, groupIds) => {
  if (!groupIds || groupIds.length === 0) return [];
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const result = await Expense.aggregate([
    { $match: { group: { $in: groupIds } } },
    { $unwind: "$participants" },
    { $match: { "participants.user": userObjectId } },
    {
      $group: {
        _id: "$category",
        totalPaise: { $sum: "$participants.share" },
      },
    },
    { $sort: { totalPaise: -1 } },
  ]);

  return result.map((r) => ({ category: r._id, totalPaise: r.totalPaise }));
};

/**
 * Monthly spend trend = total GROUP spend (not just this user's share)
 * per month, across all their groups — shows overall household spending
 * pattern over time. Deliberately different denominator from category
 * breakdown above (group total vs. personal share) because the two
 * charts answer different questions: "where does MY money go" vs.
 * "how much is the household spending overall."
 */
const getMonthlyTrend = async (groupIds) => {
  if (!groupIds || groupIds.length === 0) return [];

  const result = await Expense.aggregate([
    { $match: { group: { $in: groupIds } } },
    {
      $group: {
        _id: { year: { $year: "$date" }, month: { $month: "$date" } },
        totalPaise: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    { $limit: 12 }, // last 12 months' worth of groups is plenty for a chart
  ]);

  return result.map((r) => ({
    year: r._id.year,
    month: r._id.month,
    totalPaise: r.totalPaise,
  }));
};

/**
 * Recent activity = merged, date-sorted feed of both expenses and
 * settlements across all the user's groups. Two different collections
 * are queried separately (can't $union in a simple find), tagged with
 * a `type` field, merged in JS, then sorted and truncated.
 */
const getRecentActivity = async (groupIds, limit = 10) => {
  if (!groupIds || groupIds.length === 0) return [];

  const [expenses, settlements] = await Promise.all([
    Expense.find({ group: { $in: groupIds } })
      .populate("paidBy", "name")
      .sort({ date: -1 })
      .limit(limit),
    Settlement.find({ group: { $in: groupIds } })
      .populate("from to", "name")
      .sort({ date: -1 })
      .limit(limit),
  ]);

  const tagged = [
    ...expenses.map((e) => ({ type: "expense", date: e.date, data: e })),
    ...settlements.map((s) => ({ type: "settlement", date: s.date, data: s })),
  ];

  return tagged.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
};

module.exports = {
  getCrossGroupBalances,
  getCategoryBreakdown,
  getMonthlyTrend,
  getRecentActivity,
};
