# CLAUDE.md — Scentline × Hoofquake

One game: Scentline is the base (world, engine, controls, online play), with Hoofquake's animals, vehicles, Bleatsburg city, rubber ducks and missions merged into it. Everything lives in `index.html`. Three.js r128 comes from cdnjs, with a copy in `vendor/` as the fallback. Online play is peer-to-peer (trystero over public relays), so there's no server. Player docs are in [`README.md`](README.md). Live at https://zanetitusgallagher-jesus.github.io/vector-game/hoofquake/.

## Ground rules (the repo is shared)

- Only create, change or delete files inside `hoofquake/`. Never touch the repo root or another game's folder.
- Never force-push, rebase, amend pushed commits, or rewrite history on `main` or `gh-pages`.
- Start every session with `git pull origin main`.
- Original IP only.

## Testing

- `npx http-server hoofquake -p 8080` from the repo root, then "Play as guest".
- The Hoofquake additions are the last `<script>` block in `index.html` (search for `HOOFQUAKE, MERGED INTO SCENTLINE`). They extend Scentline's globals (`ANIMALS`, `BODY`, `VD`, `CITIES`, `ROAD`, `TABS`, `MENU`) and wrap `buildAnimal`, `actSpecial`, `buildRegions`, `spawnWorldLife` and `simulate`. The state is in `HQ`, and the missions are in `HQM`.

## Publishing (both branches)

The site is served from `gh-pages`. Commit `hoofquake/` on `main` and push, then `git checkout gh-pages && git pull origin gh-pages && git checkout main -- hoofquake && git commit && git push origin gh-pages`.
