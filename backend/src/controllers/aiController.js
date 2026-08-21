const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { parseExpenseText } = require("../services/aiService");

// POST /api/groups/:groupId/ai/parse-expense
const parseExpense = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length === 0) {
    throw new ApiError(400, "Text is required");
  }

  // req.group is attached by groupMembership middleware
  await req.group.populate("members.user", "name");
  const memberNameToId = {};
  req.group.members.forEach((m) => {
    if (m.user && m.user.name) {
      memberNameToId[m.user.name.toLowerCase().trim()] = (
        m.user._id ||
        m.user.id ||
        m.user
      ).toString();
    }
  });
  const memberNames = req.group.members
    .map((m) => (m.user && m.user.name ? m.user.name : "Member"))
    .filter(Boolean);

  const currentMember = req.group.members.find(
    (m) =>
      (m.user?._id || m.user?.id || m.user)?.toString() ===
      req.user.id.toString()
  );
  const currentUserName = currentMember?.user?.name || req.user.name || "Me";

  const result = await parseExpenseText(text, memberNames, currentUserName);

  if (!result.success) {
    // NOT a 500 — this is a normal, expected outcome the frontend handles gracefully
    return res.status(200).json(
      new ApiResponse(
        { success: false, reason: result.reason, rawText: result.rawText || text },
        "Could not parse expense automatically"
      )
    );
  }

  // 1. Resolve Payer Name to actual member userId
  let resolvedPaidById = null;
  if (result.draft.paidByName) {
    const cleanedPayer = result.draft.paidByName.toLowerCase().trim();
    resolvedPaidById = memberNameToId[cleanedPayer];

    if (!resolvedPaidById) {
      // Payer mentioned is not in the group
      return res.status(200).json(
        new ApiResponse(
          {
            success: false,
            reason: `Payer "${result.draft.paidByName}" is not a member of this group`,
            rawText: text,
          },
          "Could not parse expense automatically"
        )
      );
    }
  } else {
    resolvedPaidById = req.user.id;
  }

  // 2. Resolve Participant Names (from AI) to actual member userIds
  const resolvedParticipantIds = [];
  const unresolvedNames = [];
  for (const name of result.draft.participantNames) {
    const cleanedName = name.toLowerCase().trim();
    const id = memberNameToId[cleanedName];
    if (id) {
      if (!resolvedParticipantIds.includes(id)) {
        resolvedParticipantIds.push(id);
      }
    } else {
      unresolvedNames.push(name);
    }
  }

  if (unresolvedNames.length > 0) {
    // AI mentioned someone who isn't actually in this group
    return res.status(200).json(
      new ApiResponse(
        {
          success: false,
          reason: `AI mentioned participants not in this group: ${unresolvedNames.join(
            ", "
          )}`,
          rawText: text,
        },
        "Could not parse expense automatically"
      )
    );
  }

  res.status(200).json(
    new ApiResponse(
      {
        success: true,
        draftExpense: {
          amount: result.draft.amount,
          description: result.draft.description,
          category: result.draft.category,
          splitType: result.draft.splitType,
          paidById: resolvedPaidById,
          participantIds: resolvedParticipantIds,
        },
      },
      "Expense parsed successfully"
    )
  );
});

module.exports = { parseExpense };
