const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Expense = require("../src/models/Expense");
const Settlement = require("../src/models/Settlement");
const Group = require("../src/models/Group");
const User = require("../src/models/User");
const {
  getCrossGroupBalances,
  getCategoryBreakdown,
  getMonthlyTrend,
  getRecentActivity,
} = require("../src/services/dashboardService");

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
  await Group.deleteMany({});
});

describe("dashboardService.getCategoryBreakdown", () => {
  test("sums the user's SHARE, not the full expense amount", async () => {
    const groupId = new mongoose.Types.ObjectId();
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();

    // ₹3000 rent, split evenly two ways -> userA's share is 1500, not 3000
    await Expense.create({
      group: groupId,
      paidBy: userA,
      amount: 300000,
      description: "Rent",
      category: "rent",
      splitType: "equal",
      participants: [
        { user: userA, share: 150000 },
        { user: userB, share: 150000 },
      ],
      createdBy: userA,
    });

    const result = await getCategoryBreakdown(userA.toString(), [groupId]);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("rent");
    expect(result[0].totalPaise).toBe(150000); // NOT 300000
  });

  test("aggregates across multiple expenses in the same category", async () => {
    const groupId = new mongoose.Types.ObjectId();
    const userA = new mongoose.Types.ObjectId();

    await Expense.create([
      {
        group: groupId,
        paidBy: userA,
        amount: 1000,
        description: "Snacks",
        category: "food",
        splitType: "equal",
        participants: [{ user: userA, share: 1000 }],
        createdBy: userA,
      },
      {
        group: groupId,
        paidBy: userA,
        amount: 2000,
        description: "Dinner",
        category: "food",
        splitType: "equal",
        participants: [{ user: userA, share: 2000 }],
        createdBy: userA,
      },
    ]);

    const result = await getCategoryBreakdown(userA.toString(), [groupId]);
    expect(result[0].totalPaise).toBe(3000);
  });
});

describe("dashboardService.getRecentActivity", () => {
  test("merges expenses and settlements, sorted by date descending", async () => {
    const groupId = new mongoose.Types.ObjectId();
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();

    await Expense.create({
      group: groupId,
      paidBy: userA,
      amount: 1000,
      description: "Old expense",
      category: "other",
      splitType: "equal",
      date: new Date("2026-01-01"),
      participants: [{ user: userA, share: 1000 }],
      createdBy: userA,
    });
    await Settlement.create({
      group: groupId,
      from: userB,
      to: userA,
      amount: 500,
      date: new Date("2026-01-15"),
      recordedBy: userB,
    });
    await Expense.create({
      group: groupId,
      paidBy: userA,
      amount: 2000,
      description: "Newest expense",
      category: "other",
      splitType: "equal",
      date: new Date("2026-01-20"),
      participants: [{ user: userA, share: 2000 }],
      createdBy: userA,
    });

    const activity = await getRecentActivity([groupId], 10);

    expect(activity).toHaveLength(3);
    expect(activity[0].type).toBe("expense");
    expect(activity[0].data.description).toBe("Newest expense"); // most recent first
    expect(activity[2].data.description).toBe("Old expense"); // oldest last
  });
});

describe("dashboardService.getCrossGroupBalances", () => {
  test("returns 0 totals for user with no groups or no activity", async () => {
    const userA = new mongoose.Types.ObjectId();
    const balances = await getCrossGroupBalances(userA.toString());
    expect(balances.totalOwed).toBe(0);
    expect(balances.totalOwing).toBe(0);
    expect(balances.groupsSummary).toEqual([]);
  });

  test("correctly calculates totalOwed and totalOwing across multiple groups", async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();

    // Group 1: userA is owed 5000 paise
    const group1 = await Group.create({
      name: "Flat 1",
      inviteCode: "FLAT01",
      createdBy: userA,
      members: [
        { user: userA, role: "admin" },
        { user: userB, role: "member" },
      ],
    });
    await Expense.create({
      group: group1._id,
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

    // Group 2: userA owes 3000 paise
    const group2 = await Group.create({
      name: "Flat 2",
      inviteCode: "FLAT02",
      createdBy: userB,
      members: [
        { user: userA, role: "member" },
        { user: userB, role: "admin" },
      ],
    });
    await Expense.create({
      group: group2._id,
      paidBy: userB,
      amount: 6000,
      description: "WiFi",
      splitType: "equal",
      participants: [
        { user: userA, share: 3000 },
        { user: userB, share: 3000 },
      ],
      createdBy: userB,
    });

    const balances = await getCrossGroupBalances(userA.toString());
    expect(balances.totalOwed).toBe(5000);
    expect(balances.totalOwing).toBe(3000);
    expect(balances.groupsSummary).toHaveLength(2);
  });
});
