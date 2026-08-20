const { toPaise, toRupees } = require("../utils/money");
const { splitEqually, splitUnequal, splitPercentage } = require("../services/splitService");
const { expenseSchema } = require("../validators/expenseValidator");

async function testExpenseLogic() {
  console.log("--- Starting Milestone 4 Expense, Split & Validator Unit Tests ---");

  // 1. Test money helpers
  console.assert(toPaise(100) === 10000, "100 rupees should be 10000 paise");
  console.assert(toPaise(33.5) === 3350, "33.5 rupees should be 3350 paise");
  console.assert(toPaise(0.33) === 33, "0.33 rupees should be 33 paise");
  console.assert(toPaise(10.005) === 1001, "10.005 should round to 1001 paise");

  console.assert(toRupees(10000) === 100, "10000 paise should be 100 rupees");
  console.assert(toRupees(3350) === 33.5, "3350 paise should be 33.5 rupees");
  console.assert(toRupees(33) === 0.33, "33 paise should be 0.33 rupees");
  console.log("✓ Money helper (toPaise / toRupees) tests passed");

  // 2. Test splitEqually - Exact division & Largest Remainder Method
  const users3 = ["u1", "u2", "u3"];
  const res3 = splitEqually(10000, users3);
  console.assert(res3.length === 3, "Should return 3 participants");
  console.assert(res3[0].share === 3334, "First participant gets remainder (3334)");
  console.assert(res3[1].share === 3333, "Second participant gets base (3333)");
  console.assert(res3[2].share === 3333, "Third participant gets base (3333)");
  console.assert(res3.reduce((acc, p) => acc + p.share, 0) === 10000, "Sum of shares must be EXACTLY 10000");
  console.log("✓ splitEqually tests passed");

  // 3. Test splitUnequal - Valid exact sum
  const unequalShares = [
    { user: "u1", share: 3000 },
    { user: "u2", share: 7000 },
  ];
  const unequalRes = splitUnequal(10000, unequalShares);
  console.assert(unequalRes.length === 2, "Should return 2 participants");
  console.assert(unequalRes[0].share === 3000 && unequalRes[1].share === 7000, "Shares should match inputs");
  console.assert(unequalRes.reduce((acc, p) => acc + p.share, 0) === 10000, "Sum must be 10000");
  console.log("✓ splitUnequal valid sum passed");

  // 4. Test splitUnequal - Mismatched sum error
  let unequalMismatchErr = null;
  try {
    splitUnequal(10000, [
      { user: "u1", share: 3000 },
      { user: "u2", share: 5000 }, // sum is 8000, not 10000
    ]);
  } catch (err) {
    unequalMismatchErr = err;
  }
  console.assert(unequalMismatchErr && unequalMismatchErr.statusCode === 400, "Should throw 400 on sum mismatch");
  console.assert(unequalMismatchErr.message.includes("8000 paise but total amount is 10000 paise"), "Error message should detail mismatch");
  console.log("✓ splitUnequal mismatched sum correctly throws 400 with detail");

  // 5. Test splitUnequal - Negative share error
  let negativeErr = null;
  try {
    splitUnequal(10000, [
      { user: "u1", share: 12000 },
      { user: "u2", share: -2000 },
    ]);
  } catch (err) {
    negativeErr = err;
  }
  console.assert(negativeErr && negativeErr.statusCode === 400, "Should throw 400 on negative share");
  console.log("✓ splitUnequal negative share correctly throws 400");

  // 6. Test splitPercentage - Clean 60% / 40%
  const cleanPct = [
    { user: "u1", percentage: 60 },
    { user: "u2", percentage: 40 },
  ];
  const pctRes1 = splitPercentage(10000, cleanPct);
  console.assert(pctRes1[0].share === 6000 && pctRes1[1].share === 4000, "60/40 of 10000 should be 6000/4000");
  console.assert(pctRes1.reduce((acc, p) => acc + p.share, 0) === 10000, "Sum must be 10000");
  console.log("✓ splitPercentage clean percentages passed");

  // 7. Test splitPercentage - Largest remainder apportionment (₹10 split 33.33 / 33.33 / 33.34)
  // Total = 1000 paise
  // u1: 33.33% of 1000 = 333.3 paise -> floor 333, rem 0.3
  // u2: 33.33% of 1000 = 333.3 paise -> floor 333, rem 0.3
  // u3: 33.34% of 1000 = 333.4 paise -> floor 333, rem 0.4
  // Floored sum = 999. Leftover 1 paisa goes to u3 (largest remainder 0.4) -> [333, 333, 334]
  const pct3 = [
    { user: "u1", percentage: 33.33 },
    { user: "u2", percentage: 33.33 },
    { user: "u3", percentage: 33.34 },
  ];
  const pctRes2 = splitPercentage(1000, pct3);
  console.assert(pctRes2[0].share === 333, "u1 gets 333");
  console.assert(pctRes2[1].share === 333, "u2 gets 333");
  console.assert(pctRes2[2].share === 334, "u3 gets 334 due to largest remainder");
  console.assert(pctRes2.reduce((acc, p) => acc + p.share, 0) === 1000, "Sum must be EXACTLY 1000");
  console.log("✓ splitPercentage largest remainder apportionment passed (333, 333, 334 = 1000)");

  // 8. Test splitPercentage - Invalid percentage sum error (e.g. 95%)
  let pctErr = null;
  try {
    splitPercentage(10000, [
      { user: "u1", percentage: 50 },
      { user: "u2", percentage: 45 },
    ]);
  } catch (err) {
    pctErr = err;
  }
  console.assert(pctErr && pctErr.statusCode === 400, "Should throw 400 when percentages do not sum to 100");
  console.log("✓ splitPercentage invalid percentage sum correctly throws 400");

  // 9. Test Zod Validator discriminatedUnion
  const validEqual = expenseSchema.safeParse({
    amount: 100,
    description: "Dinner",
    category: "food",
    splitType: "equal",
    participantIds: ["u1", "u2"],
  });
  console.assert(validEqual.success, "Equal split schema should parse valid payload");

  const validUnequal = expenseSchema.safeParse({
    amount: 100,
    description: "Groceries",
    category: "groceries",
    splitType: "unequal",
    participantShares: [
      { user: "u1", share: 40 },
      { user: "u2", share: 60 },
    ],
  });
  console.assert(validUnequal.success, "Unequal split schema should parse valid payload");

  const validPct = expenseSchema.safeParse({
    amount: 100,
    description: "Rent",
    category: "rent",
    splitType: "percentage",
    participantPercentages: [
      { user: "u1", percentage: 60 },
      { user: "u2", percentage: 40 },
    ],
  });
  console.assert(validPct.success, "Percentage split schema should parse valid payload");

  const invalidSplitType = expenseSchema.safeParse({
    amount: 100,
    description: "Test",
    splitType: "invalid_type",
  });
  console.assert(!invalidSplitType.success, "Invalid splitType should be rejected by schema");

  console.log("✓ Zod expenseSchema validation tests passed");
  console.log("--- All Milestone 4 Unit Checks Passed! ---");
}

testExpenseLogic().catch((err) => {
  console.error("Expense unit test failed:", err);
  process.exit(1);
});
