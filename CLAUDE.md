# Repo rules

- The game lives in `UGNeekPeek.html` (deployed on Netlify).
- After every change: commit, push, and open a pull request into `main` without asking. If the branch's previous PR is already merged, open a new one.

## Version number — ALWAYS update it

**Every time you change anything, bump the version tag before committing.** No exceptions, even for one-line text tweaks.

- Where: the `<div class="ver">` near the top of `<body>` in `UGNeekPeek.html` (e.g. `v1.12.0`).
- Format `v1.MINOR.PATCH`:
  - **MINOR** = number of PRs already merged into `main` + 1 (the release in progress). Starting a new PR → raise MINOR, reset PATCH to 0.
  - **PATCH** = +1 for each follow-up change pushed to the same open PR.
- Check merged PRs with `git log --oneline origin/main | grep -c "Merge pull request"`.
