const express = require("express");
const { parseExpense } = require("../controllers/aiController");
const protect = require("../middleware/auth");
const groupMembership = require("../middleware/groupMembership");

const router = express.Router({ mergeParams: true });

router.use(protect, groupMembership);
router.post("/parse-expense", parseExpense);

module.exports = router;
