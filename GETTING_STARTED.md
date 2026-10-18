# Getting Started

This guide is for readers who want to try HyperHelix without first reading every framework file.

## 1. Read the Entry Point

Start with `entrypoint.md`, the platform-neutral entry point. `AGENTS.md` and `CLAUDE.md` are thin redirects to it: they point agents to the authoritative materials instead of duplicating rules.

## 2. Run the Validator

HyperHelix uses a local Node.js validator (Node.js 20 or newer). The only runtime dependencies are `yaml` and `ajv`, pinned by the lockfile.

```powershell
npm ci
node tools\hyperhelix.mjs validate
```

To run the regression and end-to-end suites as CI does:

```powershell
npm run test:all
```

Expected result for a clean framework state is `0 error(s)`. Warnings should be read and reported rather than ignored.

Optionally enable the tracked pre-push gate once per clone, so `validate` and `verify --base` run before every push:

```powershell
git config core.hooksPath tools/hooks
```

## 3. Understand the Loop

The core task loop is:

```text
Search -> Plan -> Execute -> Evaluate -> Distill
```

The detailed definition lives in `core/loop.yaml`. Checklists in `assets/checklists/` turn the loop into practical steps.

## 4. Try a Small Task

Use `/helix <task>` when the slash command is installed in your agent environment. The launchers live in `.claude/commands/skills/`, so some Claude Code versions list them with a namespace (`/skills:helix`); it is the same command. If no launcher is available, follow the reading order in `entrypoint.md`, then use the phase gate checklist:

```text
assets/checklists/phase-gate.md
```

Keep the first task small and reversible. The goal is to see the evidence flow, not to exercise every governance feature at once.

A task leaves no separate brief file. `node tools/hyperhelix.mjs brief --date YYYYMMDD` claims a task id and prints an `hh-record` skeleton; fill it as the phases progress, then commit through `node tools/hyperhelix.mjs finish --task <id> --message "..." --commit`, which verifies, scans for secrets, updates counters, and commits in one fail-closed step. The format is in `assets/workflows/git-conventions.md` ("Commit-body record").

## 5. Apply It to Your Own Project

HyperHelix is meant to be nested inside a host project (default `doc/HyperHelix/`), with only thin launchers and compaction hooks on the host side. The shortest path needs no reading and no skill install: open your project in Claude Code and paste the one line at the top of [INSTALL.md](INSTALL.md). The agent clones this repository, runs `bootstrap`, wires the host hooks, verifies the layout, and reports. If you do this often, the same steps are packaged as the `/hh-apply` skill in `dist/skills/hh-apply/` (copy it to `~/.claude/skills/hh-apply/`). Either way your `project/<slug>` branch stays local; nothing proposes pushing to this repository.

## 6. Public-Release Notes

This branch is the public clean line, regenerated from the internal development line with project names replaced by placeholders (`Project001`, `Project002`, ...). The adopted publication policy, verification record, and refresh log are tracked in `PUBLIC_RELEASE.md`.

Important current choices:

- License: MIT.
- Task briefs: `tasks/` holds the frozen index of pre-HH-081 work records plus one representative example; current work records live in commit bodies (`hh-record`).
- Knowledge notes: keep HyperHelix/shared notes and representative examples; compress project-specific notes into generic public examples/playbooks before broad publication.
- Pending governance items remain visible as Pending.
