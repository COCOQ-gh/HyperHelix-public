# Framework Process Backlog

HyperHelix フレームワークの繰延作業(deferred prevention-work / 未決事項)の**単一の生きた追跡先**。
運用言語(日本語可)。レイヤー公理3: docs は運用言語。

- **D2b**(`assets/checklists/distill.md`)のプロセス失敗シグナルで queue する予防作業1行はここへ追記する。
- **E4**(`assets/checklists/execute.md`)は「即時修正・queue するな」が原則。E4 で即時修正できず正当に繰延する分のみここへ。
- 設計上の未決(旧 `docs/設計書.md` §4 U-backlog の生存分)もここで追跡する。

形式: `- [優先度 high/med/low/ref] [class:<根本原因>] 内容 / なぜ / source(task or HH)`。着手したら行を消すかタスクIDを付す。
`class:` は framework-review **R8d**(跨タスク創発)が集計する根本原因クラス(例 bloat / drift / vocab / tooling-gap / axiom-defer)。同一 class が K=3 回再発で統合タスクを起票。
**ホストプロジェクトのタスク**の繰延は、そのプロジェクト自身の TODO へ(本ファイルは framework 専用)。

## 標準プラクティス(standing)

- **定期的な敵対的監査**: 意味的 AP-003・omission(機械検査で捕えにくい宣言↔消費/抜け)は、`/cycle` 時または
  大きな SYNC 後に **Codex survey(read-only 監査)** を1回回すのが体系的キャッチ。framework-review R1 の宣言↔消費
  スイープ + validate `GATE_DEAD_CONFIG`(gate param)+ `PHASE_CONSISTENCY`(loop phase_gate↔artifacts、TASK-022)が
  + `STEP_CONSISTENCY`(required_steps↔定義 step、TASK-026)が一次防御、敵対的監査が二次防御
  (TASK-014/022/026 で institutionalize)。機械検査は構造化資材に順次拡張(gates param → phase_gate↔artifact →
  required_steps↔step → 次は amendments 種別語彙等)。**敵対監査プロンプトには「step の入力↔上流の生産者」レンズを
  恒久含める**(HH-037 はこれを欠いて artifact 視点で見落とした)。意味的 cross-phase 依存は機械化困難 → レンズ+監査で捕える。
- **整理(統廃合)の定期化(HH-040)**: 局所改善の累積(冗長・supersession・bloat)は `/cycle` の **R8** で整理する。
  `node tools/hyperhelix.mjs consolidation-report` が候補を測定、`assets/workflows/consolidation.md` が手順、
  mass-consolidation は人間ゲート。大きな cross-lineage マージ後は xref 監査(L3)に加え consolidation-report も一読。

## 未決・繰延(open)

> R8c: 各 open 項目は処理 or 期限付き再正当化(`node tools/hyperhelix.mjs consolidation-report` が件数を測定)。

### R8 初回パス work-list(2026-06-22 /cycle・consolidation-report 由来)
- ~~[med] [class:drift] amendment lifecycle drift: HH-039/037/036/031/032 が「承認待ち」節下~~ → **是正済(承認済みログへ移動・ユーザー裁可)TASK-20260620-040。R8b lifecycle drift=解消**
- [med] [class:drift] R6 supersession: **live チェックの R6/R7d branch-model 二重記述を「Branch context」共有ブロックへ集約済(TASK-20260620-041)**。残: amendments の R6 履歴クラスタ(11 HH)は index-read のため据置(collapse は別途・人間ゲート・低優先)/ R8b
- [med] [class:duplication] AP-003/declare-consume が6箇所重複(anti-patterns/R1/N-041/plan P6/routing/HH-039、例と検出主張ごと)。**1権威+ポインタへ DRY**/ R8a
- [low] [class:note-frag] Project001 ノート断片化(encoding cp932 群 N-024/027/032/037/040、erb-port/scope 群 N-009/028/030)。**project playbook+検索ノート1本へ統合**(Project001 project ブランチで)/ R8a
- [low] [class:bloat] agent-roles.md 442行 / knowledge.yaml 401行(>300)。**live 契約+appendix へ tier 分割・索引**/ R8a・R7b
- ~~[low] [class:mis-scope] N-015 が shared なのに project 語混入。~~ → **是正済(text の "Project001 real tasks" → 汎用語へ D5 修正)TASK-20260624-044**
- ~~[low] theta-review.md DEPRECATED 後に live 手順残存~~ → **是正済(歴史的参照ブロックへ硬化)TASK-20260620-039**

### セキュリティ改善 work-list(2026-06-24 セキュリティ評価由来 / TASK-20260624-045)

- ~~[med] [class:governance] HH-042 裁可後の承認証跡 backfill: ratified_by/ratified_at フィールドを既存 HH-000〜041 に git log から推定して埋める + validate AMEND_RATIFIED_BY_EMPTY ルール実装~~ → **是正済(validate ルール追加 + 42件 backfill 完了)TASK-20260624-046**
- [med] [class:tooling-gap] 深度モード監査証跡: brief の light/micro モード選択に depth_justification(1行)フィールドを追加 + validate check / 深度詐称の事後検出(D2b)を事前可視化に昇格 / TASK-20260624-045 security eval
- [med] [class:tooling-gap] task WO 委任の内容整合チェック: orchestrator が委任前に WO content の SHA-256 を brief に記録し Codex 返却後に照合 / WO 改ざん検出(同一ブランチ並行セッション考慮) / TASK-20260624-045 security eval
- [low] [class:governance] ノート起源追跡フィールド: knowledge.yaml notes に `source: human | ai` フィールド追加 / 高 strength ノートへの adversarial 誘導の可視化 / TASK-20260624-045 security eval

### 低頻度ファイル drift 調査 work-list(2026-06-24 git commit 頻度分析由来)

- ~~[low] [class:drift] exception-handling.md EX-4 テーブルと loop.yaml depth_mode の対応付け~~ → **是正済(列名 Normal→standard/full + depth_modes 権威への明示対応 + micro 注記)TASK-20260628-074**
- ~~[low] [class:vocab-drift] task-list-schema.md P6 フィールド名の英日対応を明記~~ → **是正済(target/anchor/change の英日訳語対応を注記)TASK-20260628-074**

### ノート台帳スマート化 work-list(2026-06-28 HH-045 裁可由来)

- [high] [class:bloat] HH-045 実装 残(Stage1 完了 TASK-054/055=索引層スキーマ+last_used+実証 playbook N-059)。**残**: ②project 別ファイル分割(core/knowledge/<project>.yaml + concurrency.md §3) ③Project001 37件の playbook 統合(project/Project001 ブランチ・48対 merge 候補の焼却) / 535行 bloat の構造解消 / HH-045

### ガバナンス・儀式改善 work-list(2026-06-28 フレームワークレビュー由来)

- ~~[med] [class:governance] HH-046 実装~~ → **完了 TASK-20260628-061**(ratified_by=self-attested 再定義 / validate 役割=attestation completeness / constitution に honor-based 明記 / R1 更新)
- ~~[med] [class:bloat] HH-047 実装~~ → **完了 TASK-20260628-060**(micro=commit 本文記録可・loop.yaml/git-conventions/phase-gate 配線・DISTILL_CAPTURE/archive-briefs 非適用明記)
- ~~[med] [class:governance] HH-048 実装~~ → **完了 TASK-20260628-063**(gates external_value_gate + R7c 外部価値ゲート + constitution axiom-5 運用化)
- ~~[med] [class:tooling-gap] HH-050 実装~~ → **完了 TASK-20260628-062**(gates convergence_ratchet + R8c/R7a ラチェット)
- [med] [class:bloat] HH-049 実装 残(Stage1 完了 TASK-20260628-064=現行ルール digest 新設 + R6/ブランチ/R7d の高頻度 anchor)。**残**: 深度モード / R7 cadence 等の残 anchor を以後の /cycle で digest へ順次追加 / 2110行の collapse 負債を非破壊解消 / HH-049

### 蒸留ループ改善 work-list(2026-06-28 strength 分布診断由来)

- ~~[med] [class:tooling-gap] HH-053 実装 #1(検索→適用ループ)~~ → **完了 TASK-20260628-073**(validate NOTE_ATTRIBUTION + BRIEF_META task_index + distill.md D7 / evaluate ノート帰属必須化)
- [low] [class:tooling-gap] HH-053 実装 #2(書き込み時 dedup 提示): 同 project・タグ overlap ≥2 を新規ノート追加時に提示。ただしノート追加は knowledge.yaml 直接編集(専用コマンド無し)のため機械提示が難しい → consolidation-report の add-time 版 or note-add 補助コマンド新設が要る。設計要 / HH-053 #2

### テスト品質 work-list(2026-06-28 品質討議由来)

- [med] [class:tooling-gap] テスト失敗時の場当たり修正検知: evaluate.md V2 に失敗分類フィールド「(a) テストロジック誤り / (b) ソース根本修正 / (c) 場当たり回避」の記入欄を追加 + anti-patterns.md AP-008 エントリ化(テストを通すだけのソース改変を明示禁止) / V2 "not patched ad hoc" チェックが honor-based のみで機械的強制なし / TASK-20260628-048 品質討議

### 収束指標 work-list(2026-06-24 ループ評価・設計討議由来)
- [low] [class:tooling-gap] AP-003 漏れ/サイクル収束指標化: validate error count を /cycle ごとに記録して trend 化。last_always_read_lines / last_backlog_open_count と同パターン / TASK-20260624-042/043 設計討議
- [low] [class:tooling-gap] playbook 被覆率指標(レビュー#6): consolidation-report に「playbooks 数 / note-merge クラスタ数」を出力し収束指標化。HH-045 索引層の half-migration 状態を可視化しサイレント停止を防ぐ。last_always_read_lines と同パターン(HH 不要・tooling) / フレームワークレビュー 2026-06-28 #6

- [med] [class:bloat] loop.yaml が 223行に増(P6/HH-036 の inline rationale 散文)。**>250行で専用 D5 pass**(rationale を amendments へ寄せ loop を terse に・常時必読コスト削減)/ R5・R7a 監視 / R8 consolidation-report が >300行 を別途 flag / TASK-20260620-023
- ~~[gov] R7d 自己参照 cadence~~ → **解決(HH-038: main で R7d STOPPED・ROI は project ブランチで検証)** TASK-20260620-027


- [ref] フェーズ仕様監査(2026-06-22, Codex + 自己精読)残り(A群=#1/#3/#7/#9 は TASK-20260620-019 で是正済)。バッチ化候補:
  - ~~[high] #4/#5、[med/low] #2/#6/#8/#12/spike/micro(loop コア)~~ → **HH-036 裁可・適用済 TASK-20260620-021**
  - ~~[med] #10/#11/#13/#14~~ → **是正済 TASK-20260620-020**
  - → フェーズ監査16件すべて処理完了(A群 TASK-019 / detail TASK-020 / loop コア HH-036=TASK-021)
- ~~[enh] R1 スイープに「新 artifact/step は phase_gate/depth/EX/schema も同時配線」例示~~ → **是正済(R1 (a3) 追加)TASK-20260620-028**


- [med] [class:tooling-gap] helix-diagnose.mjs(遵守監査ツール)の移植 / セッション監査の需要が生じたとき / 設計書 U-01
<!-- HH:ACTIVE-SCAN-ALLOW reason="historical reference to a deferred Helix_Reflex item ID (U-03), not live use of removed material machinery" -->
- [low] [class:axiom-defer] PRINCIPLE.IMPL.001 の axiom 鋳造 / HyperHelix 運用での確証後に再判断 / 設計書 U-03(Helix_Reflex AM-010 繰越)
<!-- /HH:ACTIVE-SCAN-ALLOW -->
- [low] [class:vocab-drift] HH-030 文言 ⇔ `core/loop.yaml` micro.use_when の不整合(park を「micro task」と記すが固定語彙に park 無し。拡張は amendment 級) / HH-030 文言整理 or micro 語彙拡張 / TASK-20260620-008
- [low] /sync 改稿時に concurrency.md §3 のフィールド種別(accumulator vs high-water)を未参照だった / カウンタ照合の種別確認を習慣化 / TASK-20260620-009(是正済、再発防止メモ)
- ~~[low] /sync ヒューリスティックが `docs/` を framework パスに含まず、docs 変更が cross-branch 還元から漏れる~~ → **是正済(sync.md ヒューリスティック + reflux FW に `docs/**` 追加)TASK-20260620-034**
- [ref] Codex 網羅監査の残り穴(バッチB/C で順次) / TASK-20260620-009 監査:
  - [med] ~~HH-013 bootstrap 到達性を validate が未強制~~ → 是正済(session-bootstrap に「手動チェック・validate 前提」明記)TASK-20260620-012
  - [med] ~~human prune が /cycle 宣言のみで framework-review に行が無い~~ → 是正済(framework-review Completion に prune 行追加)TASK-20260620-011
  - [med] ~~execution_mode ヘッダ欄が agent-roles 宣言のみ~~ → 是正済(条件付き欄=managed/mixed 使用時のみと明記)TASK-20260620-012
  - [med] ~~R7c が機械検知を過大主張~~ → 是正済(改善アイデア R7c を「外部価値は人間判断」に訂正)TASK-20260620-012
  - [med] ~~S2 検索が「active のみ」未明記、archived 高 strength が上位占有しうる~~ → 是正済(loop.yaml/search.md/knowledge.yaml に active-only 明記)TASK-20260620-011
  - [low] ~~gates.notes.strength_start デッド設定~~ → HH-033 裁可・撤去済 TASK-20260620-013

## 完了・棄却(closed)

- U-02 genre→project scope 降格 — **棄却**(HH-016 が scope 機構を撤去し mooted)
- U-04 辞書分割(dictionary/local/<project>.yaml) — **棄却**(HH-016 が dictionary を deprecated 化し mooted)
- #4 amendments 提案フォーマットの撤去済み種別(universal昇格/canon降格) — 是正済 TASK-20260620-010
- #9 README R6 の main STOPPED 欠落 — 是正済 TASK-20260620-010
- #2 /helix 読込順陳腐化 / #1 /sync task_index=max — 是正済 TASK-20260620-009
