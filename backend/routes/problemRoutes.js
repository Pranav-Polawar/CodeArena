const express = require("express");
const router = express.Router();
const {
  getProblems, getProblem, createProblem, updateProblem, deleteProblem,
} = require("../controllers/problemController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/", getProblems);
router.get("/:id", protect, getProblem);
router.post("/", protect, adminOnly, createProblem);
router.put("/:id", protect, adminOnly, updateProblem);
router.delete("/:id", protect, adminOnly, deleteProblem);

module.exports = router;
