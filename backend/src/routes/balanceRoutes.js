const express = require("express");
const { getGroupBalances } = require("../controllers/balanceController");
const protect = require("../middleware/auth");
const groupMembership = require("../middleware/groupMembership");

const router = express.Router({ mergeParams: true });

router.use(protect, groupMembership);
router.get("/", getGroupBalances);

module.exports = router;
