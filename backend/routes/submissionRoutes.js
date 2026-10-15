const express = require("express");
const router = express.Router();
const { submitCode, getMySubmissions } = require("../controllers/submissionController");
const { protect } = require("../middleware/auth");

router.post("/", protect, submitCode);
router.get("/mine", protect, getMySubmissions);

module.exports = router;
