# CLAUDE.md — Hoofquake

Hoofquake is an open-world 3D animal sandbox: `index.html` plus plain scripts in `js/` (Three.js `0.149.0` and PeerJS `1.5.5` from jsDelivr, with copies in `vendor/` as fallback), procedural art, no build step. Player docs and a code map are in [`README.md`](README.md). Live at https://zanetitusgallagher-jesus.github.io/vector-game/hoofquake/.

## Ground rules (the repo is shared)

- Only create, change or delete files inside `hoofquake/`. Never touch the repo root or another game's folder.
- Never force-push, rebase, amend pushed commits, or rewrite history on `main` or `gh-pages`.
- Start every session with `git pull origin main`.
- Original IP only.

## Testing

- `npx http-server hoofquake -p 8080` from the repo root (peer-to-peer online play), or `cd hoofquake/server && npm install && npm start` (WebSocket server online play).
- `?broker=host:port` points peer-to-peer play at a local PeerJS broker for tests.
- Automation hooks: everything hangs off `window.H` (`H.players`, `H.Net`, `H.missions`, …).

## Publishing (both branches)

The site is served from `gh-pages`. Commit `hoofquake/` on `main` and push, then `git checkout gh-pages && git pull origin gh-pages && git checkout main -- hoofquake && git commit && git push origin gh-pages`.
