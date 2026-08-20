const { z } = require("zod");

const baseFields = {
  amount: z.number().positive("Amount must be greater than zero"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(["rent", "groceries", "utilities", "food", "travel", "other"]).optional(),
};

const equalSplitSchema = z.object({
  ...baseFields,
  splitType: z.literal("equal"),
  participantIds: z.array(z.string()).min(1, "At least one participant required"),
});

const unequalSplitSchema = z.object({
  ...baseFields,
  splitType: z.literal("unequal"),
  participantShares: z
    .array(
      z.object({
        user: z.string(),
        share: z.number(), // in RUPEES from the client; converted to paise in controller
      })
    )
    .min(1),
});

const percentageSplitSchema = z.object({
  ...baseFields,
  splitType: z.literal("percentage"),
  participantPercentages: z
    .array(
      z.object({
        user: z.string(),
        percentage: z.number().min(0).max(100),
      })
    )
    .min(1),
});

// discriminated union: picks the right schema based on splitType automatically
const expenseSchema = z.discriminatedUnion("splitType", [
  equalSplitSchema,
  unequalSplitSchema,
  percentageSplitSchema,
]);

module.exports = { expenseSchema };
