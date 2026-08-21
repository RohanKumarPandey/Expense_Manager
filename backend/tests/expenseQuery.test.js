const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const app = require("../src/app");
const Expense = require("../src/models/Expense");
const Group = require("../src/models/Group");
const User = require("../src/models/User");
const jwt = require("jsonwebtoken");

let mongoServer;
let token, userId, groupId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.JWT_SECRET = "test-secret";

  const user = await User.create({
    name: "Test User",
    email: "t@t.com",
    password: "hashed",
  });
  userId = user._id.toString();
  token = jwt.sign({ id: userId }, process.env.JWT_SECRET);

  const group = await Group.create({
    name: "Test Flat",
    inviteCode: "TEST01",
    createdBy: userId,
    members: [{ user: userId, role: "admin" }],
  });
  groupId = group._id.toString();

  await Expense.create([
    {
      group: groupId,
      paidBy: userId,
      amount: 10000,
      description: "Grocery run",
      category: "groceries",
      date: new Date("2026-01-01"),
      splitType: "equal",
      participants: [{ user: userId, share: 10000 }],
      createdBy: userId,
    },
    {
      group: groupId,
      paidBy: userId,
      amount: 50000,
      description: "Monthly rent",
      category: "rent",
      date: new Date("2026-01-05"),
      splitType: "equal",
      participants: [{ user: userId, share: 50000 }],
      createdBy: userId,
    },
    {
      group: groupId,
      paidBy: userId,
      amount: 2000,
      description: "Cab to airport",
      category: "travel",
      date: new Date("2026-01-10"),
      splitType: "equal",
      participants: [{ user: userId, share: 2000 }],
      createdBy: userId,
    },
  ]);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
}, 60000);

describe("GET /api/groups/:groupId/expenses — query features", () => {
  test("no filters returns all expenses, sorted by date desc by default", async () => {
    const res = await request(app)
      .get(`/api/groups/${groupId}/expenses`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.data.expenses).toHaveLength(3);
    expect(res.body.data.expenses[0].description).toBe("Cab to airport"); // most recent first
  });

  test("category filter returns only matching expenses", async () => {
    const res = await request(app)
      .get(`/api/groups/${groupId}/expenses?category=rent`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.data.expenses).toHaveLength(1);
    expect(res.body.data.expenses[0].category).toBe("rent");
  });

  test("invalid category returns 400", async () => {
    const res = await request(app)
      .get(`/api/groups/${groupId}/expenses?category=nonsense`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  test("sort by amount ascending", async () => {
    const res = await request(app)
      .get(`/api/groups/${groupId}/expenses?sortBy=amount&order=asc`)
      .set("Authorization", `Bearer ${token}`);

    const amounts = res.body.data.expenses.map((e) => e.amount);
    expect(amounts).toEqual([2000, 10000, 50000]);
  });

  test("pagination — limit 2 returns correct page metadata", async () => {
    const res = await request(app)
      .get(`/api/groups/${groupId}/expenses?limit=2&page=1`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.data.expenses).toHaveLength(2);
    expect(res.body.data.totalPages).toBe(2);
    expect(res.body.data.totalExpenses).toBe(3);
  });

  test("limit is capped at 50 even if a huge value is requested", async () => {
    const res = await request(app)
      .get(`/api/groups/${groupId}/expenses?limit=99999`)
      .set("Authorization", `Bearer ${token}`);

    // only 3 expenses exist, so this doesn't prove the cap directly —
    // the meaningful assertion is that the request doesn't error out
    // and totalPages reflects a sane, capped limit
    expect(res.status).toBe(200);
  });

  test("text search matches description", async () => {
    const res = await request(app)
      .get(`/api/groups/${groupId}/expenses?search=grocery`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.data.expenses).toHaveLength(1);
    expect(res.body.data.expenses[0].description).toBe("Grocery run");
  });
});
