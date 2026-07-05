# HyperHelix — Claude Code Entry Point

このファイルはエントリポイントガイドです。ルール本体ではありません。
セッション開始時に以下の資材を順番に読み込んでください。

本リポジトリ(HH-011 を main へ統合済み)では Claude は**オーケストレータ**である:
S/P/D1-D3/D4-D7(カウンタ・コミット含む)を専管する。E + V1/V2 は task WO で実行エージェントへ
一括委任できる(HH-041)。委任契約: `assets/workflows/agent-roles.md`。

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
| 4 | `core/gates.yaml` | AI層 | ゲートパラメータ(検索上限・ノート初期値) |

**索引読み** — 索引だけを読み、関係する項目の本文へドリルダウン:

| ファイル | 読み方 |
|---|---|
| `amendments.md` | 冒頭の**索引表**を読む。当面のタスクに関係する HH の本文だけを開く(全文必読ではない) |
| `core/knowledge.yaml` | カウンタを確認。ノートは S2 でタグ検索(`gates.search.top_n` 件)で引く。全件通読は不要 |

**オンデマンド(必要時のみ)** — `assets/checklists/`・`assets/workflows/`・`assets/ai/anti-patterns.md`。
`core/dictionary.yaml` は HH-016 で deprecated(参照のみ。読み込み順から除外)。

## コマンド

- `/helix <タスク>` — タスクループでタスクを実行する
- `/cycle` — フレームワーク自己改善サイクルを実行する
- `/sync` — main とのフレームワーク改善を同期する（還元プッシュ / 差分取り込み）

## 必要時に参照

- `assets/checklists/` — フェーズ別チェックリスト
- `assets/templates/task-brief.md` — タスクブリーフのひな形(`tasks/` へコピー)
- `assets/workflows/exception-handling.md` — 例外処理 EX-1〜EX-5
- `assets/workflows/git-conventions.md` — Git 運用規約(1タスク=1コミット・履歴保護)
- `assets/workflows/concurrency.md` — 同一ブランチ並行セッションの運用プロトコル(HH-015)
- `assets/workflows/task-list-schema.md` — TODO/task-list 固有スキーマ
- `assets/workflows/theta-review.md` — θレビュー手順(HH-016: deprecated・履歴のみ)
- `assets/workflows/agent-roles.md` — エージェントロールと Work Order 契約(HH-011)
- `assets/workflows/review-only.md` — review-only 記録(HH-023: ゼロ成果物変更の確認・報告)
- `assets/workflows/consolidation.md` — 整理(統廃合)手順(HH-040: R8 レンズ + consolidation-report)
- `assets/ai/anti-patterns.md` — アンチパターン集
- `node tools/hyperhelix.mjs validate` — フレームワーク資材の整合検証(active scan・アンカー・brief/finish 含む)
- `node tools/hyperhelix.mjs consolidation-report` — R8(HH-040): 冗長/統廃合候補の測定(情報のみ)

ルール・公理・閾値の内容はすべて上記ファイルに記述されています。
本ファイルへのルール追記は禁止です。
