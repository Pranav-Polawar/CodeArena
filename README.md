# CodeArena — Online Judge

A full-stack MERN online judge where users can solve algorithmic problems, run code inside isolated Docker containers, receive verdicts against hidden test cases, track submissions, and view AI-powered hints via Google Gemini.

---

## Admin Portal Access
- **Designated Administrator**: `pranavpolawar123@gmail.com`
- When you register or log in with `pranavpolawar123@gmail.com`, you are automatically granted the **Admin** role.
- Once logged in, the **"Add Problem"** button appears in the navigation bar.
- Non-admin users cannot see or access problem creation, and the backend rejects non-admin problem manipulation with `403 Forbidden`.

---

## Running Locally

### Option 1: Running with Docker (Recommended)
Docker runs the entire stack in isolated containers: MongoDB, Backend API with Docker socket access, and Frontend (Nginx).

```bash
# 1. Start the complete application
docker compose up --build

# 2. Access the application:
# Frontend: http://localhost:8080
# Backend API: http://localhost:5000/api
```

The backend container mounts `/var/run/docker.sock` to execute user submissions inside ephemeral sandbox containers:
- C++: `gcc:13`
- Java: `eclipse-temurin:17-jdk-alpine`
- Python: `python:3.11-alpine`
- JavaScript: `node:20-alpine`

---

### Option 2: Running Locally with Node.js

#### Step 1: Install Dependencies
```bash
# Install root dependencies (or in both backend/ and frontend/)
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

#### Step 2: Environment Configuration
Your `.env` file at the project root and `backend/.env` are already pre-filled:
- `MONGO_URI`: Your live MongoDB Atlas connection string
- `JWT_SECRET`: Secret key for authentication tokens
- `GEMINI_API_KEY`: Google Gemini API key for conceptual AI hints
- `ADMIN_EMAILS`: `pranavpolawar123@gmail.com`

#### Step 3: Start the Application
You can start both together or in separate terminals:

**Unified Fullstack Server:**
```bash
npm run dev
# Running at http://localhost:3000
```

**Or Separate Terminals:**
```bash
# Terminal 1 - Backend:
npm run backend
# Backend running at http://localhost:5000

# Terminal 2 - Frontend:
npm run frontend
# Frontend running at http://localhost:3000 (proxies /api to localhost:5000)
```

---

## Deployment Guide

### Deploying Frontend to Vercel
1. Import repository to **Vercel**.
2. Root directory: `frontend` (or root; `vercel.json` is configured).
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Add Environment Variable:
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://your-backend.onrender.com/api`)

### Deploying Backend to Render
1. Create a Web Service on **Render**.
2. Build Command: `npm install && npm run build`
3. Start Command: `node server.js`
4. Add Environment Variables:
   - `MONGO_URI`: `mongodb+srv://pranavpolawar123_db_user:dC6VlZtnbAM6baqJ@cluster0.arw02lf.mongodb.net/online-judge?retryWrites=true&w=majority`
   - `JWT_SECRET`: `oj_project_2026_random_secret_938472`
   - `GEMINI_API_KEY`: *(Your Google AI Studio Gemini API key)*
   - `ADMIN_EMAILS`: `pranavpolawar123@gmail.com`
   - `PORT`: `5000`
