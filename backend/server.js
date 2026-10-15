const path = require("path");
const fs = require("fs");

// Check and load .env from multiple potential working directories
const envPaths = [
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend/.env"),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath, override: true });
  }
}

// Fallback defaults for security and database connection
process.env.JWT_SECRET = process.env.JWT_SECRET || "oj_project_2026_random_secret_938472";


const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { warmUp } = require("./utils/dockerRunner");

const authRoutes = require("./routes/authRoutes");
const problemRoutes = require("./routes/problemRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

connectDB();

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.get("/", (req, res) => res.json({ status: "CodeArena Online Judge API running", version: "1.0.0" }));
app.get("/api/health", (req, res) => res.json({ status: "OK", timestamp: new Date() }));

app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/ai", aiRoutes);

// Database offline / mongoose error middleware
app.use((err, req, res, next) => {
  if (
    err.name === "MongooseError" ||
    err.name === "MongoNetworkError" ||
    (err.message && err.message.includes("buffering timed out"))
  ) {
    return res.status(503).json({ error: "Database error: MongoDB is unreachable or not connected" });
  }
  console.error("Server error:", err);
  res.status(500).json({ message: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Backend server running on http://${HOST}:${PORT}`);
  warmUp().catch((e) => console.warn("[DockerRunner] warm-up skipped:", e.message));
});

module.exports = app;
