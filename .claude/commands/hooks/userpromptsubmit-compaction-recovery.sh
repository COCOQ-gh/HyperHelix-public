#!/bin/bash
# UserPromptSubmit hook: 共有 prompt mode が PostCompact recovery → context warning を
# 同一プロセス内で直列実行する。matching hook を並列起動する platform でも marker 消費と
# baseline 保存が競合しない。復旧指示は one-shot。
#
# overhead: marker 確認 + transcript stat 1 回/ターン。閾値未満なら出力なし。
# 依存は node のみ(jq 非依存 — このマシンに jq は無い)。fail-open(常に exit 0)。

set -uo pipefail

node "${CLAUDE_PROJECT_DIR:-.}/tools/compaction-hooks.mjs" prompt 2>/dev/null || true
exit 0
