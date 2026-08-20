const Expense = require("../models/Expense");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { toPaise } = require("../utils/money");
const { splitEqually, splitUnequal, splitPercentage } = require("../services/splitService");
const { expenseSchema } = require("../validators/expenseValidator");

// shared helper: validates participants belong to the group, then
// dispatches to the right split function based on splitType
const buildParticipants = (splitType, amountInPaise, body, memberIds) => {
  if (splitType === "equal") {
    const invalid = body.participantIds.find((id) => !memberIds.includes(id));
    if (invalid) throw new ApiError(400, `User ${invalid} is not a member of this group`);
    return splitEqually(amountInPaise, body.participantIds);
  }

  if (splitType === "unequal") {
    const invalid = body.participantShares.find((p) => !memberIds.includes(p.user));
    if (invalid) throw new ApiError(400, `User ${invalid.user} is not a member of this group`);
    const sharesInPaise = body.participantShares.map((p) => ({
      user: p.user,
      share: toPaise(p.share),
    }));
    return splitUnequal(amountInPaise, sharesInPaise);
  }

  if (splitType === "percentage") {
    const invalid = body.participantPercentages.find((p) => !memberIds.includes(p.user));
    if (invalid) throw new ApiError(400, `User ${invalid.user} is not a member of this group`);
    return splitPercentage(amountInPaise, body.participantPercentages);
  }

  throw new ApiError(400, "Invalid splitType");
};

// POST /api/groups/:groupId/expenses
const createExpense = asyncHandler(async (req, res) => {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors.map((e) => e.message).join("; "));
  }
  const body = parsed.data;

  const memberIds = req.group.members.map((m) => m.user.toString());
  const amountInPaise = toPaise(body.amount);
  const participants = buildParticipants(body.splitType, amountInPaise, body, memberIds);

  const expense = await Expense.create({
    group: req.params.groupId,
    paidBy: req.user.id,
    amount: amountInPaise,
    description: body.description,
    category: body.category || "other",
    splitType: body.splitType,
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
// Now fully unlocked: amount/participants/splitType can all change,
// which means the split has to be recomputed from scratch — deferred
// from Milestone 3 specifically until this split logic existed.
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    group: req.params.groupId,
  });
  if (!expense) throw new ApiError(404, "Expense not found");

  if (expense.createdBy.toString() !== req.user.id) {
    throw new ApiError(403, "Only the creator can edit this expense");
  }

  // simple fields, editable directly
  if (req.body.description) expense.description = req.body.description;
  if (req.body.category) expense.category = req.body.category;

  // if amount, splitType, or participant data changed, re-run the
  // whole split calculation rather than trying to patch shares in place
  const splitFieldsChanged =
    req.body.amount !== undefined ||
    req.body.splitType !== undefined ||
    req.body.participantIds !== undefined ||
    req.body.participantShares !== undefined ||
    req.body.participantPercentages !== undefined;

  if (splitFieldsChanged) {
    const parsed = expenseSchema.safeParse({
      amount: req.body.amount ?? expense.amount / 100,
      description: expense.description,
      category: expense.category,
      splitType: req.body.splitType ?? expense.splitType,
      participantIds: req.body.participantIds,
      participantShares: req.body.participantShares,
      participantPercentages: req.body.participantPercentages,
    });
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors.map((e) => e.message).join("; "));
    }
    const body = parsed.data;
    const memberIds = req.group.members.map((m) => m.user.toString());
    const amountInPaise = toPaise(body.amount);

    expense.amount = amountInPaise;
    expense.splitType = body.splitType;
    expense.participants = buildParticipants(body.splitType, amountInPaise, body, memberIds);
  }

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
