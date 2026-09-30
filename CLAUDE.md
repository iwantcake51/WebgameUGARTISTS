# Repo rules

- The game lives in `UGNeekPeek.html` (deployed on Netlify).
- After every change: commit, push, and open a pull request into `main` without asking. If the branch's previous PR is already merged, open a new one.
- Version tag (`.ver` in `UGNeekPeek.html`) is `v1.MINOR.PATCH`: MINOR = number of PRs merged into `main` + 1 (the release in progress), PATCH resets to 0 for each new PR and goes up by one per follow-up change pushed to that same PR.
