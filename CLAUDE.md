# Repo rules

- The game is `UGNeekPeek.html` (markup only) + `css/style.css` + `js/*.js` (deployed on Netlify).
- Only open the file you need. JS files are classic scripts loaded in this order and share globals:
  - `js/core.js` — constants: ARTISTS, THEMES, STAGES/PTS, helpers (escapeHtml, fmtDate)
  - `js/prefs.js` — prefs/localStorage, settings toggles (TOGGLES), fonts
  - `js/data.js` — stats, Apple/iTunes fetching, artist track loading, mastery, lineup render, audio graph
  - `js/game.js` — difficulties, modifiers, rounds/scoring, menu music (MM), transitions, win/fail screens
  - `js/menu.js` — history, filter, dev stats (DEV), settings/modal wiring, game mode side panel
  - `js/share.js` — share links, shared-score view, song catalog
  - `js/fx.js` — menu video background, TV effects, click sounds, tilt/ripple, confetti
- Asset paths must be absolute (`/js/...`) because `/s/<id>` share links serve the same HTML.
- Serverless: `netlify/functions/share.mjs` (/api/share), `uid.mjs` (/api/uid); `netlify/edge-functions/share-embed.js` adds link previews.
- Always escape user/share data with `escapeHtml` before putting it in innerHTML.
- After every change: commit, push, and open a pull request into `main` without asking. If the branch's previous PR is already merged, open a new one.

## Version number — ALWAYS update it

**Every time you change anything, bump the version tag before committing.** No exceptions, even for one-line text tweaks.

- Where: the `<div class="ver">` near the top of `<body>` in `UGNeekPeek.html` (e.g. `v1.12.0`).
- Format `v1.MINOR.PATCH`:
  - **MINOR** = number of PRs already merged into `main` + 1 (the release in progress). Starting a new PR → raise MINOR, reset PATCH to 0.
  - **PATCH** = +1 for each follow-up change pushed to the same open PR.
- Check merged PRs with `git log --oneline origin/main | grep -c "Merge pull request"`.
