# Session Bootstrap — executable-structure verification

Run ONCE at session start, BEFORE the entrypoint.md reading order (HH-059 canon), whenever
HyperHelix is loaded. Goal: confirm the current working directory can actually
EXECUTE the framework's commands, and remediate if not.
Authority: constitution.md Environmental Constraint Axioms (ratified by HH-013).

These checks are MANUAL and run BEFORE `node tools/hyperhelix.mjs validate`. They are
NOT enforced by `validate`: the validator presupposes the tool and commands are already
reachable (it cannot run otherwise), so it cannot catch a bootstrap reachability failure.
Do not expect `validate` to flag an unreachable command; that is this checklist's job.

## 1. Locate the HyperHelix root
- The root holds `constitution.md`, `amendments.md`, `core/`, `assets/`, `tools/hyperhelix.mjs`.
- It may be the CWD itself, or nested inside a host project (e.g. `doc/HyperHelix/`).
- Record the resolved root; every material path below is relative to it.

## 2. Verify launch commands are reachable from the CWD
- The `/helix` and `/cycle` launch commands (skills at `.claude/commands/skills/helix.md` /
  `cycle.md`, or wherever the CLI resolves skills — host-project or user-level) must be
  invocable from the CWD.
- Their path references must resolve to the root found in step 1. When the root is
  NOT the CWD (nested), the command paths must be prefixed with that nested path
  (e.g. `doc/HyperHelix/constitution.md`), or the commands cannot run from the CWD.

## 3. Verify the validator runs
- `node <root>/tools/hyperhelix.mjs validate` must produce a report (Node present,
  paths resolve). If not, treat as a blocker.

## 3b. Verify framework hooks are wired (HH-055)
- Read `assets/workflows/compaction.md` for the platform-neutral lifecycle and quality contract.
- Claude: `.claude/settings.json` must register exactly one command for each of `PreCompact`,
  `PostCompact`, and `UserPromptSubmit`. The wrappers call shared runtime modes `precompact`,
  `postcompact`, and `prompt`; `prompt` serializes recovery before context warning.
- **Nested layout (HyperHelix inside a host project, e.g. `doc/HyperHelix/`)**: the settings that
  Claude Code actually loads are the ones under the **project root Claude Code was started in** —
  i.e. the HOST's `<host>/.claude/settings.json`, NOT `doc/HyperHelix/.claude/settings.json`
  (which `validate` checks and `/sync` propagates, but which is inert when the CWD is the host).
  Register the three events there with the nested path, Node only (no bash needed):
  `node "$CLAUDE_PROJECT_DIR/doc/HyperHelix/tools/compaction-hooks.mjs" precompact|postcompact|prompt`.
  The runtime resolves the framework root from its own script location, so state lands in
  `doc/HyperHelix/.claude/tmp/`. Because the host `.claude/` is normally gitignored, keep the
  snippet in a tracked host doc so a fresh clone can restore it. Symptom of a miss: no
  `[COMPACT-PREP]` warning even when the transcript is far past the threshold, and no
  `.claude/tmp/compact-state/<sid>.md` after an auto-compact
  (TASK-Project001-20260818-001 — hooks were unwired for weeks; N-Project001-20260818b). This is the
  hook counterpart of §2's nested command-path rule; check both at every bootstrap.
- Codex: `.codex/hooks.json` must register `PreCompact(manual|auto)`, `PostCompact(manual|auto)`,
  one `UserPromptSubmit`, and `SessionStart(compact|resume)`, all with POSIX and Windows commands.
  `.codex/config.toml` must enable hooks and select `.codex/compact-prompt.md`. Project hooks require
  user trust: inspect/approve them with Codex `/hooks`; never bypass that security review.
- Other hook-capable agents map equivalent lifecycle events to `tools/compaction-hooks.mjs`.
  Hook-incompatible agents use the explicit manual fallback in `assets/workflows/compaction.md`.
- PreCompact creates or refreshes the state skeleton and stamps how many semantic sections were
  still unfilled. Refresh preserves semantic sections while updating generated Git/counter fields
  and that stamp. HH-079: PreCompact reaches the human (top-level `systemMessage`) but never the
  summarizing model — `hookSpecificOutput` on this event is a schema violation that discards the
  whole output. The nine contract fields (objective, phase, TaskList, decisions, file ownership,
  validation, constraints, topology, Distill Inbox, next safe action) are carried by the state
  file's own headings and, on Codex only, by `.codex/compact-prompt.md`. Symptom of relying on the
  removed injection: a `compaction stamp:` line reporting unfilled sections after every compaction.
- PostCompact writes the version-2 marker; prompt recovery atomically snapshots the current
  transcript baseline before warning. Numeric version-1 marker/baseline remains read-compatible.
- Context warning gauge (TASK-Project001-20260823-037): the warning measures REAL occupancy from
  the transcript's last main-chain assistant `message.usage` (input + cache_creation +
  cache_read + output tokens) against the model's context window — the same yardstick as
  `/context`. Window resolution: `HH_CONTEXT_WINDOW_TOKENS` env override, else a model table
  (`claude-opus-5`/`claude-fable-5` → 1M), else 200k. It fires at `HH_CONTEXT_TOKEN_WARN_PCT`
  (default 80%), re-warns every `HH_CONTEXT_TOKEN_REWARN_PCT` (default 5%), and re-arms once
  occupancy drops back under the threshold. Transcripts carrying no usage lines fall back to
  the legacy byte gauge (`HH_CONTEXT_MAX_BYTES`/`HH_CONTEXT_WARN_PCT`/`HH_CONTEXT_REBASE_PCT`),
  whose fixed 1MB yardstick over-reads long sessions — that is why token mode is primary.
- **Dependency**: hooks は `node` のみに依存(jq 非依存 — jq は環境保証されない)。§3 の node 検証が前提。
- After a `/sync` from main these arrive as a framework material (sync heuristic includes
  `.claude/settings.json` and `.codex/**`, HH-055). If an adapter is absent/overwritten, automatic
  compaction does NOT fire; restore it from main and rerun `validate`.
- Missing wiring/trust degrades compaction recovery but not core loop execution. Report the degraded
  state explicitly and use the manual fallback until repaired.

## 3c. Verify the git pre-push hook is wired (unattended enforcement)

- `git config core.hooksPath` must print `tools/hooks`. If unset, run:
  `git config core.hooksPath tools/hooks` (also done by `bootstrap`).
- Unlike §3b Claude hooks, this one IS blocking by design (`tools/hooks/pre-push`): a failing
  `validate` blocks every push, and so does a failing `verify --base <merge-base origin/main HEAD>`
  — the SAME L1-L4 chain CI runs, moved ahead of the push (TASK-main-20260728-010). The
  framework-hunk reflux warning part stays non-blocking.
- **Limit — same checks, NOT the same environment** (TASK-main-20260821-004): the hook runs in
  YOUR clone (named branch, populated `node_modules`, one OS). CI runs a fresh `actions/checkout`
  (**detached HEAD**), installs from the lockfile, and runs on ubuntu AND windows. A green
  pre-push therefore does not promise a green CI whenever a check depends on branch state,
  install state, or OS. Tests that shell out to branch-dependent commands (`brief` claims a task
  id from the branch namespace and exits 1 on a detached HEAD) must skip explicitly rather than
  assume a branch exists.
- **Limit — CI also runs the e2e suite** (TASK-main-20261002-023): after L1-L4, CI runs
  `npm run test:e2e` (`test-e2e/`). L3 does not discover that directory, so neither `finish` nor
  this hook runs it; when to run it locally is `assets/checklists/evaluate.md` V1.

## 4. Verify repo boundaries
- If the root is a nested git repo inside a host repo, the host repo must not embed
  it by accident. Use `.gitignore` (or a submodule) for the nested root.
- Framework-material commits go to the HyperHelix repo; project artifacts to the host repo.

## Remediation (when a check fails)

- One-shot automation (TASK-20260707-002): `node tools/hyperhelix.mjs bootstrap --project <slug>`
  (run from the HyperHelix root) performs the step 2 launcher install, the step 4
  nested-repo gitignore, the project/<slug> branch switch/create, and `validate` in one pass.
  The itemized remediations below remain for partial/manual fixes.
- Missing/incorrect `.claude/commands/*`: create or fix them as THIN launchers whose
  paths point at the resolved root (`node tools/hyperhelix.mjs install-commands --to <hostdir>
  [--nest <relpath>]` automates this — verbatim copy or nested-root redirect). Do not inline
  rules (environment axiom).
- Root mislocated: record the correct root and adjust command paths accordingly.
- Node/validator unavailable: report as an EX-1 blocker before proceeding.
- Embedded-repo conflict: gitignore the nested root in the host repo (or submodule).

## Done
- Commands invocable from the CWD, validator runs, repo boundaries clean.
- Then proceed to the entrypoint.md reading order (HH-059 canon; CLAUDE.md / AGENTS.md are thin redirects).
