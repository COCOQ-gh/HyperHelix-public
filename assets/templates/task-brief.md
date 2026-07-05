# タスクブリーフ

<!-- HH:BRIEF_META version=1 -->
| 項目 | 内容 |
|------|------|
| タスクID | TASK-YYYYMMDD-NNN |
| 日付 | YYYY-MM-DD |
| プロジェクト / ジャンル | (例: hyperhelix / framework) |
| 深度モード | micro / light / standard / full / spike(理由: ) |
| 委任状態 | n/a / delegated (WO <task-id>/TL-NNN, YYYY-MM-DD) / awaiting-V+D |
| task_index | (D7 の bump 後の値。NOTE_ATTRIBUTION が 適用=✓ ノートの last_used 照合に使う。HH-053) |
<!-- /HH:BRIEF_META -->

---

## フェーズゲート確認

新規 / 既存・開始フェーズ・前提不足の有無を1行で記す（例: 「新規 / Search 開始 / 前提不足なし」）。
前フェーズへ戻る場合のみ、戻り先フェーズと判断理由を明記する（戻らないなら不要）。

---

## Search 成果物

### 要求定義(S1)

**何を作るか** / **なぜ作るか** / **成功条件**(観測可能に) / **スコープ外** を記入。

### 取得ノート(S2) — D7 の strength 更新判断の入力

| ノートID | 取得(SEARCH一致) | 適用(成果物で使用) | 適用先成果物 |
|--------|------|------|------|
| | ✓ | | |

> 適用 = 機械チェック(test / lint / run / validate)を持つ具体成果物への使用に限る。方針レベルは「取得のみ」。
> D7 で strength を動かせるのは最大1ノート。記入例は `assets/checklists/evaluate.md`(ノート帰属)を参照。

### 調査メモ(S2)

(記入)

### 対象資材サーベイ(S4 — 実装タスク; HH-037。非編集タスクは「S4 n/a」)

編集対象資材の現状を読み、P6 の anchor(対象ファイル + 一意の現行テキスト)を抽出して記す。Plan の change-list はこれを**合成するだけ**(再調査しない)。

### 不明点一覧(S3 — 該当時。なければ節ごと省略)

| # | 不明点 | 解決策 / 前提判断(理由) |
|---|--------|------------------|
| 1 | | |

---

## Plan 成果物

### 実行計画(P1・P2・P3・P6)

Task-list schema: `assets/workflows/task-list-schema.md`
完了条件(P3)は task-list の `acceptance_check` 列に記す(別表は作らない)。
**P6(機械的 change-list / HH-035)**: 各 Execute 単位を「対象ファイル + 正確な anchor(一意の旧テキスト)+ 新内容/変換」まで Plan で確定する(Execute は適用のみ・discovery しない)。実装タスクでは下表に change-list を記す。anchor 未解決の単位は実行可ではない(EX-5/spike へ)。

<!-- HH:TASK_LIST version=1 -->
| id | order | title | status | depends_on | acceptance_check | evidence |
|----|-------|-------|--------|------------|------------------|----------|
| TL-001 | 1 | | todo | none | | pending |
<!-- /HH:TASK_LIST -->

#### 機械的 change-list(P6 / HH-035 — 実装タスクは必須・非編集タスク(spike/review)は省略)

各 Execute 単位を「対象 + 一意 anchor + 変換」まで確定する(Execute は適用のみ)。スキーマ: `assets/workflows/task-list-schema.md` P6 節。

| unit | 対象ファイル | anchor(一意の旧テキスト / `new file`) | 新内容・変換 |
|------|------|------|------|
| TL-001 | | | |

### リスク一覧(P4 — 該当時)

| # | リスク | 対応策 |
|---|--------|--------|
| 1 | | |

### 検証計画(P5)

routing.yaml `by_change_type`: <type>。予定スキップのみ列挙(理由・残存リスク)。なければ「スキップなし」。

---

## Execute 成果物

### 実行ログ(E1〜E3)

| # | 実施内容 | 結果 | 適用ノートID | 備考 |
|---|----------|------|------|------|
| 1 | | | | |

> `clear-logs` 等のログ掃除を実施した場合、対象・件数/サイズ・削除/切詰め/skip・残した診断価値をここへ短く記録する。raw log や完全な cleanup summary は恒久資材にしない。

### 失敗事例ログ(EX-5 — 探索/失敗時のみ。なければ省略)

| # | 仮説 | 試行内容 | 期待結果 | 実際の結果 | 失敗理由 | 得られた知見 | 次の判断 |
|---|------|----------|----------|------------|----------|--------------|----------|
| 1 | | | | | | | |

### 手戻り/判断誤りゲート(E4 — standard+ 必須。手戻りなしも明記=スキップ不可)

検知トリガ: 手戻り / 前提誤り / 不要作業 / 同種判断誤りの反復(2回目以降)。検知時は継続前に根本原因を是正(資材を即時修正・キューしない)。

| 検知(なし/有) | 種別 | 根本原因(1行) | 即時修正先(checklist/AP/note) |
|---|---|---|---|
| なし | rework/premise/unnecessary/repeat | | |

### Codex 返却受取(task WO 使用時のみ — unit WO / 直接実行は上の実行ログで代替; HH-041)

| 項目 | 内容 |
|---|---|
| WO 番号 | WO TASK-YYYYMMDD-NNN/TASK |
| V1 結果 | pass / fail(失敗コマンドを列挙) |
| V2 結果 | pass __ 件 / fail __ 件 |
| E4 フラグ | なし / TL-NNN: `<issue>` |
| 返却時刻 | YYYY-MM-DD HH:MM |

---

## Evaluate 成果物

### 検証結果(V1・V2)

<!-- HH:EVALUATE version=1 -->
| # | 完了条件 / チェック | 結果(Pass/Fail/Skip) | 失敗時の戻り先 / スキップ理由と残存リスク |
|---|------|------|------|
| 1 | | | |
<!-- /HH:EVALUATE -->

### 失敗帰属(V1 失敗時のみ。なければ省略)

| 成果物 | 結果(P/F) | 適用ノートID(strength ±1 at D7) |
|--------|------|------|
| | | |

### 人間の1ビット(V3 — intent に疑義がある時のみ)

accept / reject:(理由)

---

## Distill 成果物

### 成功要因(D1)

| # | 成功した点 | 再利用可能か |
|---|-----------|------------|
| 1 | | はい / いいえ |

### 失敗要因(D2 — V2 に Fail がある時のみ。なければ省略)

| # | 問題点 | 根本原因 | 発生フェーズ | 資材不足の種類 |
|---|--------|---------|------------|------------|
| 1 | | | S/P/E/V/D | 手順/判断基準/知識/ツール/自動化 |

### プロセス失敗シグナル走査(D2b — 必須。none detected も明記=スキップ不可)

タスクの成功が過去のプロセス失敗を露呈していないか走査。検知時は framework process-backlog(`docs/process-backlog.md`。ホストプロジェクトのタスクはそのプロジェクトの TODO)に予防作業1行(何を/なぜ/source task)を追記。

| シグナル種別 | 検知(なし/有) | キュー先(何を/なぜ/source task) |
|---|---|---|
| false-blocker / unreferenced-pattern / search-miss | none detected | |

### 改善案(D3 — 該当時。優先度: 再発防止 > 再利用性 > 工数 > 実装コスト)

| 優先度 | 改善案 | 格納先(routing.yaml 準拠) | 状態 |
|--------|--------|---------|------|
| | | | 未実施 |

### 反映・スリム化・アンチパターン(D4〜D6)

- [ ] D4: 改善を routing.yaml の格納先へ反映(人間ゲート対象は amendments.md へ HH 提案)
- [ ] D4: `clear-logs` 等の cleanup report は task working record に留め、恒久化する場合は durable finding のみ既存ルートへ蒸留
- [ ] D5: AI層資材のスリム化を実施 or 不要判断(理由: )
- [ ] D6: anti-patterns.md 更新 or 失敗事例なし
- [ ] R6 メタ記録: main は `n/a (main: R6 STOPPED)`(HH-025)。project/variant は連続サイクル数 = ____ 回目(**数値必須** — 散文では不可。framework-review.md R6)

### カウンタ更新(D7)

<!-- HH:D7 version=1 -->
- [ ] カウンタ更新(意味規則の単一権威は core/knowledge.yaml ヘッダ): counters.task_index +1(`node tools/hyperhelix.mjs bump --task ID`)
- [ ] ノート1手(最大1): 新規ノート追加(id は counters.next_note_id → +1; `project:` = 現プロジェクト slug または `shared` を付与、HH-032)または既存ノートの strength ±1(`--use`/`--miss`、last_used 更新)。「変更なし」も可
- [ ] 重要・恒久の教訓は人手で constitution.md / amendments.md へ昇華(HH-016: 自動昇格なし)
- [ ] `node tools/hyperhelix.mjs validate` パス確認
- [ ] git コミット(`assets/workflows/git-conventions.md` 準拠)
<!-- /HH:D7 -->

---

## 記入例(非自明な完全例 — routing.yaml の原則)

> | 資材ID | 取得 | 適用 | 適用先成果物 |
> |--------|------|------|------|
> | N-008 | ✓ | ✓ | COMF350_会話.ERB |
> | N-002 | ✓ | ✓ | 全体方針 |
> | N-009 | ✓ | — | (取得のみ: スコープ判断参考) |
>
> 検証で COMF350_会話.ERB のテストが失敗した場合、strength -1 は
> N-008 と N-002 のみに付く(適用単位の失敗帰属。D7 で `--miss` 指定)。
