const { z } = require("zod");

// This is what we ASK the AI to return. We validate against it strictly —
// if the AI's output doesn't match, we treat it as a parse failure,
// not something to coerce or guess at.
const aiExpenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  category: z
    .enum(["rent", "groceries", "utilities", "food", "travel", "other"])
    .default("other"),
  splitType: z.enum(["equal"]).default("equal"),
  paidByName: z.string().min(1).optional(),
  participantNames: z.array(z.string().min(1)).min(1),
});

module.exports = { aiExpenseSchema };
