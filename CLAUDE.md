# Swirly Potato Game Center

## Ship process

Every change that ships to `master` (Railway deploys from it — see DEPLOY.md) must
bump the app version, so the hub's version badge shows what's live. Do this in every
PR without being asked:

1. Run `scripts/bump-version.sh` as the last commit of the PR and commit `version.json`
   (scheme `YYYY.MM.DD.NN`; the counter resets daily).
2. If `master` moved and `version.json` conflicts, merge `master` in and re-run
   `scripts/bump-version.sh` — don't hand-edit the version.
3. CI's `version-bump` job fails any PR whose `version.json` isn't newer than the
   base branch's. Check locally with `scripts/check-version-bump.sh origin/master`.

Separately, bump `CACHE` in `sw.js` when the offline app shell (the `SHELL` list or
cached images/fonts) changes, so old caches purge. `/version.json` is never cached.
