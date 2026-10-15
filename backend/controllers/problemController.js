const Problem = require("../models/Problem");

// Public: list problems (hide test cases)
exports.getProblems = async (req, res) => {
  try {
    const problems = await Problem.find().select("title difficulty createdAt");
    res.json(problems);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Public: single problem detail (show only first test case as sample for non-admins)
exports.getProblem = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const isAdmin = req.user?.role === "admin";
    const data = problem.toObject();
    if (!isAdmin) {
      data.testCases = (data.testCases || []).slice(0, 1);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: create problem with test cases
exports.createProblem = async (req, res) => {
  try {
    const { title, description, difficulty, constraints, testCases } = req.body;
    if (!title || !description || !testCases?.length) {
      return res.status(400).json({ message: "Title, description, and at least one test case are required" });
    }

    const problem = await Problem.create({
      title,
      description,
      difficulty: difficulty || "Easy",
      constraints: constraints || "",
      testCases,
      createdBy: req.user.id,
    });
    res.status(201).json(problem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: update problem
exports.updateProblem = async (req, res) => {
  try {
    const problem = await Problem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!problem) return res.status(404).json({ message: "Problem not found" });
    res.json(problem);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: delete problem
exports.deleteProblem = async (req, res) => {
  try {
    const problem = await Problem.findByIdAndDelete(req.params.id);
    if (!problem) return res.status(404).json({ message: "Problem not found" });
    res.json({ message: "Problem deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
