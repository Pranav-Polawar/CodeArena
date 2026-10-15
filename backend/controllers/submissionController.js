const Problem = require("../models/Problem");
const Submission = require("../models/Submission");
const { executeCode } = require("../services/pistonRunner");

exports.submitCode = async (req, res) => {
  try {
    const { problemId, code, languageId } = req.body;
    if (!problemId || !code || !languageId) {
      return res.status(400).json({ message: "problemId, code, and languageId are required" });
    }

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: "Problem not found in MongoDB" });

    if (!problem.testCases?.length) {
      return res.status(400).json({ message: "This problem has no test cases configured yet" });
    }

    let verdict = "Accepted";
    let lastOutput = "";
    const totalCount = problem.testCases.length;

    // Evaluate code against test cases using Piston API
    for (let i = 0; i < totalCount; i++) {
      const tc = problem.testCases[i];
      const result = await executeCode(languageId, code, tc.input);

      lastOutput = result.output || "";

      // Check for Execution/Compilation/Runtime Errors
      if (result.status && result.status !== "Accepted") {
        verdict = result.status; // "Compilation Error", "Runtime Error", or "Server Error"
        break;
      }

      // Normalize output and compare against expected output
      const norm = (t) => String(t ?? "").replace(/\r\n/g, "\n").trim();
      if (norm(result.output) !== norm(tc.expectedOutput)) {
        verdict = "Wrong Answer";
        break;
      }
    }

    // Persist submission in MongoDB
    const submission = await Submission.create({
      user: req.user.id,
      problem: problemId,
      code,
      languageId,
      verdict,
      output: lastOutput,
    });

    res.status(201).json(submission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMySubmissions = async (req, res) => {
  try {
    const subs = await Submission.find({ user: req.user.id })
      .populate("problem", "title")
      .sort({ createdAt: -1 });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};