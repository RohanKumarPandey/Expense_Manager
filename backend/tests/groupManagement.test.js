const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const app = require("../src/app");
const Group = require("../src/models/Group");
const User = require("../src/models/User");
const Expense = require("../src/models/Expense");
const Settlement = require("../src/models/Settlement");
const jwt = require("jsonwebtoken");

let mongoServer;
let adminUser, adminToken, adminId;
let memberUser, memberToken, memberId;
let nonMemberUser, nonMemberToken, nonMemberId;
let testGroup, groupId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.JWT_SECRET = "test-group-secret";
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Group.deleteMany({});
  await Expense.deleteMany({});
  await Settlement.deleteMany({});

  adminUser = await User.create({
    name: "Admin User",
    email: "admin@test.com",
    password: "password123",
  });
  adminId = adminUser._id.toString();
  adminToken = jwt.sign({ id: adminId }, process.env.JWT_SECRET);

  memberUser = await User.create({
    name: "Regular Member",
    email: "member@test.com",
    password: "password123",
  });
  memberId = memberUser._id.toString();
  memberToken = jwt.sign({ id: memberId }, process.env.JWT_SECRET);

  nonMemberUser = await User.create({
    name: "Non Member",
    email: "nonmember@test.com",
    password: "password123",
  });
  nonMemberId = nonMemberUser._id.toString();
  nonMemberToken = jwt.sign({ id: nonMemberId }, process.env.JWT_SECRET);

  testGroup = await Group.create({
    name: "Test Group",
    inviteCode: "GRP001",
    createdBy: adminId,
    members: [
      { user: adminId, role: "admin", joinedAt: new Date() },
      { user: memberId, role: "member", joinedAt: new Date() },
    ],
  });
  groupId = testGroup._id.toString();

  // Create an expense associated with the group
  await Expense.create({
    group: groupId,
    paidBy: adminId,
    amount: 1000,
    description: "Cleaning supplies",
    category: "utilities",
    splitType: "equal",
    participants: [{ user: adminId, share: 1000 }],
    createdBy: adminId,
  });
});

describe("Group Management — Delete Group", () => {
  test("Admin can delete a group with multiple members, expenses, and settlements", async () => {
    // Add settlement record to verify cascade cleanup
    await Settlement.create({
      group: groupId,
      from: memberId,
      to: adminId,
      amount: 500,
      recordedBy: adminId,
    });

    const res = await request(app)
      .delete(`/api/groups/${groupId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify group is deleted
    const groupInDb = await Group.findById(groupId);
    expect(groupInDb).toBeNull();

    // Verify associated expenses and settlements are cleaned up
    const expensesInDb = await Expense.find({ group: groupId });
    expect(expensesInDb.length).toBe(0);

    const settlementsInDb = await Settlement.find({ group: groupId });
    expect(settlementsInDb.length).toBe(0);
  });

  test("Admin can delete an empty group with only the admin and no expenses", async () => {
    const singleAdminGroup = await Group.create({
      name: "Solo Admin Group",
      inviteCode: "SOLO01",
      createdBy: adminId,
      members: [{ user: adminId, role: "admin", joinedAt: new Date() }],
    });
    const soloGroupId = singleAdminGroup._id.toString();

    const res = await request(app)
      .delete(`/api/groups/${soloGroupId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const groupInDb = await Group.findById(soloGroupId);
    expect(groupInDb).toBeNull();
  });

  test("Non-admin member cannot delete the group", async () => {
    const res = await request(app)
      .delete(`/api/groups/${groupId}`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(403);

    // Verify group still exists
    const groupInDb = await Group.findById(groupId);
    expect(groupInDb).not.toBeNull();
  });

  test("Non-member cannot delete the group", async () => {
    const res = await request(app)
      .delete(`/api/groups/${groupId}`)
      .set("Authorization", `Bearer ${nonMemberToken}`);

    expect(res.status).toBe(403);
  });

  test("Deleted group is no longer accessible via GET /api/groups/:id", async () => {
    await request(app)
      .delete(`/api/groups/${groupId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    const res = await request(app)
      .get(`/api/groups/${groupId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404); // group is deleted
  });

  test("After group deletion, its invite code cannot be used to rejoin", async () => {
    await request(app)
      .delete(`/api/groups/${groupId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    // Member attempts to join using the old invite code
    const res = await request(app)
      .post("/api/groups/join")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ inviteCode: "GRP001" });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/invalid invite code/i);
  });
});

describe("Group Management — Leave & Rejoin Group", () => {
  test("Member with zero balance can leave the group", async () => {
    const res = await request(app)
      .delete(`/api/groups/${groupId}/leave`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(200);

    const updatedGroup = await Group.findById(groupId);
    expect(updatedGroup.members.some((m) => m.user.toString() === memberId)).toBe(false);
  });

  test("Sole admin cannot leave group while other members remain", async () => {
    const res = await request(app)
      .delete(`/api/groups/${groupId}/leave`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/sole admin/i);
  });

  test("Legitimate user can join and rejoin group using invite code", async () => {
    // Member leaves first
    await request(app)
      .delete(`/api/groups/${groupId}/leave`)
      .set("Authorization", `Bearer ${memberToken}`);

    // Rejoin using invite code
    const res = await request(app)
      .post("/api/groups/join")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ inviteCode: "GRP001" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedGroup = await Group.findById(groupId);
    expect(updatedGroup.members.some((m) => m.user.toString() === memberId)).toBe(true);
  });

  test("Member with non-zero balance cannot leave until settled", async () => {
    // Add expense where member owes admin money
    await Expense.create({
      group: groupId,
      paidBy: adminId,
      amount: 2000,
      description: "Electricity bill",
      category: "utilities",
      splitType: "equal",
      participants: [
        { user: adminId, share: 1000 },
        { user: memberId, share: 1000 },
      ],
      createdBy: adminId,
    });

    const res = await request(app)
      .delete(`/api/groups/${groupId}/leave`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/outstanding balance/i);
  });
});

describe("Expense Payer Extraction & Group Membership Authorization", () => {
  test("AI parser extracts another group member as payer and resolves their userId", async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/ai/parse-expense`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ text: "Regular Member paid 1200 for dinner" });

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
    expect(res.body.data.draftExpense.paidById).toBe(memberId);
    expect(res.body.data.draftExpense.amount).toBe(1200);
    expect(res.body.data.draftExpense.description).toBe("Dinner");
  });

  test("AI parser rejects non-member payer with clear failure reason", async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/ai/parse-expense`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ text: "Rahul paid 500 for drinks" });

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(false);
    expect(res.body.data.reason).toMatch(/not a member of this group/i);
  });

  test("Authenticated user can record an expense paid by another group member", async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        amount: 1500,
        description: "Team Dinner",
        category: "food",
        splitType: "equal",
        paidBy: memberId,
        participantIds: [adminId, memberId],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.expense.paidBy).toBe(memberId);
    expect(res.body.data.expense.createdBy).toBe(adminId);
  });

  test("Backend rejects expense creation when payer is not in the group", async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        amount: 800,
        description: "Snacks",
        category: "food",
        splitType: "equal",
        paidBy: nonMemberId,
        participantIds: [adminId, memberId],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/payer must be a member/i);
  });
});
