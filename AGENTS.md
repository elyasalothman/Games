# AGENTS.md

## Cursor Cloud specific instructions

This repo is a single Node.js + Express server (`server.js`) that serves a static
Arabic games portal (`index.html`, `style.css`, `script.js`, `*-game.js`) plus a
SQLite leaderboard/cloud-save API and a Socket.io Uno multiplayer backend
(`uno-server.js`).

### Running the app
- Start the server with `npm start` (i.e. `node server.js`). It listens on
  `http://localhost:3000` (override with `PORT`).
- There is no build step and no separate frontend dev server — the browser loads
  the static files directly from Express.
- There are no `lint` or `test` scripts defined in `package.json`; `start` is the
  only script.

### Environment notes (non-obvious)
- `node_modules` is committed to the repo, and it includes the native `sqlite3`
  binary (`node_modules/sqlite3/build/Release/node_sqlite3.node`). The VM runs
  Node 22 while `package.json` pins `engines.node: 18.x`; running `npm install`
  rebuilds/refreshes the native binding for the installed Node so `sqlite3` loads
  correctly. Because `node_modules` is tracked, `npm install` produces expected
  git churn under `node_modules/` — do NOT stage those changes in feature PRs.
- `leaderboard.db` (SQLite) is committed and is written to at runtime (leaderboard
  scores + cloud saves). Playing a game or hitting the API mutates it; do NOT
  commit these runtime changes.
- The server does graceful shutdown on SIGINT/SIGTERM (closes the DB). Restart it
  after code changes — there is no hot reload.

### Quick smoke test
- `curl http://localhost:3000/api/health` → `{"status":"success",...}`
- `curl -X POST http://localhost:3000/api/leaderboard -H 'Content-Type: application/json' -d '{"game_id":"math","player_name":"Test","score":42}'`
  then `curl http://localhost:3000/api/leaderboard/math`.
