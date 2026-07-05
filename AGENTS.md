# HyperHelix — Agent Entry Point

このファイルはエントリポイントガイドです。ルール本体ではありません。

本リポジトリ(HH-011 を main へ統合済み)では、このファイルは**実行エージェント**(Codex 等)の入口である:
作業は `assets/workflows/agent-roles.md` の Work Order 契約に従い、**scope に明記されたファイルのみ**を編集する。
フレームワーク資材(constitution.md / amendments.md / core/ / assets/ / tasks/ / tools/)・カウンタ・ブリーフの
編集は禁止(変更権限はオーケストレータ=CLAUDE.md 側にのみある)。
以下の資材はコンテキストとして参照してよい。

## 0. 起動前検証(HH-013)

読み込み順序に入る前に `assets/workflows/session-bootstrap.md` に従い、作業ディレクトリが
フレームワークのコマンドを実行可能か検証し、不能なら是正する(憲法・環境制約の公理)。

## 読み込み順序(HH-024: 索引で引く。全文必読は常時層のみ)

**常時必読** — 起動時に全文を読む: `constitution.md` / `core/loop.yaml` / `core/routing.yaml` / `core/gates.yaml`。

**索引読み** — `amendments.md` は冒頭の**索引表**を読み、関係する HH の本文だけ開く(全文必読ではない)。
`core/knowledge.yaml` はカウンタ確認 + ノートを S2 でタグ検索(`gates.search.top_n` 件)。全件通読は不要。

**オンデマンド** — `assets/checklists/`・`assets/workflows/`・`assets/ai/anti-patterns.md`。
`core/dictionary.yaml` は HH-016 で deprecated(読み込み順から除外)。

## 必要時に参照

- `assets/checklists/` — フェーズ別チェックリスト
- `assets/templates/task-brief.md` — タスクブリーフのひな形(`tasks/` へコピー)
- `assets/workflows/exception-handling.md` — 例外処理 EX-1〜EX-5
- `assets/workflows/git-conventions.md` — Git 運用規約(1タスク=1コミット・履歴保護)
- `assets/workflows/concurrency.md` — 同一ブランチ並行セッションの運用プロトコル(HH-015)
- `assets/workflows/task-list-schema.md` — TODO/task-list 固有スキーマ
- `assets/workflows/theta-review.md` — θレビュー手順(HH-016: deprecated・履歴のみ)
- `assets/workflows/agent-roles.md` — エージェントロールと Work Order 契約(HH-011)
- `assets/ai/anti-patterns.md` — アンチパターン集
- `node tools/hyperhelix.mjs validate` — フレームワーク資材の整合検証

ルール・公理・閾値の内容はすべて上記ファイルに記述されています。
本ファイルへのルール追記は禁止です。
