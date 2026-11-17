---
name: compact-prep
description: |
  Claude Code の /compact 実行前に、現セッションの作業状態を一時 state file へ保存する。
  MANDATORY TRIGGERS: /compact-prep, compact-prep, 圧縮準備, compact 準備, コンパクト準備, 圧縮前状態保存。
  DO NOT TRIGGER: compact 後の復旧、通常の進捗報告、plan 作成、context 使用率の雑談。
strict_procedure: true
argument-hint: "[復旧メモ]"
allowed-tools: Read Edit Bash(node tools/hyperhelix.mjs compact-prep *)
---

# compact-prep

Claude Code の `/compact` 前に、圧縮サマリーへ残りにくい作業状態を
`.claude/tmp/compact-state/${SESSION_ID}.md`(プロジェクト直下・git 無視)へ保存する。

## Strict procedure profile

- Strictness: strict-procedure。圧縮前 state file の内容と保存完了報告が成果そのもの。
- Hard gates: session_id が確定できない場合は state file を推測名で作らず、取得不能として停止する
  (`compact-prep` サブコマンドも --sid 無しでは生成を拒否する)。
- Completion receipt: state file パス、保存した主要項目、未確認項目、圧縮の扱い(auto-compact 任せで可・手動 `/compact` は任意)を報告する。

## 手順

1. session_id を確定する。sanctioned 法(いずれか):
   - 自セッションの scratchpad ディレクトリパス末尾の UUID(システムプロンプト記載)。
   - `.claude/tmp/compact-warned/` 等の hook marker ファイル名と照合して裏付ける。
   - 確定できなければ state file を作らず、準備未完了と報告する(Hard gate)。
2. `node tools/hyperhelix.mjs compact-prep --sid <session_id> --refresh` を実行する。
   10見出しの skeleton + 機械的フィールド(branch/HEAD/git status/counters)が生成される。
   `--refresh` は既存 state の意味的セクションを保持し、生成時刻と機械的フィールドだけ更新する。
   手動の `--refresh` なし呼出しは従来通り既存 state を上書きしない。
3. skeleton の `<!-- FILL -->` を Edit で埋める(意味的セクションのみ):
   Active Plan / Current Phase / TaskList Summary / Session Decisions / Distill Inbox /
   Constraints and Blockers / Worker Topology / Recovery Notes。
   判断・ユーザー選択・不採用案の理由・ブロッカー・圧縮後の自分への復旧メモを含める。
   **Distill Inbox(HH-062)**: 未蒸留の知見候補を箇条書きで退避する。ここでは台帳
   (knowledge.yaml)に**書かない** — 次の正規 D フェーズで蒸留するか明示的に破棄する。
   候補が無ければ「なし」と記す。
4. state file を読み直し、10見出しがすべて存在し FILL マーカーが残っていないことを確認する。
5. ユーザーに Completion receipt を報告し「準備完了。以後の圧縮は auto-compact に任せてよい(即時圧縮したい場合のみ `/compact` — フック/AI からは起動不能のため任意のユーザー操作)」と伝える(TASK-main-20260718-010: 手動 /compact の催促は廃止)。
