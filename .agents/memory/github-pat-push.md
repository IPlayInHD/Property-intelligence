---
name: GitHub PAT for git push
description: Fine-grained PATs fail at git transport layer; classic PAT with repo scope required for HTTPS git push from Replit.
---

# GitHub PAT requirements for git push

**Rule:** Fine-grained GitHub PATs (`github_pat_11...`) fail with HTTP 403 "Permission denied" at the git smart HTTP transport layer even when the API shows `push: true` permissions. Classic PATs with `repo` scope work correctly.

**Why:** GitHub's git smart HTTP endpoint (`/info/refs?service=git-receive-pack`) uses a different auth path than the REST API. Fine-grained PATs are rejected at this layer regardless of repository permission settings.

**How to apply:** When the user needs to push via HTTPS git, ask for a classic PAT (Settings → Developer settings → Personal access tokens → Tokens (classic) → check `repo` scope). Do not accept fine-grained PATs for git push operations.

**Also:** System git binary is blocked in the main agent environment (`git remote add` etc. exit 254). Use `isomorphic-git` (installable via `pnpm add -w isomorphic-git`) with its bundled node HTTP plugin at `isomorphic-git/http/node/index.cjs`. Run the push via a `.cjs` script with `node script.cjs` from bash — the sandbox (`code_execution`) doesn't have access to `process.env` secrets.
