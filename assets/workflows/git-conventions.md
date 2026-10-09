# Git Conventions

Cross-phase operational rules for the framework repository (routed here per
core/routing.yaml "multi-step procedure"). Referenced from the distill
checklist Exit, the task-record D7 fields, and the entry points.
Codifies the practice established in TASK-20260611-001 .. TASK-20260612-002.

## Repository

- Branch model (HH-011, B plan 2026-06-16; HH-025 2026-06-19): `main` is the
  **framework-development** branch — HH-NNN commits, /cycle results, /sync outputs,
  AND user-directed direct framework improvement (/helix editing framework
  materials). No project task records or project-specific counters belong on main.
  Because framework work IS main's purpose, R6 anti-self-purpose is STOPPED on main
  (framework-review.md R6); it stays ACTIVE on project/variant.
  `project/<name>` and `variant/<name>` branches run project tasks; they derive
  from main and receive framework improvements via /sync.
  Counter lineages diverge by branch; /sync reconciles knowledge.yaml at sync
  time (concurrency.md §3). See the /sync skill (.claude/commands/skills/sync.md) for the procedure.
- Cross-branch framework propagation: use `/sync` (the authorized mechanism;
  no per-sync HH ratification needed). Any other cross-branch merge still
  requires an HH ratification on the receiving branch first.
- Same-branch parallel sessions (multiple orchestrators on one branch at once):
  follow assets/workflows/concurrency.md (HH-015) — claim non-contiguous task IDs,
  update counters by commutative delta (sum/max/append), stage only your own files.
- No remote is assumed. If one exists, push only on human instruction. EXCEPTION
  (HH-034/060/069/070): running `sync` or `reflux --apply` IS the standing instruction
  to push a validated `hyperhelix/sync-*` or `hyperhelix/reflux-*` branch, create a PR, and
  self-merge a non-governance PR after CI checks. The tools never push directly to
  `origin/main`; governed paths wait for CI checks, then stop for human manual merge
  and never use admin bypass. HH-069/070 allow the same publisher as the CODEOWNER and do
  not require a CODEOWNER approval; the human merge decision is honor-based. HH-070 makes
  branch protection optional, so these prohibitions are not GitHub-enforced on private/free.
  All OTHER pushes stay human-gated. PR-branch pushes are
  additionally enforced by the tracked pre-push hook (`tools/hooks/pre-push` via
  `core.hooksPath`): `validate` AND `verify --base <merge-base>` (the CI-equivalent L1-L4 chain,
  incl. the L4 evidence gate) are hard blocks; framework hunks missing from `origin/main`
  produce a warning (session-bootstrap §3c).
- Everything in the repo is tracked, including `tasks/` briefs. Agent session
  runtime state lives inside the repo under `.claude/tmp/` but is gitignored
  and never committed (TASK-20260716-008; formerly it lived outside the repo).
- Line endings are pinned by `.gitattributes` (`* text=auto eol=lf`).

## Framework knowledge reflux (two-track)

Framework changes come in two kinds, with different homes — do NOT collapse them:

- **Deliberate engineering** (structural edits, tooling, HH design): make these on `main`
  directly (or a short branch off main). No reflux needed.
- **Emergent project knowledge** (learning notes N-XXX, anti-patterns, D2/D2b process
  lessons, discovered framework gaps → HH proposals): these are BORN during real project
  work on `project/*`. They **MUST reflux to main** — this is the knowledge spiral's primary
  feedback from real use. Discarding it leaves only self-referential framework improvement
  (the R7d failure mode). Empirically, main's knowledge.yaml notes N-023.. came from project
  reflux.

Reflux path: `project branch (local) → origin/main-based hyperhelix/reflux-* branch
(cherry-pick framework-only commits) → pull request → main`. Isolated PR-branch staging is
REQUIRED because reflux must FILTER to framework-only (project code never refluxes) without
placing unmerged commits on local main. Keep
emergent-knowledge changes in framework-only, atomic commits so the cherry-pick is clean.

Automate with `node tools/hyperhelix.mjs reflux` (classifies framework-only vs project
commits; `--apply` stages on an origin/main-based branch, validates, and opens a PR). A cherry-pick
counter conflict is AUTO-RESOLVED for counter-ONLY drift (`resolveKnowledgeCounterConflict`, high-water max, HH-057); only note drift alongside it refuses and hands off to the `/sync` conflict guide. Authority: `sync-conflict-guide.md` + the tracked test `mergeCounterHighWater: counter-only conflicts merge by max; note drift refuses`. (Corrected 2026-08-30 /cycle ordinal 15 — this line previously read "hands off to the `/sync` conflict guide (semantic counter reconcile is manual)", which is the AP-015 shape: a live procedure document carrying a limiting claim that had been superseded by HH-057, silently routing every reader to a manual path the tool no longer needs.)
The pre-push hook also fires on the PR-branch push (no `--no-verify` anywhere).

## Commit unit and timing

- **Default path: `node tools/hyperhelix.mjs finish --task <id> --sid <claim-token> --commit --message "…"`.** `finish` is the
  enforcing entry point for a framework-repository commit: it runs `verify --staged` (L1-L4) → secret scan →
  `bump` (idempotent) → post-bump verify + secret scan → pathspec `git add` / `git commit -F -`, aborting
  fail-closed at the first failure and BEFORE anything irreversible. Pass `--path a,b` for Distill materials
  (anti-patterns.md / process-backlog.md) touched by this task; `finish` warns when it sees them unstaged.
  **`--sid <claim-token>` is REQUIRED whenever the task was claimed by a `brief` that printed a `claim token:`
  line** (AP-016 mechanical guard, 2026-08-24): the token proves this session owns the record, and finish fails
  closed on a missing or mismatched one BEFORE any irreversible step. Keep the token from the claim; a record
  with no claim sidecar (pre-guard, or another tree) only warns. Authority: concurrency.md §2.
  The manual sequence below is the FALLBACK — use it when `finish` does not apply (host-project repository,
  non-task SYNC commit, or a `finish` failure you are working around, recorded as a skip).
  **A non-ASCII workdir path is NO LONGER a blocker** (RT-20 fixed by TASK-Project001-20260821-017; re-measured
  2026-08-24 in `H:\ERA\Project001(改)\doc\HyperHelix`: `finish` runs L1-L4 PASS / 182 tests / secret clean).
  Do not reach for the fallback on that basis — every hand-run commit skips the enforced chain, which is the
  `class:enforcement-gap` root itself. If `finish` DOES fail, record the actual failure as a skip
  (routing.yaml `skip_policy`); do not assume an environmental cause.
  **On Windows, run `finish` from a shell where `sh` is on PATH (Git Bash)** — measured 2026-08-24: L3 runs
  `node --test`, and `test/pre-push-gate.test.mjs` spawns `sh`, so from PowerShell it fails
  `spawnSync sh ENOENT` while the SAME tree passes 182/182 from Git Bash. That is a failing CHECK, not a
  failing change (evaluate.md V2 class (a)) — re-run in the right shell instead of switching to the fallback.
  Git Bash converts a leading-`/` argument into a Windows path (`--review-source /cycle` →
  `C:/Program Files/Git/cycle`); prefix the command with `MSYS_NO_PATHCONV=1` when an argument must start
  with `/`.
- One completed task = one commit. Commit AFTER D7 passes
  (`node tools/hyperhelix.mjs validate`) and BEFORE the task summary.
  A task is not done until it is committed.
- Never commit while `node tools/hyperhelix.mjs validate` reports errors.
- The working tree must be clean after the task commit; leftover untracked
  files are committed or removed, with the reason logged in the brief.
- Every commit belongs to a task (loop axiom 1: all changes pass the loop).
  No drive-by fixes outside a task. Founding/baseline commits (HH-000 class)
  are the only non-task commits.
- Intra-task checkpoint commits are an exception, not a habit: allowed for a
  long Execute at a verified unit boundary, with the reason in the execution log.

## SYNC- commits (non-task; framework propagation only)

The `/sync` command generates SYNC- commits when propagating framework
improvements between the current branch and `origin/main` (the remote hub).
These are the ONLY commits exempt from the "every commit belongs to a task" rule:

- Header format: `SYNC-YYYYMMDD: <一行要約>`
- Contents: cherry-picked framework commits + knowledge.yaml counter reconciliation
- Never contains project-specific file changes
- Run `validate` before committing; state the result in the commit body
- No task brief required; record the sync summary in the commit body instead
- `/sync` publishes the reduction through a PR. HH-034/060/069/070: a PR-branch push via
  `node tools/hyperhelix.mjs sync` (or `reflux --apply`) is AUTOMATIC — gated by a passing
  `validate` and followed by CI checks (see Repository above). The tool-internal
  `validate` remains the primary gate; the pre-push hook is the unattended backstop that
  enforces the same check even outside the tools. Governance paths wait for human manual
  merge without requiring CODEOWNER approval; all OTHER pushes stay human-gated.

### Post-merge cross-reference audit (xref-prevention L3)

After a CONFLICT-resolving reconcile merge or a `/sync` B-intake that required manual
resolution, run — in addition to `validate` (which includes the L1 guards
`TOOL_DOC_CONSISTENCY` / `CHECK_DOC_CONSISTENCY` / `NOTE_FIELD_SCHEMA`) — one
cross-reference adversarial audit (Codex). A cross-lineage merge drifts one side's
declarations and consumers apart: the 2026-06-22 reconcile `7950318` rolled back HH-035/036
and stranded the HH-032 free-tag wording, surfacing 10 xref gaps. `validate` catches the
mechanical subset; the audit catches the semantic remainder before it propagates.

## Message format (operating language: Japanese)

```
TASK-<encoded-branch-slug>-YYYYMMDD-NNN: <一行要約>

- <変更点を箇条書き(ファイル/領域ごと)>
- <人間ゲート適用時は HH-NNN を引用>

検証: <validate / テスト等の実結果>

<エージェント共著フッタ(実行エージェント自身の規約に従う)>
```

- Header <= 72 chars where practical. Non-task commits use a short
  descriptive header instead of a TASK id.
- The verification line states what was actually run — never claim unrun
  checks (core/routing.yaml `never_claim_unrun_checks_passed`).

### Commit-body record (HH-081 — the ONLY task record)

The task record lives in the commit body (design: `docs/hh-081-design-spike.md`). Claim with
`node tools/hyperhelix.mjs brief --date <today>` (the framework repo may use `--task GH-<n>` = its GitHub
Issue number), keep the printed claim token, and commit through
`finish --task <id> --sid <token> --message "<message with the block>"` — without `--commit` it is a dry run.
No `tasks/` file is written; the block IS the record (L4 evidence; D7 = the counters diff of the same commit).
The commit carries exactly one fenced block between the bullets and the footer:

````
```hh-record
schema: 1
task_id: TASK-main-20261002-009
depth_mode: standard            # a core/loop.yaml depth mode (micro | light | standard | full | spike)
contract_impact: [...]          # required when THIS commit touches framework paths
framework_check: [...]          # required when THIS commit touches framework paths
evaluate: [{criterion: ..., result: Pass}]
notes: {retrieved: [], applied: []}   # every applied id must be passed to finish --use/--miss
note_adds: [N-...]              # optional — each id must exist in the ledgers at HEAD
phase_evidence: {search: [], plan: [], execute: [], evaluate: [], distill: []}   # optional
```
````

- Validated fail-closed by `finish --message` (before any irreversible step: schema, `task_id` = `--task`,
  evidence rows, note attribution, declared note adds) and by `verify --base` (pre-push and CI; each commit
  against its OWN changed paths). Authority: `tools/lib/commit-record.mjs`.
- `verify --base` fails when a framework path is changed by a commit without a block. Transition: a commit
  authored before 2026-11-01 that carries a retired `tasks/` record counts as recorded (hosts sync on their own
  schedule; `LEGACY_RECORD_CUTOVER` in commit-record.mjs — delete the rule after the window).
- Rework reported in `phase_evidence` without a durable material in the same commit (note add, anti-pattern,
  process-backlog, amendment) prints a `DISTILL_CAPTURE` warning (HH-043).
- Pre-HH-081 records are frozen history: `tasks/INDEX.md` maps each id to a hash (`git show <hash>:<path>`).
  `reflux` never carries `tasks/`.

### micro depth (HH-047)

A micro-depth task (core/loop.yaml `depth_modes.micro`) uses the same hh-record with `depth_mode: micro`;
its `minimum_outputs` (objective / change / validation / D7) fit in the commit subject, bullets and the
block's `evaluate` rows. Still claim with `brief`, still bump through `finish`. If a micro task surfaces a
durable lesson or rework, ESCALATE to standard — the misclassification path (loop.yaml micro.note).

## Secret scan (security gate — constitution security axiom / HH-019)

Before staging/committing, scan the diff for raw credentials. This gate is
NOT skippable (routing.yaml `validation.secret_scan.not_skippable`). Commit only
env-var names (e.g. `SUPABASE_KEY`) and placeholders (e.g. `<your-api-key>`) —
never raw API keys, tokens, service-role keys, passwords, signing keys, or
connection strings.

Runnable heuristic (first line of defense, not exhaustive):

```sh
git diff --cached -U0 | grep -E '^\+' | grep -nEi \
  'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{36}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(api[_-]?key|secret|token|password|passwd|service_role|client_secret)[":= ]+[A-Za-z0-9/_+.-]{16,}'
```

- No output = clean. Any hit is a HARD BLOCK: redact, move the value to an
  environment variable / Secrets, and re-scan. If the secret was ever committed
  or pushed, ROTATE it — `git revert` / history rewrite does not invalidate a
  leaked credential.
- Variable-name references and placeholders are expected to pass. The value-shape
  branches (`eyJ…` JWT incl. Supabase service-role keys, `AKIA…`, `sk-…`, PEM
  blocks) catch real literals even when the variable name is generic.

## Shell construction discipline (injection gate — HH-051; extends the HH-019 security axiom)

When passing VARIABLE or FILE-DERIVED content (commit messages, briefs, notes,
amendments bodies) into a shell command, the content must NOT be interpreted as shell.

- **Use a QUOTED heredoc** `<<'EOF' … EOF` (single-quoted delimiter) so the body is
  LITERAL — `$(…)`, backticks, and `$VAR` are NOT expanded. This is the default for
  `git commit -m "$(cat <<'EOF' … EOF)"`.
- **Never** interpolate untrusted content inline (`-m "…$VAR…"`) or via an EXPANDING
  heredoc `<<EOF` (unquoted). A single backtick / `$(…)` in the content would execute.
- **Untrusted content** (project `reflux`, external / other-contributor origin) MUST go
  via `-F <file>` or stdin — never inline in the command string.
- This is honor-based discipline (no validate guard; static detection of helper scripts
  is unreliable) — the failure mode is AP-008. Keep it a habit, not a check.

## History protection (the history is part of the audit trail)

- `main` history backs the governance strand (amendments + task records):
  no force-push, no rebase, no amend of existing commits.
- **HH-060/069/070 current flow**: `/sync` and `reflux` use a PR flow; direct-main pushes,
  force-pushes, rebase merges, and `--admin` bypass are outside the tool contract.
  Governance-file PRs wait for CI checks and human manual merge without CODEOWNER Approve;
  other PRs may self-merge after CI checks. Branch protection is optional hardening under
  HH-070. Without it, the prohibitions above are tool+human honor-based rules rather than
  server-side rejection; see `assets/workflows/branch-protection-runbook.md`.
- Undo with `git revert` (a new commit, processed as a task or EX-3 triage),
  never with `git reset --hard` on committed history.
- A commit that deletes a tracked framework material requires the
  corresponding HH ratification first (constitution: hard delete is
  human-gated). Archival (state: archived) is the normal path, not file deletion.
- **Task archive (HH-031 Phase 2) — frozen by HH-081**: `tasks/INDEX.md` lists every pre-HH-081 task
  record with the hash that restores it (`git show <hash>:<path>`). No task files are produced any more,
  so there is nothing left to archive; never `git rm` history ad hoc.

## Quick reference

| When | Command |
|---|---|
| Inspect before commit | `git status --short && git diff --stat` |
| Staged whitespace gate | After explicit staging; the PASS CRITERION is defined below (count of real hits = 0) — `git diff --cached --check` only LOCATES a hit, its output length is never the gate; plain `git diff --check` does not inspect untracked files. **When the stage contains CP932 game files (`.erb` / `.csv`), do NOT run the bare form**: `--check` prints the offending diff BODY, so the gate itself dumps mojibake into the transcript and violates AP-013 (the host's guard hook blocks it outright). Inspect a hit by path, never by dumping content. Measured twice: TASK-Project001-20260821-014 (survived) and 2026-08-26 /cycle ordinal 10 (hook refused the command). **PASS CRITERION = the CR-stripped trailing-whitespace count of ADDED lines is 0**: `git diff --cached -U0 \| grep '^+' \| tr -d '\r' \| grep -cE '[[:space:]]+$'`. **Use the POSIX class `[[:space:]]`, never `[ \t]`** — inside an ERE bracket expression `\t` is the two characters backslash and `t`, NOT a tab, so `[ \t]+$` silently matches every line ending in `t` or a backslash. Measured 2026-08-26 (/cycle ordinal 11): the broken form reported 2 hits on a stage whose real count was 0, and `printf 'abct\n' \| grep -cE '[ \t]+$'` returns 1. It over-matches, so a 0 from the broken form is still trustworthy; a NONZERO from it proves nothing. **Never gate on the LENGTH of `git diff --cached --check` output.** In a repository with `core.autocrlf=true` storing CRLF files, `--check` reports every CR as trailing whitespace, so that length is nonzero on EVERY commit — measured 2026-08-26 on Project001: `ba74425` 127 lines / `f636b77` 91 / `328beb8` 18 / this cycle's own commits 58 and 8, all CR artifacts with 0 real hits. **A gate that is always red is not a gate**; it trains the operator to wave it through, which is worse than having no gate. Use `--check` output only to locate WHICH path a real hit is in. |
| Hook install / check | `git config core.hooksPath` → must be `tools/hooks`; set with `git config core.hooksPath tools/hooks` |
| Secret scan (NOT skippable) | `git diff --cached -U0 \| grep -E '^\+' \| grep -nEi 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\|AKIA[0-9A-Z]{16}\|sk-[A-Za-z0-9]{20,}\|(api[_-]?key\|secret\|token\|password\|service_role)[":= ]+[A-Za-z0-9/_+.-]{16,}'` — any hit blocks the commit |
| Task-end commit (framework repo) | **`node tools/hyperhelix.mjs finish --task <id> --sid <claim-token> [--path a,b] --commit --message "…"`** — verify(L1-L4) → secret scan → bump → re-verify → pathspec commit, fail-closed before any irreversible step. `--sid` is the claim token `brief` printed (AP-016 ownership gate; omit only when the record has no claim sidecar). This is the default; the row below is the fallback. |
| Task-end commit (fallback / host repo) | Stage explicit paths, then commit **with the same pathspec** (HH-058): `git add <paths> && git commit -m <per format> -- <paths>`. A bare `git commit` sweeps in other sessions' staged files (shared index); the pathspec form commits only yours. NEVER `git add -A` under parallel sessions (concurrency.md §4). |
| Undo a committed mistake | `git revert <hash>` (logged as a task / EX-3) |
