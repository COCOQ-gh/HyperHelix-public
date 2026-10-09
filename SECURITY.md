# Security Policy

HyperHelix treats prompt/process materials as executable governance assets. Please report security issues carefully and avoid posting secrets, exploit details, or private credentials in public issues.

## Supported Versions

Security fixes target the default development line and the public clean line (`public/**`). Public tags are cut from the clean line; the current one is recorded in `PUBLIC_RELEASE.md`.

## Reporting a Vulnerability

If GitHub private vulnerability reporting is available, use it. Otherwise, open a minimal public issue that describes the affected area without sensitive details, and request a private coordination channel from the maintainer.

Do not include raw API keys, access tokens, passwords, private keys, service-role keys, or full connection strings in reports, logs, screenshots, commits, or chat.

## Project Security Rules

- Raw secrets must not be committed.
- Placeholder values such as `<your-api-key>` and environment variable names such as `SUPABASE_KEY` are acceptable.
- Run `node tools/hyperhelix.mjs validate` before claiming framework integrity.
- Scan staged diffs for secret-shaped literals before committing.
- Treat auto-run hooks and shell command construction as security-sensitive.

## Disclosure Expectations

The project is experimental and governance is intentionally explicit about honor-based limits. Reports that show where a claimed guard is only advisory, spoofable, or incomplete are welcome.

