const express = require("express");
const {
  createGroup,
  getMyGroups,
  getGroupById,
  joinGroup,
  leaveGroup,
  deleteGroup,
  removeMember,
} = require("../controllers/groupController");
const protect = require("../middleware/auth");
const groupMembership = require("../middleware/groupMembership");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.use(protect); // every route below requires login

router.post("/", createGroup);
router.get("/", getMyGroups);
router.post("/join", joinGroup);

router.get("/:id", groupMembership, getGroupById);
router.delete("/:id", groupMembership, requireAdmin, deleteGroup);
router.delete("/:id/leave", groupMembership, leaveGroup);
router.delete("/:id/members/:userId", groupMembership, requireAdmin, removeMember);

module.exports = router;
