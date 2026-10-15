# What was changed

1. Added missing `backend/Dockerfile`, `frontend/Dockerfile`, `.dockerignore` files.
2. `docker-compose.yml`: removed obsolete `version`, removed env lines that blanked out values from `backend/.env`, frontend API URL is now a build arg.
3. `backend/utils/dockerRunner.js` rewritten:
   - code is copied into the sandbox with `docker cp` (bind mounts fail when the backend itself runs in Docker or on Windows)
   - compile time is no longer counted against the time limit (fixes `spawnSync g++ ETIMEDOUT`)
   - async instead of `spawnSync`, no more frozen server
   - Docker availability is re-checked instead of cached as "false" forever
   - runner images are pulled at startup; CPU/pids limits raised so g++ and javac can run
   - local fallback (only if STRICT_DOCKER is not "true") works on Windows (`.exe`, `python`)
4. Output comparison ignores CRLF vs LF.
5. Root `server.js` had duplicate `path`/`fs` declarations (crashed on start) - fixed.
6. Removed the hardcoded MongoDB Atlas credentials from source code. MONGO_URI must now come from `.env`.
7. Gemini model name is configurable with `GEMINI_MODEL` (default `gemini-2.5-flash`).

# Run

    docker compose up -d --build
    docker compose logs -f backend

Open http://localhost:8080
