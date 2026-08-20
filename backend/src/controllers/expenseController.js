const Expense = require("../models/Expense");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { toPaise } = require("../utils/money");
const { splitEqually } = require("../services/splitService");

// POST /api/groups/:groupId/expenses
const createExpense = asyncHandler(async (req, res) => {
  const { amount, description, category, participantIds } = req.body;
  const groupId = req.params.groupId;

  if (!amount || amount <= 0) throw new ApiError(400, "Amount must be greater than zero");
  if (!description) throw new ApiError(400, "Description is required");
  if (!participantIds || participantIds.length === 0) {
    throw new ApiError(400, "At least one participant is required");
  }

  // every participant must actually be a member of this group
  // req.group was attached by the groupMembership middleware
  const memberIds = req.group.members.map((m) => m.user.toString());
  const invalidParticipant = participantIds.find((id) => !memberIds.includes(id));
  if (invalidParticipant) {
    throw new ApiError(400, `User ${invalidParticipant} is not a member of this group`);
  }

  const amountInPaise = toPaise(amount);
  const participants = splitEqually(amountInPaise, participantIds);

  const expense = await Expense.create({
    group: groupId,
    paidBy: req.user.id,
    amount: amountInPaise,
    description,
    category: category || "other",
    splitType: "equal",
    participants,
    createdBy: req.user.id,
  });

  res.status(201).json(new ApiResponse({ expense }, "Expense created"));
});

// GET /api/groups/:groupId/expenses
const getExpenses = asyncHandler(async (req, res) => {
  const groupId = req.params.groupId;
  const { page = 1, limit = 10 } = req.query;

  const expenses = await Expense.find({ group: groupId })
    .populate("paidBy", "name")
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Expense.countDocuments({ group: groupId });

  res.status(200).json(
    new ApiResponse(
      {
        expenses,
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalExpenses: total,
      },
      "Expenses fetched"
    )
  );
});

// GET /api/groups/:groupId/expenses/:id
const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    group: req.params.groupId,
  }).populate("paidBy participants.user", "name email");

  if (!expense) throw new ApiError(404, "Expense not found");

  res.status(200).json(new ApiResponse({ expense }, "Expense fetched"));
});

// PATCH /api/groups/:groupId/expenses/:id
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    group: req.params.groupId,
  });
  if (!expense) throw new ApiError(404, "Expense not found");

  // only the person who created it can edit it (for now — admin override comes later if needed)
  if (expense.createdBy.toString() !== req.user.id) {
    throw new ApiError(403, "Only the creator can edit this expense");
  }

  const { description, category } = req.body;
  // NOTE: for Milestone 3, only description/category are editable.
  // Editing amount/participants safely requires re-running split logic —
  // deferred until Milestone 4 to avoid half-building it twice.
  if (description) expense.description = description;
  if (category) expense.category = category;
  await expense.save();

  res.status(200).json(new ApiResponse({ expense }, "Expense updated"));
});

// DELETE /api/groups/:groupId/expenses/:id
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    group: req.params.groupId,
  });
  if (!expense) throw new ApiError(404, "Expense not found");

  const isCreator = expense.createdBy.toString() === req.user.id;
  const isAdmin = req.membership.role === "admin";
  if (!isCreator && !isAdmin) {
    throw new ApiError(403, "Only the creator or a group admin can delete this expense");
  }

  await expense.deleteOne();

  res.status(200).json(new ApiResponse(null, "Expense deleted"));
});

module.exports = {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
};
