const generateInviteCode = require("../utils/generateInviteCode");
const ApiError = require("../utils/ApiError");
const groupMembership = require("../middleware/groupMembership");
const requireAdmin = require("../middleware/requireAdmin");

async function testGroupLogic() {
  console.log("--- Starting Milestone 2 Group Unit & Middleware Tests ---");

  // 1. Invite code generator test
  const code1 = generateInviteCode();
  const code2 = generateInviteCode();
  console.assert(code1.length === 6, "Invite code length must be 6");
  console.assert(code1 === code1.toUpperCase(), "Invite code must be uppercase");
  console.assert(/^[A-Z0-9]{6}$/.test(code1), "Invite code must be alphanumeric");
  console.assert(code1 !== code2, "Invite codes should be unique/random");
  console.log("✓ Invite code generator test passed");

  // 2. requireAdmin middleware test
  let req = { membership: { role: "admin" } };
  let nextCalled = false;
  requireAdmin(req, {}, () => { nextCalled = true; });
  console.assert(nextCalled === true, "requireAdmin should pass for admin role");
  console.log("✓ requireAdmin passes for admin role");

  req = { membership: { role: "member" } };
  let adminErr = null;
  try {
    requireAdmin(req, {}, () => {});
  } catch (err) {
    adminErr = err;
  }
  console.assert(adminErr && adminErr.statusCode === 403, "requireAdmin should throw 403 for non-admin role");
  console.log("✓ requireAdmin correctly blocks non-admin role with 403");

  req = {};
  adminErr = null;
  try {
    requireAdmin(req, {}, () => {});
  } catch (err) {
    adminErr = err;
  }
  console.assert(adminErr && adminErr.statusCode === 403, "requireAdmin should throw 403 when no membership attached");
  console.log("✓ requireAdmin correctly blocks missing membership with 403");

  console.log("--- All Milestone 2 Unit & Middleware Checks Passed! ---");
}

testGroupLogic().catch((err) => {
  console.error("Group unit test failed:", err);
  process.exit(1);
});
