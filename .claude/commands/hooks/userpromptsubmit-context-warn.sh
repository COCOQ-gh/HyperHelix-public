#!/bin/bash
# Compatibility wrapper (not registered in settings): transcript のファイルサイズから context 使用率を概算し、
# 閾値超で「compact-prep → 以後は auto-compact 任せ(手動 /compact は任意)」を additionalContext で促す。
#
# サイズ基準(ユーザー指定): HH_CONTEXT_MAX_BYTES(既定 1048576 = 1MiB)を 100% とみなす。
# 閾値 HH_CONTEXT_WARN_PCT(既定 60)。
#
# delta-baseline: transcript の .jsonl は追記専用で /compact しても縮まないため、
# 絶対サイズは圧縮直後も高いまま = 警告が嘘をつく。PostCompact の marker を recovery hook
# から受け取り、共有 prompt mode 内の warn phase が current サイズを baseline として原子的に記録するので、それがあれば
# 「現在サイズ − baseline」= 圧縮後の増分で占有率を測る。baseline 無し(初回充填)は絶対サイズ。
#
# lazy baseline (TASK-20260708-005 A): baseline 無し・cooldown 無しで絶対% が
# HH_CONTEXT_REBASE_PCT(既定 150)以上 = 圧縮履歴が信頼できない(フック導入前に圧縮した
# セッション / 途中有効化)。偽警告を出さず baseline=現サイズ を書いて無音リセットし、
# 以後は増分で測る(自己回復)。フック常時稼働のセッションは 60% で cooldown が書かれる
# ため 150% に cooldown 無しで到達することはなく、誤リセットしない。
#
# 再警告 (TASK-20260708-005 B): cooldown marker (.claude/tmp/compact-warned/$SESSION_ID) には
# 前回警告時の増分バイトを記録する。増分がさらに step(= MAX*WARN_PCT/100)進むごとに
# 再警告する(無視して作業を続けた場合の再通知)。marker は圧縮時に compaction-recovery.sh
# がリセット。runtime state は v2 JSON、旧 numeric 形式は1世代だけ読取互換。
#
# 依存は node のみ(jq 非依存 — session-bootstrap §3 が node を保証)。fail-open(常に exit 0)。

set -uo pipefail

node "${CLAUDE_PROJECT_DIR:-.}/tools/compaction-hooks.mjs" warn 2>/dev/null || true
exit 0
