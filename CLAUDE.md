# HyperHelix — Claude Code Guide(リダイレクト専用)

**正本は `entrypoint.md`** — セッション開始時にまず `entrypoint.md` を読み、その指示
(ロール判定 → 起動前検証 → 読み込み順序)に従ってください(HH-059)。

このファイルはプラットフォームガイドです。ルール本体ではありません。
エントリ内容(読み込み順序・コマンド・参照)は正本にのみ記述されます。

## Claude Code 固有注記

- スラッシュコマンド(`/helix`・`/cycle`・`/sync` 等)は `.claude/commands/skills/` に定義。
- フック(compaction 復旧・context 警告)は `.claude/settings.json` に登録(HH-055)。

本ファイルへのルール追記は禁止です。
