const express = require("express");
const router = express.Router();
const { getHint } = require("../controllers/aiController");
const { protect } = require("../middleware/auth");

router.post("/hint", protect, getHint);

module.exports = router;
