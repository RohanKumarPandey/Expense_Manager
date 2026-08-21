const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Expense = require("../src/models/Expense");
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
