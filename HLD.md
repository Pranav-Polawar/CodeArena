# High Level Design — Online Judge (OJ)

## 1. Overview
A web-based Online Judge where users register, browse coding problems, submit code
in multiple languages, and receive an automated verdict (Accepted / Wrong Answer /
Runtime Error). An AI hint feature nudges users toward a solution approach without
giving away the answer.

## 2. Architecture

```
┌─────────────┐        HTTPS         ┌──────────────────┐        ┌──────────────┐
│   React      │  ───────────────▶   │  Express API      │ ─────▶ │  MongoDB      │
│  (Vite SPA)  │  ◀───────────────   │  (Node.js)         │ ◀───── │  (Atlas)      │
└─────────────┘        JSON          └──────────────────┘        └──────────────┘
                                              │  │
                                              │  └────────────▶ JDoodle Compiler API (code execution, free tier)
                                              └───────────────▶ OpenAI API (AI hints)
```

- **Frontend**: React SPA (Vite) — auth pages, problem list/detail, code editor
  (textarea), submission result, AI hint button.
- **Backend**: Node.js + Express REST API — handles auth, problem CRUD, submission
  orchestration, AI hint proxying.
- **Database**: MongoDB (Atlas in production) — Users, Problems, Submissions collections.
- **Code Execution**: JDoodle Compiler API — a hosted, free-tier code execution
  service (20 credits/day, no card required) reached over HTTPS with a 15s request
  timeout so a slow/unreachable provider fails fast instead of hanging. Chosen after
  evaluating several alternatives (Judge0/RapidAPI, Piston, glot.io, self-hosted
  Judge0) that were either paywalled, restricted, discontinued, or incompatible
  with Docker Desktop on Windows.
- **AI Layer**: OpenAI Chat Completions API — generates a short conceptual hint per
  problem, called on-demand from the problem detail page.

## 3. Data Models

**User**: username, email, password (hashed), role (user/admin)

**Problem**: title, description, difficulty, constraints, testCases[{input, expectedOutput}], createdBy

**Submission**: user, problem, code, languageId, verdict, output, timestamps

## 4. Auth Flow
1. User registers/logs in → backend issues a JWT (7-day expiry).
2. JWT sent as `Authorization: Bearer <token>` on every protected request.
3. Middleware (`protect`) verifies the token; `adminOnly` middleware gates problem
   creation/edit/delete to admin-role users.

## 5. Submission Flow
1. User writes code in the editor and hits Submit.
2. Backend fetches the problem's hidden test cases.
3. For each test case, backend calls JDoodle with the source code + language +
   stdin, and waits for the synchronous result (15s timeout).
4. Backend compares JDoodle's output to the expected output; first mismatch
   determines the verdict (Wrong Answer vs Accepted). Compile/runtime errors surface
   as unmatched output rather than a distinct status, since JDoodle's execute
   endpoint doesn't separate them.
5. Submission (code, verdict, output) is stored and returned to the frontend.

## 6. Deployment
- **Frontend**: Vercel (static build from Vite).
- **Backend**: Render / Railway (Node service), env vars for Mongo URI, JWT secret,
  JDoodle client ID/secret, and OpenAI key.
- **Database**: MongoDB Atlas free tier.
- **Docker**: `docker-compose.yml` spins up Mongo + backend + frontend locally for
  development and can be adapted for container-based deployment (e.g. AWS ECS/EC2).

## 7. Future Work (v2)
- Real-time leaderboard and contest mode.
- Richer AI integration: full code review, complexity analysis, personalized problem
  recommendations.
- Custom domain + HTTPS via reverse proxy (Nginx/Caddy) to resolve mixed-content
  issues on deployment.
- Rate limiting and abuse protection on the submission endpoint.
