#!/bin/bash
# PostCompact hook (matcher: ""): 圧縮発生を marker file で記録する。
# PostCompact は additionalContext 出力をサポートしないため、
# context 注入は UserPromptSubmit 側 (userpromptsubmit-compaction-recovery.sh) で行う。
#
# 依存は node のみ(jq 非依存 — このマシンに jq は無い)。fail-open(常に exit 0)。

set -uo pipefail

node "${CLAUDE_PROJECT_DIR:-.}/tools/compaction-hooks.mjs" postcompact 2>/dev/null || true
exit 0
