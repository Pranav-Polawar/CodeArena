const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    problem: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    code: { type: String, required: true },
    languageId: { type: String, required: true }, // "javascript" | "python" | "cpp" | "java"
    verdict: { type: String, default: "Pending" },
    output: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);
