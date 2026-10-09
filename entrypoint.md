# HyperHelix — Entry Point(正本・プラットフォーム中立)

このファイルはエントリポイントガイドです。ルール本体ではありません。
プロジェクト単位の**正本**であり、プラットフォーム md(`CLAUDE.md`・`AGENTS.md` 等)は
本ファイルへの薄いリダイレクトです(HH-059)。セッション開始時に以下を順番に実行してください。

## ロール判定(HH-059: 機能で決める — プラットフォーム名で決めない)

- **Work Order(WO 文書)を渡されて起動されたセッション** = **executor**:
  `assets/workflows/agent-roles.md` の WO 契約に従い、**scope に明記されたファイルのみ**を編集する。
  フレームワーク資材(constitution.md / amendments.md / entrypoint.md / core/ / assets/ / tasks/ /
  tools/)・カウンタ・task recordの編集は禁止(変更権限はオーケストレータ側にのみある)。
- **それ以外の主体セッション** = **orchestrator**:
  S/P/D1-D3/D4-D7(カウンタ・コミット含む)を専管する。E + V1/V2 は task WO で実行エージェントへ
  一括委任できる(HH-041/054)。委任契約: `assets/workflows/agent-roles.md`。

## 0. 起動前検証(HH-013)

読み込み順序に入る前に `assets/workflows/session-bootstrap.md` に従い、作業ディレクトリが
フレームワークのコマンドを実行可能か検証し、不能なら是正する(憲法・環境制約の公理)。

## 読み込み順序(HH-024: 索引で引く。全文必読は常時層のみ)

**常時必読(小・常に効くルール)** — 起動時に全文を読む:

| 順 | ファイル | 層 | 内容 |
|---|---|---|---|
| 1 | `constitution.md` | ユーザー層 | 最上位の憲法(intent の権威) |
| 2 | `core/loop.yaml` | AI層 | タスクループ(5フェーズ・深度モード・例外処理) |
| 3 | `core/routing.yaml` | AI層 | 情報ルーティングと検証ポリシー |
| 4 | `core/gates.yaml` | AI層 | ゲートパラメータ(検索上限・収束ラチェット・外部価値ゲート) |

**索引読み** — 索引だけを読み、関係する項目の本文へドリルダウン:

| ファイル | 読み方 |
|---|---|
| `amendments.md` | 冒頭の**索引表**を読む。当面のタスクに関係する HH の本文だけを開く(全文必読ではない) |
| `core/knowledge.yaml` | カウンタを確認。ノートは S2 で `node tools/hyperhelix.mjs notes --tags ...` で引く。全件通読は不要 |

**オンデマンド(必要時のみ)** — `assets/checklists/`・`assets/workflows/`・`assets/ai/anti-patterns.md`。
`core/dictionary.yaml` は HH-016 で deprecated(参照のみ。読み込み順から除外)。

## コマンド(orchestrator)

- `/helix <タスク>` — タスクループでタスクを実行する
- `/cycle` — フレームワーク自己改善サイクルを実行する
- `/sync` — main とのフレームワーク改善を同期する(ff取り込み / 検証済みPR還元)

## 必要時に参照

- `assets/checklists/` — フェーズ別チェックリスト
- 作業記録 — コミット本文の `hh-record` ブロックが正本(HH-081)。`brief` で ID を claim し `finish --message` でコミット。形式は `assets/workflows/git-conventions.md`「Commit-body record」
- `tasks/INDEX.md` — HH-081 以前の作業記録の凍結済み目録(`git show <hash>:<path>` で復元)
- `assets/workflows/exception-handling.md` — 例外処理 EX-1〜EX-5
- `assets/workflows/git-conventions.md` — Git 運用規約(1タスク=1コミット・履歴保護)
- `assets/workflows/branch-protection-runbook.md` — HH-070 private/free運用・任意branch protection・緊急復旧
- `assets/workflows/concurrency.md` — 並行セッション/並行タスクの運用プロトコル(HH-015/058)
- `assets/workflows/task-list-schema.md` — TODO/task-list 固有スキーマ
- `assets/workflows/agent-roles.md` — エージェントロールと Work Order 契約(HH-011)
- `assets/workflows/review-only.md` — review-only 記録(HH-023)
- `assets/workflows/consolidation.md` — 整理(統廃合)手順(HH-040)
- `assets/workflows/compaction.md` — 全エージェント共通の圧縮・復旧・Distill Inbox 契約(HH-055/062)
- `assets/ai/anti-patterns.md` — アンチパターン集
- `node tools/hyperhelix.mjs validate` — フレームワーク資材の整合検証
- `node tools/hyperhelix.mjs verify --base <ref>`(push 前・CI)/ `finish --message` の preflight — L1構造・L2契約・L3挙動・L4証跡の総合判定
- `node tools/hyperhelix.mjs contract-doc --check` — `core/contracts.json` と生成済み契約リファレンスの同期検査
- `node tools/hyperhelix.mjs consolidation-report [--full]` — R8(HH-040): bounded既定/全候補fullの測定(情報のみ)

ルール・公理・閾値の内容はすべて上記ファイルに記述されています。
本ファイルへのルール追記は禁止です。
