# Session Bootstrap — executable-structure verification

Run ONCE at session start, BEFORE the AGENTS.md / CLAUDE.md reading order, whenever
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
- `.claude/settings.json` should register the compaction-recovery hooks: `PostCompact`
  and `UserPromptSubmit` → `.claude/commands/hooks/*.sh` (fail-open marker/inject pair).
- After a `/sync` from main these arrive as a framework material (sync heuristic includes
  `.claude/settings.json`, HH-055). If absent (project branch not yet synced, or the file
  was overwritten), the hooks do NOT fire — re-pull settings.json's hooks block from main.
- Non-blocking: missing hooks degrade compaction recovery, not core loop execution.

## 4. Verify repo boundaries
- If the root is a nested git repo inside a host repo, the host repo must not embed
  it by accident. Use `.gitignore` (or a submodule) for the nested root.
- Framework-material commits go to the HyperHelix repo; project artifacts to the host repo.

## Remediation (when a check fails)
- Missing/incorrect `.claude/commands/*`: create or fix them as THIN launchers whose
  paths point at the resolved root (`node tools/hyperhelix.mjs install-commands --to <hostdir>
  [--nest <relpath>]` automates this — verbatim copy or nested-root redirect). Do not inline
  rules (environment axiom).
- Root mislocated: record the correct root and adjust command paths accordingly.
- Node/validator unavailable: report as an EX-1 blocker before proceeding.
- Embedded-repo conflict: gitignore the nested root in the host repo (or submodule).

## Done
- Commands invocable from the CWD, validator runs, repo boundaries clean.
- Then proceed to the AGENTS.md / CLAUDE.md reading order.
