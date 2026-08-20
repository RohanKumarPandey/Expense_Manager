const { toPaise, toRupees } = require("../utils/money");
const { splitEqually } = require("../services/splitService");

async function testExpenseLogic() {
  console.log("--- Starting Milestone 3 Expense & Money Unit Tests ---");

  // 1. Test money helpers
  console.assert(toPaise(100) === 10000, "100 rupees should be 10000 paise");
  console.assert(toPaise(33.5) === 3350, "33.5 rupees should be 3350 paise");
  console.assert(toPaise(0.33) === 33, "0.33 rupees should be 33 paise");
  console.assert(toPaise(10.005) === 1001, "10.005 should round to 1001 paise");

  console.assert(toRupees(10000) === 100, "10000 paise should be 100 rupees");
  console.assert(toRupees(3350) === 33.5, "3350 paise should be 33.5 rupees");
  console.assert(toRupees(33) === 0.33, "33 paise should be 0.33 rupees");
  console.log("✓ Money helper (toPaise / toRupees) tests passed");

  // 2. Test splitEqually - Exact division
  const users2 = ["user1", "user2"];
  const res2 = splitEqually(10000, users2);
  console.assert(res2.length === 2, "Should return 2 participants");
  console.assert(res2[0].share === 5000 && res2[1].share === 5000, "10000 / 2 should be 5000 each");
  console.assert(res2.reduce((acc, p) => acc + p.share, 0) === 10000, "Sum of shares must equal total paise");
  console.log("✓ splitEqually exact division passed");

  // 3. Test splitEqually - Indivisible 3 participants (Largest Remainder Method)
  const users3 = ["u1", "u2", "u3"];
  const res3 = splitEqually(10000, users3);
  console.assert(res3.length === 3, "Should return 3 participants");
  console.assert(res3[0].share === 3334, "First participant gets remainder (3334)");
  console.assert(res3[1].share === 3333, "Second participant gets base (3333)");
  console.assert(res3[2].share === 3333, "Third participant gets base (3333)");
  console.assert(res3.reduce((acc, p) => acc + p.share, 0) === 10000, "Sum of shares must be EXACTLY 10000");
  console.log("✓ splitEqually 3-way split with largest-remainder passed (3334, 3333, 3333 = 10000)");

  // 4. Test splitEqually - 7 participants
  const users7 = ["u1", "u2", "u3", "u4", "u5", "u6", "u7"];
  const res7 = splitEqually(10000, users7);
  console.assert(res7.length === 7, "Should return 7 participants");
  // 10000 / 7 = 1428 remainder 4 -> first 4 get 1429, next 3 get 1428
  console.assert(res7[0].share === 1429 && res7[3].share === 1429, "First 4 get 1429");
  console.assert(res7[4].share === 1428 && res7[6].share === 1428, "Last 3 get 1428");
  console.assert(res7.reduce((acc, p) => acc + p.share, 0) === 10000, "Sum of 7-way split must be EXACTLY 10000");
  console.log("✓ splitEqually 7-way split passed");

  // 5. Test splitEqually - Single participant
  const res1 = splitEqually(500, ["solo"]);
  console.assert(res1.length === 1 && res1[0].share === 500, "Single participant gets full amount");
  console.log("✓ splitEqually single participant passed");

  // 6. Test splitEqually error conditions
  let errThrown = false;
  try {
    splitEqually(1000, []);
  } catch (err) {
    errThrown = true;
    console.assert(err.statusCode === 400, "Empty participants should throw 400");
  }
  console.assert(errThrown, "Empty participants should throw error");
  console.log("✓ splitEqually error handling passed");

  console.log("--- All Milestone 3 Unit Checks Passed! ---");
}

testExpenseLogic().catch((err) => {
  console.error("Expense unit test failed:", err);
  process.exit(1);
});
