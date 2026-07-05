# タスクブリーフ(micro)

<!-- HH:BRIEF_META version=1 -->
| 項目 | 内容 |
|------|------|
| タスクID | TASK-YYYYMMDD-NNN |
| 日付 | YYYY-MM-DD |
| プロジェクト / ジャンル | (例: hyperhelix / framework) |
| 深度モード | micro(理由: <固定語彙の該当語>) |
| 委任状態 | n/a |
<!-- /HH:BRIEF_META -->

> micro 深度(HH-022): loop.yaml の固定語彙(typo-fix / link-fix / heading-number-fix /
> obvious-removed-term-replacement / readme-1-2-line)に該当する trivial 修正のみ。
> 禁止: any-logic-change / any-gate-or-axiom-touch / security-sensitive / 構造・ゲート・憲法変更。
> フェーズは削らない — S/P/E/V/D の精神を下の4項で1行ずつ充足する。逸脱したら standard に昇格。

**目的(objective)**: (何を・なぜ。固定語彙の該当語を1つ記す)

**変更(change)**: (触ったファイルと内容。1〜数行)

**検証(validation)**: (`node tools/hyperhelix.mjs validate` 結果 / 秘密スキャン / 該当チェックの実結果)

---

### カウンタ更新(D7)

<!-- HH:D7 version=1 -->
- [ ] counters.task_index +1(`bump --task ID` / 冪等)
- [ ] ノート1手(最大1)または「変更なし」
- [ ] `node tools/hyperhelix.mjs validate` パス確認
- [ ] git コミット(`finish` 推奨)
<!-- /HH:D7 -->
