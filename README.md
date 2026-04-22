# DevTrace - Git Activity Tracker by Username

A lightweight TypeScript web app that scans local and/or remote repositories for commits matching an author name, username, or email fragment.

## Stack

- Frontend: Vite + vanilla TypeScript + semantic HTML + CSS3
- Backend: Node.js + Express + TypeScript
- No MongoDB, no auth system, no unnecessary backend layers

## Features

- Search by author name, username, or email fragment
- Scan local repositories under a root path (recursive git repo discovery)
- Scan remote repositories via token-authenticated API (GitHub/GitLab)
- Include private remote repositories when token permits access
- Provider mode: local only, remote only, both
- Date filters: all time, today, specific date, date range
- Summary styles: short, professional, detailed, standup-style
- Grouped output by repository with commit counts and raw commits
- Overall summary + per-repository summaries with copy buttons
- Safe token handling in memory only (never persisted)
- LocalStorage for non-sensitive preferences only

## Project Structure

```text
DevTrace-Git-Activity-Tracker/
+-- client/
¦   +-- src/
¦   ¦   +-- types/
¦   ¦   ¦   +-- index.ts
¦   ¦   +-- utils/
¦   ¦   ¦   +-- format.ts
¦   ¦   ¦   +-- storage.ts
¦   ¦   ¦   +-- summary.ts
¦   ¦   +-- main.ts
¦   ¦   +-- styles.css
¦   +-- index.html
¦   +-- tsconfig.json
¦   +-- package.json
+-- server/
¦   +-- src/
¦   ¦   +-- routes/
¦   ¦   ¦   +-- activity.route.ts
¦   ¦   +-- utils/
¦   ¦   ¦   +-- date.ts
¦   ¦   ¦   +-- git.ts
¦   ¦   ¦   +-- github.ts
¦   ¦   ¦   +-- gitlab.ts
¦   ¦   ¦   +-- normalize.ts
¦   ¦   ¦   +-- repoScanner.ts
¦   ¦   +-- app.ts
¦   ¦   +-- server.ts
¦   ¦   +-- types.ts
¦   +-- tsconfig.json
¦   +-- package.json
+-- README.md
```

## Run

### 1) Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2) Start backend

```bash
cd server
npm run dev
```

Backend default URL: `http://localhost:4000`

### 3) Start frontend

```bash
cd client
npm run dev
```

Frontend default URL: `http://localhost:5173`

## Optional client API URL override

Set `VITE_API_BASE_URL` if backend runs on a different host/port.

Example:

```bash
VITE_API_BASE_URL=http://localhost:4000
```