# Contributing

Thanks for helping improve HyperHelix. This repository treats process materials as code: changes should be scoped, reviewable, and mechanically checked.

## Before You Start

1. Read `AGENTS.md` or `CLAUDE.md` for the agent entry point.
2. For normal work, use `/helix <task>`.
3. For framework review, use `/cycle`.
4. For branch synchronization, use `/sync`.

## Change Rules

- Keep each task focused and independently reviewable.
- Do not commit raw credentials or private local configuration.
- Do not force-push, rebase, amend, or rewrite history unless the maintainer explicitly asks for it.
- Do not change `constitution.md`, `amendments.md`, `core/`, `assets/`, `tasks/`, or `tools/` casually; those files are framework materials and have their own governance path.
- If you add a command, validation guard, schema field, or approved governance entry, also wire its consumers in the same change.

## Validation

Run this before opening a pull request:

```powershell
node tools\hyperhelix.mjs validate
```

If a check is skipped, state the reason, the residual risk, and any fallback check performed.

## Pull Request Checklist

- The change has a clear purpose and scope.
- Framework material changes have followed the relevant HyperHelix loop/gate.
- `node tools/hyperhelix.mjs validate` has been run.
- No raw credentials are present in the diff.
- Public-facing docs are updated when behavior or commands change.

## License Status

HyperHelix is licensed under the MIT License. See `LICENSE`.
