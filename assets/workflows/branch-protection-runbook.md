# main governance / optional branch-protection runbook (HH-060 / HH-069 / HH-070)

Purpose: operate the repository safely on private/free hosting without making branch
protection a framework prerequisite. HH-070 accepts that the default boundary is
tool+human honor-based. Branch protection remains optional hardening; AI agents MUST
NOT enable, disable, or bypass it. The user is the only external-setting authority.

## Default private/free operating procedure

Repository-side Phase 2 is implemented by `TASK-main-20260718-017`:

- `sync`: fetch/ff-only intake → validate → `hyperhelix/sync-*` push → PR.
- `reflux --apply`: framework-only classification → `origin/main`-based staging branch →
  cherry-pick → validate → `hyperhelix/reflux-*` push → PR.
- A PR touching `.github/**`, `constitution.md`, `amendments.md`, `core/gates.yaml`, or `governance/**`
  waits for CI checks, then stops for human manual merge. Other PRs wait for
  checks and may self-merge.
- Neither path pushes directly to `refs/heads/main`, force-pushes, rebases, or uses
  `gh pr merge --admin`.
- Governance PRs may be published by the same identity as `@COCOQ-gh` (HH-069/070).
  The tool still checks `gh` readiness before push, but it does not require publisher
  separation and never auto-merges a governance PR.
- No branch-protection setting is required. Consequently GitHub does not reject a manual
  direct-main push, checks-before-merge violation, force-push, deletion, or bypass. The
  prohibitions remain binding HyperHelix operating rules, not server-enforced controls.

For each outbound sync/reflux:

1. Authenticate `gh`, confirm `gh api user --jq .login` returns the intended publisher,
   then confirm a clean working tree and `sync --dry-run` output. `COCOQ-gh` is allowed.
2. Run `sync`; record its PR URL and remote `hyperhelix/sync-*` branch.
3. Confirm both checks complete successfully: `verify (ubuntu-latest)` and
   `verify (windows-latest)`.
4. For a governance-path PR, confirm the tool waited for checks and did not self-merge.
   The user inspects the diff/checks and manually merges with the **merge commit** method.
   Do not submit or require an Approve review merely to simulate independent approval.
5. Fetch and fast-forward local `main`, then run `node tools/hyperhelix.mjs validate`.
6. Record the PR URL, check results, human inspector/merger when applicable, merge result,
   and local/remote HEADs in the owning task or sync report.

## Honor-based rules and incident recovery

- Use `sync`/`reflux --apply`; do not push `refs/heads/main` directly.
- Never use force-push, rebase merge, branch deletion, `--admin`, or `--no-verify`.
- Do not merge before CI checks succeed. Re-check the PR head and checks immediately before
  a governance manual merge because no up-to-date server rule protects the interval.
- Treat an accidental direct push or premature merge as an incident: stop automation,
  capture refs/PR/check evidence, and repair with a normal commit or `git revert`. Do not
  rewrite history to hide the event. Run `validate` and both CI checks on the repair.

## Optional future hardening (user only)

If the hosting plan later exposes branch protection, the user may opt in without reopening
GOV-01. Recommended values are:

- Require a pull request before merging: **on**.
- Required approving reviews: **0**; Require review from Code Owners: **off**.
- Require status checks before merging: **on** with `verify (ubuntu-latest)` and
  `verify (windows-latest)`; require the branch to be up to date.
- Allow merge commits: **on**. Force pushes and branch deletion: **off**.
- Do not allow bypassing the settings. The tools never use `--admin`.

After any optional change, the user records before/after values and reads the saved settings
back from the UI or API. Failure to enable optional protection does not make the framework
invalid and does not reopen GOV-01. To roll back optional protection, restore the recorded
previous values; AI may inspect and report but must not perform the change.
