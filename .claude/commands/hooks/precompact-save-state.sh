#!/bin/bash
# PreCompact hook (matcher: "" = auto+manual): 圧縮の直前に state file を自動保存する。
#
# 共通 Node runtime の precompact mode を呼び、10見出し skeleton(HH-062 Distill Inbox 含む)+
# 機械的フィールド(branch/HEAD/status/counters)を .claude/tmp/compact-state/<sid>.md
# (プロジェクト直下・git 無視 — TASK-20260716-008)へ書く。既存 state は意味的セクションを
# 保持したまま機械フィールドだけ refresh し、圧縮器へ品質契約を additionalContext 注入する。
# これにより:
#   - manual /compact: モデルが compact-prep を実行済みならそれが残り、未実行でも機械 state が残る
#   - auto-compact(上限自動圧縮): モデルの介在なしでも必ず機械 state が残る
# 意味的セクション(判断・決定)はモデルにしか書けない — その事前保存指示は共有 prompt mode、
# 圧縮サマリー品質は assets/workflows/compaction.md と compact prompt が担う。
#
# 依存は node のみ(jq 非依存)。fail-open(常に exit 0)。

set -uo pipefail

node "${CLAUDE_PROJECT_DIR:-.}/tools/compaction-hooks.mjs" precompact 2>/dev/null || true
exit 0
