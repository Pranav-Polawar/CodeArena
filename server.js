const path = require("path");
const fs = require("fs");

const envPaths = [
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "backend/.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend/.env"),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath, override: true });
  }
}

process.env.JWT_SECRET = process.env.JWT_SECRET || "oj_project_2026_random_secret_938472";


const express = require("express");
const cors = require("cors");
const connectDB = require("./backend/config/db");
const { warmUp } = require("./backend/utils/dockerRunner");

const authRoutes = require("./backend/routes/authRoutes");
const problemRoutes = require("./backend/routes/problemRoutes");
const submissionRoutes = require("./backend/routes/submissionRoutes");
const aiRoutes = require("./backend/routes/aiRoutes");

const app = express();

// Initialize Database connection
connectDB();

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

// API endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", service: "CodeArena Online Judge", timestamp: new Date() });
});

app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/ai", aiRoutes);

// Error middleware
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

async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  const distPath = path.resolve(__dirname, "frontend/dist");

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true, host: "0.0.0.0" },
        appType: "spa",
        root: path.resolve(__dirname, "frontend"),
      });
      app.use(vite.middlewares);
      console.log("Vite dev middleware initialized");
    } catch (viteErr) {
      console.warn("Could not start Vite middleware:", viteErr.message);
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get("*", (req, res, next) => {
          if (req.path.startsWith("/api")) return next();
          res.sendFile(path.join(distPath, "index.html"));
        });
      }
    }
  } else {
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api")) return next();
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  const PORT = process.env.PORT || 3000;
  const HOST = "0.0.0.0";
  app.listen(PORT, HOST, () => {
    console.log(`CodeArena online judge running at http://${HOST}:${PORT}`);
    warmUp().catch((e) => console.warn("[DockerRunner] warm-up skipped:", e.message));
  });
}

startServer();
