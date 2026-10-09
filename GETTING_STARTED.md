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

## 3. Understand the Loop

The core task loop is:

```text
Search -> Plan -> Execute -> Evaluate -> Distill
```

The detailed definition lives in `core/loop.yaml`. Checklists in `assets/checklists/` turn the loop into practical steps.

## 4. Try a Small Task

Use `/helix <task>` when the slash command is installed in your agent environment. If not, follow the reading order in `entrypoint.md`, then use the phase gate checklist:

```text
assets/checklists/phase-gate.md
```

Keep the first task small and reversible. The goal is to see the evidence flow, not to exercise every governance feature at once.

## 5. Public-Release Notes

This branch is the public clean line, regenerated from the internal development line with project names replaced by placeholders (`Project001`, `Project002`, ...). The adopted publication policy, verification record, and refresh log are tracked in `PUBLIC_RELEASE.md`.

Important current choices:

- License: MIT.
- Task briefs: `tasks/` holds the frozen index of pre-HH-081 work records plus one representative example; current work records live in commit bodies (`hh-record`).
- Knowledge notes: keep HyperHelix/shared notes and representative examples; compress project-specific notes into generic public examples/playbooks before broad publication.
- Pending governance items remain visible as Pending.
