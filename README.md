# ⚡ CodeArena — Online Judge

CodeArena is a full-stack MERN online judge. Users register, solve algorithmic problems in the browser, and get automatic verdicts from test cases. Code execution works in two modes: **online** (deployed app) it is sent to **Judge0**, and **offline** (local development) it runs inside isolated, resource-limited Docker containers. Google Gemini provides optional AI hints that nudge you toward a solution without giving it away.

---

## ✨ Features

- **Multi-language runner**: C++, Java, Python 3 and JavaScript (Node.js).
- **Automatic judge**: runs your code against every test case and returns one of `Accepted`, `Wrong Answer`, `Compilation Error`, `Runtime Error` or `Time Limit Exceeded`.
- **Dual execution engine**:
  - **Online (production)**: code is executed by Judge0, so the application server needs no Docker access.
  - **Offline (local)**: every run happens in a throwaway Docker container with no network, a memory limit, a CPU limit, a process limit and dropped Linux capabilities.
- **AI hints**: a Gemini-powered coding mentor gives a short conceptual hint, never full code. A built-in fallback hint is used if the API is unavailable.
- **Code editor**: CodeMirror editor with syntax highlighting and starter code for each language.
- **Authentication**: JWT sessions, bcrypt-hashed passwords, protected routes.
- **Admin portal**: admins can create, edit and delete problems and their test cases. Non-admins only see the first test case as a sample.
- **Submission history**: every user can review their past submissions and verdicts.

---

## 📐 Architecture

```
          Browser (React + Vite, served by Nginx)
                          │
                          │  /api  (proxied)
                          ▼
              Backend (Node.js + Express)
     Auth · Problems · Submissions · AI Hints
        │                │                 │
        ▼                ▼                 ▼
  MongoDB          Google Gemini     Code execution engine
 (Atlas or local)   (AI hints)               │
                                 ┌───────────┴───────────┐
                            Online mode             Offline mode
                                 ▼                       ▼
                              Judge0              Docker Engine
                                                 (via docker.sock)
                                                         ▼
                                              Throwaway runner container
                                              gcc · temurin · python · node
```

**How a submission is judged**

1. The frontend posts `{ problemId, code, languageId }` to `/api/submissions`.
2. For each test case, the backend sends the code and the test input to the execution engine:
   - **Online**: a request to Judge0, which compiles and runs the program and returns the result.
   - **Offline**: the backend creates a runner container, copies the source into it with `docker cp`, starts it, and feeds the input on stdin (`backend/utils/dockerRunner.js`).
3. The program is compiled (C++/Java) and run under a time limit. In offline mode, compile time is not counted against that limit.
4. Output is compared to the expected output (trailing whitespace and line-ending differences are ignored). The first failing test case decides the verdict.
5. The submission and verdict are saved in MongoDB (offline mode also removes the runner container).

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router, Axios, CodeMirror (`@uiw/react-codemirror`), react-hot-toast, react-icons |
| Backend | Node.js 20, Express, Mongoose, JWT, bcryptjs |
| Database | MongoDB (Atlas or the local container) |
| AI | Google Gemini via `@google/genai` |
| Execution (online) | Judge0 |
| Execution (offline) | Docker (`gcc:13`, `eclipse-temurin:17-jdk-alpine`, `python:3.11-alpine`, `node:20-alpine`) |
| Serving | Nginx (production frontend container) |

---

## 📁 Project Structure

```
.
├── backend/
│   ├── config/db.js              # MongoDB connection
│   ├── controllers/              # auth, problems, submissions, AI hints
│   ├── middleware/auth.js        # JWT protect + adminOnly
│   ├── models/                   # User, Problem, Submission
│   ├── routes/
│   ├── utils/dockerRunner.js     # offline Docker sandbox runner
│   ├── Dockerfile
│   ├── server.js
|   └──services/pistonRunner.js
├── frontend/
│   ├── src/                      # pages, context, api client
│   ├── nginx.conf                # serves the app and proxies /api
│   ├── Dockerfile
│   └── vite.config.js
├── docker-compose.yml            # offline stack: mongo + backend + frontend
├── server.js                     # optional unified server (API + frontend)
├── .env.example
└── README.md
```

---

## 🗄️ Data Models

**User**: `username` (unique), `email` (unique), `password` (hashed), `role` (`user` | `admin`), timestamps.

**Problem**: `title`, `description`, `difficulty` (`Easy` | `Medium` | `Hard`), `constraints`, `testCases: [{ input, expectedOutput }]`, `createdBy`, timestamps.

**Submission**: `user`, `problem`, `code`, `languageId` (`javascript` | `python` | `cpp` | `java`), `verdict`, `output`, timestamps.

---

## 🔌 API Reference

### Auth (`/api/auth`)

| Method | Endpoint | Description | Access |
| --- | --- | --- | --- |
| `POST` | `/register` | Create an account and get a JWT | Public |
| `POST` | `/login` | Log in and get a JWT | Public |
| `GET` | `/me` | Current user profile | Private |

### Problems (`/api/problems`)

| Method | Endpoint | Description | Access |
| --- | --- | --- | --- |
| `GET` | `/` | List problems (title, difficulty) | Public |
| `GET` | `/:id` | Problem details (admins see all test cases, others see one sample) | Private |
| `POST` | `/` | Create a problem with test cases | Admin |
| `PUT` | `/:id` | Update a problem | Admin |
| `DELETE` | `/:id` | Delete a problem | Admin |

### Submissions (`/api/submissions`)

| Method | Endpoint | Description | Access |
| --- | --- | --- | --- |
| `POST` | `/` | Run code against all test cases and store the verdict | Private |
| `GET` | `/mine` | List your submissions | Private |

### AI (`/api/ai`)

| Method | Endpoint | Description | Access |
| --- | --- | --- | --- |
| `POST` | `/hint` | Get a conceptual hint for a problem | Private |

Health check: `GET /api/health`.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` (project root) and `backend/.env.example` to `backend/.env`, then fill in your own values. **Never commit real secrets.**

| Variable | Description |
| --- | --- |
| `MONGO_URI` | MongoDB connection string (Atlas or `mongodb://mongo:27017/online-judge`) |
| `JWT_SECRET` | Long random string used to sign tokens |
| `GEMINI_API_KEY` | Google AI Studio API key (optional; hints fall back without it) |
| `GEMINI_MODEL` | Gemini model name (optional, default `gemini-2.5-flash`) |
| `ADMIN_EMAILS` | Comma-separated emails that are automatically given the admin role |
| `PORT` | Backend port (default `5000`) |
| `CLIENT_URL` | Allowed CORS origin (default `*`) |
| `STRICT_DOCKER` | Offline mode: `true` = refuse to run code if Docker is unavailable (recommended) |
<!-- TODO: add the Judge0 variables your online mode uses (API URL, key, etc.) and how the mode is selected -->
| `VITE_API_URL` | Frontend API base URL (default `/api`, set at build time) |

---

## 🚀 Running the Project

### Option 1: Docker Compose (offline mode, recommended locally)

This runs everything on your own machine, with Docker as the code execution engine and no internet needed for judging.

Requirements: [Docker Desktop](https://www.docker.com/products/docker-desktop/), running.

```bash
docker compose up -d --build
docker compose logs -f backend
```

- App: http://localhost:8080
- API: http://localhost:5000/api

On first start the backend pulls the four runner images in the background. `gcc:13` is large, so the first C++ submission may have to wait a few minutes. The backend log shows progress.

The backend container mounts `/var/run/docker.sock` so it can start runner containers. This gives the backend control of your Docker engine, so only run it on a machine you trust.

If `MONGO_URI` is set in the root `.env`, Compose uses it (for example Atlas). If not, it uses the bundled `mongo` container.

Stop everything with `docker compose down` (add `-v` to also delete the local database volume).

### Option 2: Local Node.js

```bash
# install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

Run the backend and frontend in two terminals:

```bash
# Terminal 1: API on http://localhost:5000
cd backend
npm run dev

# Terminal 2: frontend on http://localhost:3000 (proxies /api to :5000)
cd frontend
npm run dev
```

If Docker Desktop is running, submissions still run in sandbox containers. If it isn't and `STRICT_DOCKER` is not `true`, the backend falls back to compilers installed on your machine (`g++`, `javac`, `python`, `node`). That fallback is **not sandboxed**, so use it only for your own local testing.

### Becoming an admin

Register or log in with an email listed in `ADMIN_EMAILS`. An **Add Problem** button then appears in the navbar.

---

## 🌐 Deployment

- **Frontend (Vercel)**: set the root to `frontend`, build command `npm run build`, output `dist`, and set `VITE_API_URL` to your backend URL ending in `/api`.
- **Backend (Render)**: run `node server.js` with the environment variables above, including your Judge0 settings.
- **Online code execution uses Judge0.** Render's standard Node runtime has no Docker engine, so the Dockerfiles and `docker-compose.yml` in this repo are only for the offline/local setup and are not used in the online deployment.

---

## 🧰 Troubleshooting

| Problem | Fix |
| --- | --- |
| `failed to connect to the docker API` | Start Docker Desktop and wait for "Engine running" |
| MongoDB `Network Error` | Whitelist your IP in Atlas → Network Access, check the cluster isn't paused, and try different DNS (`8.8.8.8`) |
| First C++/Java run is very slow | The runner image is still downloading; watch `docker compose logs -f backend` |
| Online submissions fail or time out | Check your Judge0 URL, API key and usage quota, and that the backend has the Judge0 variables set |
| Verdict says "Docker is not reachable" | Docker isn't running, or `/var/run/docker.sock` isn't mounted into the backend container |
| Frontend can't reach API | Rebuild the frontend after changing `VITE_API_URL`: `docker compose up -d --build frontend` |

---

## 🔒 Security Notes

- Keep `.env` files out of Git (they are already in `.gitignore`).
- Use a strong random `JWT_SECRET`.
- Runner containers have no network, a 512 MB memory cap, 1 CPU, a 256-process limit and no extra Linux capabilities.

---

## 📜 License

Distributed under the MIT License.