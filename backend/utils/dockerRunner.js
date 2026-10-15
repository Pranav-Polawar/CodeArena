const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const IS_WIN = process.platform === "win32";

// Compile time is NOT counted against the user's time limit.
const COMPILE_ALLOWANCE_MS = 40000;
// Container start-up / overhead allowance on top of the time limit.
const STARTUP_ALLOWANCE_MS = 15000;

const RUNNER_CONFIG = {
  javascript: {
    image: "node:20-alpine",
    file: "solution.js",
    script: (s) => `timeout ${s} node solution.js`,
    local: (dir) => ({ run: ["node", [path.join(dir, "solution.js")]] }),
  },
  python: {
    image: "python:3.11-alpine",
    file: "solution.py",
    script: (s) => `timeout ${s} python3 solution.py`,
    local: (dir) => ({ run: [IS_WIN ? "python" : "python3", [path.join(dir, "solution.py")]] }),
  },
  cpp: {
    image: "gcc:13",
    file: "solution.cpp",
    script: (s) => `g++ -O2 -std=c++17 solution.cpp -o solution.out || exit 101; timeout ${s} ./solution.out`,
    local: (dir) => ({
      compile: ["g++", ["-O2", "-std=c++17", path.join(dir, "solution.cpp"), "-o", path.join(dir, IS_WIN ? "solution.exe" : "solution.out")]],
      run: [path.join(dir, IS_WIN ? "solution.exe" : "solution.out"), []],
    }),
  },
  java: {
    image: "eclipse-temurin:17-jdk-alpine",
    file: "Main.java",
    script: (s) => `javac Main.java || exit 101; timeout ${s} java -Xmx256m Main`,
    local: (dir) => ({
      compile: ["javac", [path.join(dir, "Main.java")]],
      run: ["java", ["-cp", dir, "Main"]],
    }),
  },
};

const MAX_OUT = 50000;

/** Run a command, collect (capped) output, optionally feed stdin, enforce a timeout. */
function runCmd(cmd, args, { input = "", timeoutMs = 0, cwd } = {}) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const done = (r) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, timedOut, ...r });
    };

    let proc;
    try {
      proc = spawn(cmd, args, { cwd, windowsHide: true });
    } catch (e) {
      return resolve({ stdout: "", stderr: e.message, timedOut: false, code: null, error: e });
    }

    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          try { proc.kill("SIGKILL"); } catch (e) {}
        }, timeoutMs)
      : null;

    proc.stdout.on("data", (c) => { if (stdout.length < MAX_OUT) stdout += c.toString(); });
    proc.stderr.on("data", (c) => { if (stderr.length < MAX_OUT) stderr += c.toString(); });
    proc.on("error", (error) => done({ code: null, error }));
    proc.on("close", (code) => done({ code }));

    proc.stdin.on("error", () => {}); // ignore EPIPE if the program exits without reading input
    try {
      if (input) proc.stdin.write(input);
      proc.stdin.end();
    } catch (e) {}
  });
}

function cleanTemp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
}

// ---------------------------------------------------------------------------
// Docker availability
// ---------------------------------------------------------------------------
let dockerAvailable = false;
let lastCheck = 0;

async function checkDockerAvailable() {
  if (dockerAvailable) return true;
  if (Date.now() - lastCheck < 10000) return false; // don't hammer `docker info`
  lastCheck = Date.now();
  const r = await runCmd("docker", ["info", "--format", "{{.ServerVersion}}"], { timeoutMs: 15000 });
  dockerAvailable = r.code === 0 && !r.error;
  if (dockerAvailable) console.log("[DockerRunner] Docker daemon detected, using isolated containers.");
  else console.log("[DockerRunner] Docker daemon not reachable:", (r.stderr || r.error?.message || "").trim().split("\n")[0]);
  return dockerAvailable;
}

/** Pull runner images in the background so the first submission isn't slow. */
async function warmUp() {
  if (!(await checkDockerAvailable())) return;
  const images = [...new Set(Object.values(RUNNER_CONFIG).map((c) => c.image))];
  for (const img of images) {
    const have = await runCmd("docker", ["image", "inspect", img], { timeoutMs: 20000 });
    if (have.code === 0) continue;
    console.log(`[DockerRunner] Pulling runner image ${img} (first run only)...`);
    const pull = await runCmd("docker", ["pull", img], { timeoutMs: 20 * 60 * 1000 });
    console.log(pull.code === 0 ? `[DockerRunner] Ready: ${img}` : `[DockerRunner] Could not pull ${img}: ${pull.stderr.trim()}`);
  }
}

// ---------------------------------------------------------------------------
// Docker execution.
// No bind mounts: the source is copied in with `docker cp`, so this works the
// same from Windows, from Linux, and from inside the backend container.
// ---------------------------------------------------------------------------
async function runInDocker(sourceCode, languageKey, stdin = "", timeoutMs = 5000) {
  const config = RUNNER_CONFIG[languageKey];
  if (!config) return { stdout: "", stderr: `Unsupported language: ${languageKey}`, status: "Compilation Error", timeMs: 0 };

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oj-"));
  const jobDir = path.join(tempRoot, "job");
  fs.mkdirSync(jobDir);
  fs.writeFileSync(path.join(jobDir, config.file), sourceCode, "utf-8");

  const name = `oj-run-${crypto.randomBytes(6).toString("hex")}`;
  const seconds = Math.max(1, Math.ceil(timeoutMs / 1000));
  const script = `cd /tmp/job && ${config.script(seconds)}`;
  const compiled = languageKey === "cpp" || languageKey === "java";

  const fail = (stderr, status = "Runtime Error", extra = {}) => ({ stdout: "", stderr, status, timeMs: 0, ...extra });

  try {
    // 1. create (pulls the image automatically if it is missing)
    const create = await runCmd(
      "docker",
      [
        "create", "-i", "--name", name,
        "--network", "none",
        "--memory", "512m", "--memory-swap", "512m",
        "--cpus", "1",
        "--pids-limit", "256",
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        config.image, "sh", "-c", script,
      ],
      { timeoutMs: 20 * 60 * 1000 }
    );
    if (create.code !== 0) return fail(`Could not create runner container: ${create.stderr || create.error?.message}`);

    // 2. copy source into the container (/tmp/job)
    const cp = await runCmd("docker", ["cp", jobDir, `${name}:/tmp/`], { timeoutMs: 30000 });
    if (cp.code !== 0) return fail(`Could not copy code into runner: ${cp.stderr || cp.error?.message}`);

    // 3. start, feed stdin, collect output
    const startedAt = Date.now();
    const limit = timeoutMs + STARTUP_ALLOWANCE_MS + (compiled ? COMPILE_ALLOWANCE_MS : 0);
    const run = await runCmd("docker", ["start", "-a", "-i", name], { input: stdin, timeoutMs: limit });
    const timeMs = Date.now() - startedAt;

    if (run.timedOut) {
      runCmd("docker", ["kill", name], { timeoutMs: 10000 });
      return { stdout: run.stdout, stderr: `Time Limit Exceeded (>${timeoutMs}ms)`, status: "Time Limit Exceeded", timeMs };
    }
    if (run.error) return fail(run.error.message, "Runtime Error", { timeMs });

    switch (run.code) {
      case 0:
        return { stdout: run.stdout, stderr: run.stderr, status: "Accepted", timeMs };
      case 101:
        return { stdout: "", stderr: run.stderr || "Compilation failed", status: "Compilation Error", timeMs };
      case 124:
      case 143: // timeout(1) sent SIGTERM
        return { stdout: run.stdout, stderr: `Time Limit Exceeded (>${timeoutMs}ms)`, status: "Time Limit Exceeded", timeMs };
      case 137:
        return { stdout: run.stdout, stderr: run.stderr || "Process was killed (probably memory limit exceeded)", status: "Runtime Error", timeMs };
      default: {
        const syntax = languageKey === "python" && /SyntaxError|IndentationError/.test(run.stderr);
        return {
          stdout: run.stdout,
          stderr: run.stderr || `Exited with code ${run.code}`,
          status: syntax ? "Compilation Error" : "Runtime Error",
          timeMs,
        };
      }
    }
  } finally {
    runCmd("docker", ["rm", "-f", name], { timeoutMs: 15000 });
    cleanTemp(tempRoot);
  }
}

// ---------------------------------------------------------------------------
// Local fallback (no Docker). Runs code directly on this machine, so it is
// only used when STRICT_DOCKER is not "true". Intended for local development.
// ---------------------------------------------------------------------------
async function runInProcessSandbox(sourceCode, languageKey, stdin = "", timeoutMs = 5000) {
  const config = RUNNER_CONFIG[languageKey];
  if (!config) return { stdout: "", stderr: `Unsupported language: ${languageKey}`, status: "Compilation Error", timeMs: 0 };

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "oj-local-"));
  fs.writeFileSync(path.join(tempDir, config.file), sourceCode, "utf-8");
  const plan = config.local(tempDir);

  try {
    if (plan.compile) {
      // Compile time is separate from (and much more generous than) the run limit.
      const c = await runCmd(plan.compile[0], plan.compile[1], { cwd: tempDir, timeoutMs: COMPILE_ALLOWANCE_MS });
      if (c.error) {
        const hint = c.error.code === "ENOENT" ? `'${plan.compile[0]}' is not installed or not on PATH. ` : "";
        return { stdout: "", stderr: hint + c.error.message, status: "Compilation Error", timeMs: 0 };
      }
      if (c.timedOut) return { stdout: "", stderr: `Compilation timed out after ${COMPILE_ALLOWANCE_MS}ms`, status: "Compilation Error", timeMs: 0 };
      if (c.code !== 0) return { stdout: "", stderr: c.stderr || c.stdout || "Compilation failed", status: "Compilation Error", timeMs: 0 };
    }

    const startedAt = Date.now();
    const r = await runCmd(plan.run[0], plan.run[1], { cwd: tempDir, input: stdin, timeoutMs });
    const timeMs = Date.now() - startedAt;

    if (r.timedOut) return { stdout: r.stdout, stderr: `Time Limit Exceeded (>${timeoutMs}ms)`, status: "Time Limit Exceeded", timeMs };
    if (r.error) return { stdout: "", stderr: r.error.message, status: "Runtime Error", timeMs };
    if (r.code !== 0) return { stdout: r.stdout, stderr: r.stderr || `Process exited with code ${r.code}`, status: "Runtime Error", timeMs };
    return { stdout: r.stdout, stderr: "", status: "Accepted", timeMs };
  } finally {
    cleanTemp(tempDir);
  }
}

async function executeIsolated(sourceCode, languageKey, stdin = "", timeoutMs = 5000) {
  if (await checkDockerAvailable()) return runInDocker(sourceCode, languageKey, stdin, timeoutMs);

  if (process.env.STRICT_DOCKER === "true") {
    return {
      stdout: "",
      stderr: "Docker is not reachable. Start Docker Desktop (and make sure /var/run/docker.sock is mounted into the backend container).",
      status: "Runtime Error",
      timeMs: 0,
    };
  }
  return runInProcessSandbox(sourceCode, languageKey, stdin, timeoutMs);
}

module.exports = { executeIsolated, checkDockerAvailable, runInDocker, runInProcessSandbox, warmUp };
