const express = require("express");
const {
  createSettlement,
  getSettlements,
} = require("../controllers/settlementController");
const protect = require("../middleware/auth");
const groupMembership = require("../middleware/groupMembership");

const router = express.Router({ mergeParams: true });

router.use(protect, groupMembership);

router.post("/", createSettlement);
router.get("/", getSettlements);

module.exports = router;
