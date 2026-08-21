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
// Query params (all optional):
//   search    - text search on description
//   category  - exact match: rent | groceries | utilities | food | travel | other
//   paidBy    - filter to expenses paid by a specific userId
//   startDate, endDate - ISO date strings, inclusive range on `date`
//   sortBy    - "date" | "amount" (default: "date")
//   order     - "asc" | "desc" (default: "desc")
//   page, limit - pagination (default: page=1, limit=10)
const getExpenses = asyncHandler(async (req, res) => {
  const groupId = req.params.groupId;
  const {
    search,
    category,
    paidBy,
    startDate,
    endDate,
    sortBy = "date",
    order = "desc",
    page = 1,
    limit = 10,
  } = req.query;

  // build the filter object incrementally — only add clauses that were
  // actually requested, so an empty query still returns everything
  const filter = { group: groupId };

  if (search) {
    filter.$text = { $search: search };
  }
  if (category) {
    const validCategories = [
      "rent",
      "groceries",
      "utilities",
      "food",
      "travel",
      "other",
    ];
    if (!validCategories.includes(category)) {
      throw new ApiError(400, `Invalid category: ${category}`);
    }
    filter.category = category;
  }
  if (paidBy) {
    filter.paidBy = paidBy;
  }
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
    if (
      (startDate && isNaN(filter.date.$gte.getTime())) ||
      (endDate && isNaN(filter.date.$lte.getTime()))
    ) {
      throw new ApiError(400, "Invalid date format provided");
    }
  }

  const allowedSortFields = ["date", "amount"];
  if (!allowedSortFields.includes(sortBy)) {
    throw new ApiError(
      400,
      `Invalid sortBy: ${sortBy}. Must be "date" or "amount"`
    );
  }
  const sortDirection = order === "asc" ? 1 : -1;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Math.min(50, Number(limit))); // hard cap at 50 to prevent abuse

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .populate("paidBy", "name")
      .sort({ [sortBy]: sortDirection })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Expense.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(
      {
        expenses,
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
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
