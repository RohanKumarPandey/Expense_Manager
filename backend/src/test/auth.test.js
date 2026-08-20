const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const protect = require("../middleware/auth");
const errorHandler = require("../middleware/errorHandler");

process.env.JWT_SECRET = "testsecret1234567890";
process.env.JWT_EXPIRES_IN = "7d";

async function testBackendUnit() {
  console.log("--- Starting Backend Unit & Middleware Verification ---");

  // 1. ApiError & ApiResponse test
  const err = new ApiError(400, "Bad Request Test");
  console.assert(err.statusCode === 400, "ApiError statusCode test failed");
  console.assert(err.message === "Bad Request Test", "ApiError message test failed");
  console.log("✓ ApiError test passed");

  const resp = new ApiResponse({ user: { id: "123" } }, "Success");
  console.assert(resp.success === true, "ApiResponse success test failed");
  console.assert(resp.data.user.id === "123", "ApiResponse data test failed");
  console.log("✓ ApiResponse test passed");

  // 2. JWT & Password Hashing test
  const token = jwt.sign({ id: "user123" }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.assert(decoded.id === "user123", "JWT verify failed");
  console.log("✓ JWT sign and verify passed");

  const hashed = await bcrypt.hash("password123", 10);
  const match = await bcrypt.compare("password123", hashed);
  console.assert(match === true, "Bcrypt hash & compare test failed");
  console.log("✓ Bcrypt hashing passed");

  // 3. Auth Protect Middleware test
  let req = { headers: {} };
  let res = {};
  let nextCalled = false;
  let passedErr = null;

  const reqHandler = protect(req, res, (e) => {
    if (e) passedErr = e;
    else nextCalled = true;
  });

  await reqHandler;
  console.assert(passedErr && passedErr.statusCode === 401, "Protect missing token failed");
  console.log("✓ Protect middleware correctly blocks requests with no token (401)");

  // With valid token
  req = { headers: { authorization: `Bearer ${token}` } };
  passedErr = null;
  nextCalled = false;
  const reqHandlerValid = protect(req, res, (e) => {
    if (e) passedErr = e;
    else nextCalled = true;
  });
  await reqHandlerValid;
  console.assert(nextCalled === true && req.user.id === "user123", "Protect valid token failed");
  console.log("✓ Protect middleware correctly attaches user for valid token");

  console.log("--- All Unit & Middleware Checks Passed Successfully! ---");
}

testBackendUnit().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
