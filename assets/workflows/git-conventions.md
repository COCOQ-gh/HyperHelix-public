# Git Conventions

Cross-phase operational rules for the framework repository (routed here per
core/routing.yaml "multi-step procedure"). Referenced from the distill
checklist Exit, the task-brief D7 section, and the entry points.
Codifies the practice established in TASK-20260611-001 .. TASK-20260612-002.

## Repository

- Branch model (HH-011, B plan 2026-06-16; HH-025 2026-06-19): `main` is the
  **framework-development** branch — HH-NNN commits, /cycle results, /sync outputs,
  AND user-directed direct framework improvement (/helix editing framework
  materials). No project task briefs or project-specific counters belong on main.
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
  (HH-034): `node tools/hyperhelix.mjs sync` MAY push to origin/main automatically —
  running the sync tool IS the standing instruction; the push is gated by a passing
  `validate` + fast-forward-only safety (the tool STOPS on divergence / conflict /
  validate error and never force-pushes). All OTHER pushes stay human-gated.
- Everything in the repo is tracked, including `tasks/` briefs. Agent session
  memory lives OUTSIDE the repo and is never committed.
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

Reflux path: `project branch (local) → local main (cherry-pick framework-only commits) →
origin/main (push)`. The local-main staging is REQUIRED because reflux must FILTER to
framework-only (project code never refluxes); filtering needs a local cherry-pick. Keep
emergent-knowledge changes in framework-only, atomic commits so the cherry-pick is clean.

Automate with `node tools/hyperhelix.mjs reflux` (classifies framework-only vs project
commits; `--apply` stages onto main, validates, and pushes via the HH-034 path). A cherry-pick
counter conflict hands off to the `/sync` conflict guide (semantic counter reconcile is manual).

## Commit unit and timing

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
- `/sync` pushes the reduction to `origin main`. HH-034: a push via
  `node tools/hyperhelix.mjs sync` (or `reflux`) is AUTOMATIC — gated by a passing
  `validate` + fast-forward-only safety (see Repository / HH-034 above). All OTHER
  pushes stay human-gated.

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
TASK-YYYYMMDD-NNN: <一行要約>

- <変更点を箇条書き(ファイル/領域ごと)>
- <人間ゲート適用時は HH-NNN を引用>

検証: <validate / テスト等の実結果>

<エージェント共著フッタ(実行エージェント自身の規約に従う)>
```

- Header <= 72 chars where practical. Non-task commits use a short
  descriptive header instead of a TASK id.
- The verification line states what was actually run — never claim unrun
  checks (core/routing.yaml `never_claim_unrun_checks_passed`).

### micro commit body (HH-047 — no separate brief file)

A micro-depth task (core/loop.yaml `depth_modes.micro`) records its
`minimum_outputs` IN THE COMMIT BODY instead of a `tasks/` brief file. The
commit IS the task record (routing.yaml "task working record"). Format:

```
TASK-YYYYMMDD-NNN: <一行要約>

深度: micro(固定語彙: <typo-fix|link-fix|heading-number-fix|obvious-removed-term-replacement|readme-1-2-line>)
目的: <objective — 何を・なぜ>
変更: <change — 触ったファイルと内容>
検証: <validation — validate 結果 / 秘密スキャン>
D7: task_index +1(bump 済) / ノート変更 <なし|N-NNN> / validate 0 error

<エージェント共著フッタ>
```

- Still bump `task_index` and run `validate` (D7 is not skipped — only the
  brief FILE is). standard+ depth ALWAYS creates a `tasks/` brief file.
- `DISTILL_CAPTURE` and `archive-briefs` operate on brief FILES; a briefless
  micro is simply out of their scope. This is safe because micro forbids
  `any-logic-change` / `security-sensitive` (loop.yaml micro.forbidden_when),
  so the failure-capture cases those guards protect cannot arise in micro.
  If a micro task ever surfaces a durable lesson or rework, ESCALATE to standard
  (create a brief file) — that is the misclassification path (loop.yaml micro.note).

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

- `main` history backs the governance strand (amendments + briefs):
  no force-push, no rebase, no amend of existing commits.
- Undo with `git revert` (a new commit, processed as a task or EX-3 triage),
  never with `git reset --hard` on committed history.
- A commit that deletes a tracked framework material requires the
  corresponding HH ratification first (constitution: hard delete is
  human-gated). Archival (state: archived) is the normal path, not file deletion.
- **Brief archival mode (HH-031 Phase 2, ratified)**: old task briefs MAY be pruned
  from the working tree — kept in git history — ONLY via
  `node tools/hyperhelix.mjs archive-briefs [--keep N]` (default keeps newest 30 live).
  It archives only committed, working-tree-clean briefs (HH-015 concurrency safe),
  records each in `tasks/INDEX.md` (year-sharded: task-id|date|title|genre|hash|summary),
  and `git rm`s them. This is the HH-ratified, audited deletion path — `git rm` of briefs
  ad-hoc or inside /cycle is NOT allowed. Restore: `git show <hash>:tasks/<task-id>.md`.
  `validate` checks live↔archived collision and hash integrity (ARCHIVE_INDEX).

## Quick reference

| When | Command |
|---|---|
| Inspect before commit | `git status --short && git diff --stat` |
| Secret scan (NOT skippable) | `git diff --cached -U0 \| grep -E '^\+' \| grep -nEi 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\|AKIA[0-9A-Z]{16}\|sk-[A-Za-z0-9]{20,}\|(api[_-]?key\|secret\|token\|password\|service_role)[":= ]+[A-Za-z0-9/_+.-]{16,}'` — any hit blocks the commit |
| Task-end commit (validate passed) | Stage explicit paths, then commit: `git add tasks/TASK-…-NNN.md core/knowledge.yaml <touched files> && git commit -m <per format>`. NEVER `git add -A` under parallel sessions (concurrency.md §4). |
| Undo a committed mistake | `git revert <hash>` (logged as a task / EX-3) |
