const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Expense = require("../src/models/Expense");
const Settlement = require("../src/models/Settlement");
const {
  getNetBalances,
  getSuggestedSettlements,
} = require("../src/services/balanceService");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
}, 60000);

afterEach(async () => {
  await Expense.deleteMany({});
  await Settlement.deleteMany({});
});

const groupId = new mongoose.Types.ObjectId();
const userA = new mongoose.Types.ObjectId().toString();
const userB = new mongoose.Types.ObjectId().toString();
const userC = new mongoose.Types.ObjectId().toString();

describe("balanceService.getNetBalances", () => {
  test("single expense, equal split between two users", async () => {
    await Expense.create({
      group: groupId,
      paidBy: userA,
      amount: 10000, // ₹100
      description: "Groceries",
      splitType: "equal",
      participants: [
        { user: userA, share: 5000 },
        { user: userB, share: 5000 },
      ],
      createdBy: userA,
    });

    const balances = await getNetBalances(groupId, [userA, userB]);

    // A paid 10000, owes 5000 of it -> net +5000
    expect(balances[userA]).toBe(5000);
    // B paid 0, owes 5000 -> net -5000
    expect(balances[userB]).toBe(-5000);
  });

  test("member with zero activity still appears with balance 0", async () => {
    await Expense.create({
      group: groupId,
      paidBy: userA,
      amount: 5000,
      description: "Snacks",
      splitType: "equal",
      participants: [{ user: userA, share: 5000 }],
      createdBy: userA,
    });

    const balances = await getNetBalances(groupId, [userA, userB, userC]);

    expect(balances[userB]).toBe(0);
    expect(balances[userC]).toBe(0);
  });

  test("three users, multiple expenses, balances still sum to zero", async () => {
    await Expense.create({
      group: groupId,
      paidBy: userA,
      amount: 9000,
      description: "Rent share",
      splitType: "equal",
      participants: [
        { user: userA, share: 3000 },
        { user: userB, share: 3000 },
        { user: userC, share: 3000 },
      ],
      createdBy: userA,
    });
    await Expense.create({
      group: groupId,
      paidBy: userB,
      amount: 6000,
      description: "Internet",
      splitType: "equal",
      participants: [
        { user: userA, share: 2000 },
        { user: userB, share: 2000 },
        { user: userC, share: 2000 },
      ],
      createdBy: userB,
    });

    const balances = await getNetBalances(groupId, [userA, userB, userC]);
    const total = Object.values(balances).reduce((a, v) => a + v, 0);

    expect(total).toBe(0); // the integrity invariant, tested explicitly
  });

  test("uneven equal-split remainder still balances to zero", async () => {
    // ₹100 among 3 people -> 3334/3333/3333, tests that the earlier
    // largest-remainder fix actually prevents a balance leak
    await Expense.create({
      group: groupId,
      paidBy: userA,
      amount: 10000,
      description: "Cab",
      splitType: "equal",
      participants: [
        { user: userA, share: 3334 },
        { user: userB, share: 3333 },
        { user: userC, share: 3333 },
      ],
      createdBy: userA,
    });

    const balances = await getNetBalances(groupId, [userA, userB, userC]);
    const total = Object.values(balances).reduce((a, v) => a + v, 0);

    expect(total).toBe(0);
    expect(balances[userA]).toBe(10000 - 3334); // 6666
  });

  test("throws error if balance integrity check fails", async () => {
    // Manually create an inconsistent expense where share doesn't match total
    await Expense.create({
      group: groupId,
      paidBy: userA,
      amount: 10000,
      description: "Corrupt Expense",
      splitType: "unequal",
      participants: [
        { user: userA, share: 4000 },
        { user: userB, share: 5000 }, // sum 9000 != 10000 (leaks 1000 paise)
      ],
      createdBy: userA,
    });

    await expect(getNetBalances(groupId, [userA, userB])).rejects.toThrow(
      /Balance integrity check failed/
    );
  });
});

describe("balanceService.getSuggestedSettlements", () => {
  test("simple two-person debt", () => {
    const balances = { userA: -5000, userB: 5000 };
    const result = getSuggestedSettlements(balances);

    expect(result).toEqual([{ from: "userA", to: "userB", amount: 5000 }]);
  });

  test("three-way circular debt nets to zero transactions", () => {
    // A owes B 500, B owes C 500, C owes A 500 -> net balance of everyone is 0
    const balances = { userA: 0, userB: 0, userC: 0 };
    const result = getSuggestedSettlements(balances);

    expect(result).toEqual([]);
  });

  test("one creditor, two debtors — matches the worked example", () => {
    const balances = { userA: -30000, userB: -20000, userC: 50000 };
    const result = getSuggestedSettlements(balances);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ from: "userA", to: "userC", amount: 30000 });
    expect(result).toContainEqual({ from: "userB", to: "userC", amount: 20000 });
  });

  test("already settled group produces no transactions", () => {
    const balances = { userA: 0, userB: 0, userC: 0 };
    expect(getSuggestedSettlements(balances)).toEqual([]);
  });

  test("never produces more than n-1 transactions for n participants", () => {
    // 5 participants with varied balances summing to zero
    const balances = {
      u1: 10000,
      u2: -3000,
      u3: -2000,
      u4: -4000,
      u5: -1000,
    };
    const result = getSuggestedSettlements(balances);
    expect(result.length).toBeLessThanOrEqual(4); // n - 1 = 5 - 1
  });

  test("integrates end-to-end with getNetBalances output", async () => {
    // full pipeline: create expenses -> getNetBalances -> getSuggestedSettlements
    const a = new mongoose.Types.ObjectId().toString();
    const b = new mongoose.Types.ObjectId().toString();
    const c = new mongoose.Types.ObjectId().toString();

    await Expense.create({
      group: groupId,
      paidBy: c,
      amount: 30000,
      description: "Groceries run",
      splitType: "equal",
      participants: [
        { user: a, share: 10000 },
        { user: b, share: 10000 },
        { user: c, share: 10000 },
      ],
      createdBy: c,
    });

    const balances = await getNetBalances(groupId, [a, b, c]);
    const settlements = getSuggestedSettlements(balances);

    // both A and B owe C 10000 each
    expect(settlements).toHaveLength(2);
    const totalSettled = settlements.reduce((acc, t) => acc + t.amount, 0);
    expect(totalSettled).toBe(20000); // matches what C is owed
  });
});

describe("balanceService with settlements integration", () => {
  test("full settlement brings pair debt to exactly zero", async () => {
    // User A paid 10000 (₹100) split equally with User B (5000 each) -> B owes A 5000
    await Expense.create({
      group: groupId,
      paidBy: userA,
      amount: 10000,
      description: "Dinner",
      splitType: "equal",
      participants: [
        { user: userA, share: 5000 },
        { user: userB, share: 5000 },
      ],
      createdBy: userA,
    });

    // User B records settlement of 5000 to User A
    await Settlement.create({
      group: groupId,
      from: userB,
      to: userA,
      amount: 5000,
      recordedBy: userB,
    });

    const balances = await getNetBalances(groupId, [userA, userB]);
    expect(balances[userA]).toBe(0);
    expect(balances[userB]).toBe(0);

    const suggestions = getSuggestedSettlements(balances);
    expect(suggestions).toEqual([]);
  });

  test("partial settlement correctly reduces balance and maintains zero-sum invariant", async () => {
    // User A paid 10000 split equally with User B (5000 each)
    await Expense.create({
      group: groupId,
      paidBy: userA,
      amount: 10000,
      description: "Dinner",
      splitType: "equal",
      participants: [
        { user: userA, share: 5000 },
        { user: userB, share: 5000 },
      ],
      createdBy: userA,
    });

    // User B pays partial settlement of 3000 to User A
    await Settlement.create({
      group: groupId,
      from: userB,
      to: userA,
      amount: 3000,
      recordedBy: userB,
    });

    const balances = await getNetBalances(groupId, [userA, userB]);
    // A was owed 5000, received 3000 -> now owed 2000 (+2000)
    expect(balances[userA]).toBe(2000);
    // B owed 5000, paid 3000 -> now owes 2000 (-2000)
    expect(balances[userB]).toBe(-2000);

    const total = Object.values(balances).reduce((acc, v) => acc + v, 0);
    expect(total).toBe(0);

    const suggestions = getSuggestedSettlements(balances);
    expect(suggestions).toEqual([
      { from: userB, to: userA, amount: 2000 },
    ]);
  });

  test("multiple expenses and settlements maintain group zero-sum invariant", async () => {
    // Expense 1: A pays 9000 for A, B, C (3000 each)
    await Expense.create({
      group: groupId,
      paidBy: userA,
      amount: 9000,
      description: "Rent Share",
      splitType: "equal",
      participants: [
        { user: userA, share: 3000 },
        { user: userB, share: 3000 },
        { user: userC, share: 3000 },
      ],
      createdBy: userA,
    });

    // Expense 2: B pays 6000 for A, B, C (2000 each)
    await Expense.create({
      group: groupId,
      paidBy: userB,
      amount: 6000,
      description: "WiFi",
      splitType: "equal",
      participants: [
        { user: userA, share: 2000 },
        { user: userB, share: 2000 },
        { user: userC, share: 2000 },
      ],
      createdBy: userB,
    });

    // Settlement 1: C pays A 2000
    await Settlement.create({
      group: groupId,
      from: userC,
      to: userA,
      amount: 2000,
      recordedBy: userC,
    });

    // Settlement 2: B pays A 1000
    await Settlement.create({
      group: groupId,
      from: userB,
      to: userA,
      amount: 1000,
      recordedBy: userB,
    });

    const balances = await getNetBalances(groupId, [userA, userB, userC]);
    // Net without settlements:
    // A: +9000 - 3000 - 2000 = +4000
    // B: +6000 - 3000 - 2000 = +1000
    // C: 0 - 3000 - 2000 = -5000
    // After settlements:
    // A received 2000 (from C) + 1000 (from B) = 3000 -> 4000 - 3000 = +1000
    // B paid 1000 (to A) -> 1000 + 1000 = +2000
    // C paid 2000 (to A) -> -5000 + 2000 = -3000
    expect(balances[userA]).toBe(1000);
    expect(balances[userB]).toBe(2000);
    expect(balances[userC]).toBe(-3000);

    const total = Object.values(balances).reduce((acc, v) => acc + v, 0);
    expect(total).toBe(0);

    const suggestions = getSuggestedSettlements(balances);
    expect(suggestions).toHaveLength(2);
    // Debtor C (3000) matched with Creditor B (2000) then Creditor A (1000)
    expect(suggestions).toContainEqual({ from: userC, to: userB, amount: 2000 });
    expect(suggestions).toContainEqual({ from: userC, to: userA, amount: 1000 });
  });

  test("settlement recorded by creditor (YOU RECEIVE) correctly zeroes balances", async () => {
    // User A paid 10000 for A and B -> B owes A 5000 (A is creditor, B is debtor)
    await Expense.create({
      group: groupId,
      paidBy: userA,
      amount: 10000,
      description: "Groceries",
      splitType: "equal",
      participants: [
        { user: userA, share: 5000 },
        { user: userB, share: 5000 },
      ],
      createdBy: userA,
    });

    // Creditor (userA) marks as paid: from is debtor (userB), to is creditor (userA), recordedBy is creditor (userA)
    await Settlement.create({
      group: groupId,
      from: userB,
      to: userA,
      amount: 5000,
      recordedBy: userA,
    });

    const balances = await getNetBalances(groupId, [userA, userB]);
    expect(balances[userA]).toBe(0);
    expect(balances[userB]).toBe(0);
    expect(getSuggestedSettlements(balances)).toEqual([]);
  });

  test("settlement recorded by debtor (YOU PAY) correctly zeroes balances", async () => {
    // User A paid 10000 for A and B -> B owes A 5000
    await Expense.create({
      group: groupId,
      paidBy: userA,
      amount: 10000,
      description: "Groceries",
      splitType: "equal",
      participants: [
        { user: userA, share: 5000 },
        { user: userB, share: 5000 },
      ],
      createdBy: userA,
    });

    // Debtor (userB) marks as paid: from is debtor (userB), to is creditor (userA), recordedBy is debtor (userB)
    await Settlement.create({
      group: groupId,
      from: userB,
      to: userA,
      amount: 5000,
      recordedBy: userB,
    });

    const balances = await getNetBalances(groupId, [userA, userB]);
    expect(balances[userA]).toBe(0);
    expect(balances[userB]).toBe(0);
    expect(getSuggestedSettlements(balances)).toEqual([]);
  });
});
