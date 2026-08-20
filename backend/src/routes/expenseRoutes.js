const express = require("express");
const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");
const protect = require("../middleware/auth");
const groupMembership = require("../middleware/groupMembership");

const router = express.Router({ mergeParams: true }); // needed to access :groupId from parent router

router.use(protect, groupMembership);

router.post("/", createExpense);
router.get("/", getExpenses);
router.get("/:id", getExpenseById);
router.patch("/:id", updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;
