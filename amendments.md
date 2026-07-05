# amendments.md — 人間承認の単一窓口

HyperHelix における高影響変更の承認待ち・承認済みログ。ユーザー層資材(通信言語=日本語)。
人間はオンデマンドで裁可する。pending は溜めてよい。

## 索引(全 HH 一覧 — HH-024)

読み込み順ではこの索引だけを読み、関係する HH の本文だけにドリルダウンする(本文は必読でない)。
新規 HH を起票したら**この表にも1行追加する**(`validate` が見出しと索引の対応を検査する)。

| 番号 | 表題(=効果の要約) | 種別 | Status |
|------|------|------|--------|
| HH-000 | HyperHelix 創設裁可 | 憲法(創設) | Approved |
| HH-001 | tier 降格セマンティクスの一本化(再計算モデルを正) | θ | Approved |
| HH-002 | layer_active_cap の削除(未実装デッド設定) | θ | Approved |
| HH-003 | HH-000 の記載訂正(継承資材3件) | 憲法(訂正) | Approved |
| HH-004 | R6 3回ルールの一時停止(作成段階) | 憲法 | Approved |
| HH-005 | framework-change の深度判定の精緻化 | ループ定義 | Approved |
| HH-006 | standard 深度への D2/D6 条件付き追加 | ループ定義 | Approved |
| HH-007 | observation 鋳造時のタグ制約緩和 | θ | Approved |
| HH-008 | 成果指標を θ レビュー信号に追加 | θ | Approved |
| HH-009 | 「適用(seen)」定義の厳格化(反証可能性) | θ | Approved |
| HH-010 | standard 深度への P2 追加 | ループ定義 | Approved |
| HH-011 | 変種創設 variant/claude-codex(オーケストレータ分離) | 変種創設 | Approved |
| HH-012 | survey / trial Work Order の新設 | 変種統治 | Approved |
| HH-013 | 初回読込み時の実行可能構造の検証 | 憲法(環境制約) | Approved |
| HH-014 | 憲法 axiom5 の HH-004 状態記述の更新 | 憲法 | Approved |
| HH-015 | 同一ブランチ並行セッションの運用プロトコル | 運用規約 | Approved |
| HH-016 | 知識螺旋の簡素化(整数ゲート→ノート台帳) | 憲法級 | Approved |
| HH-017 | executor の timeout / watchdog(background 委任の無限待ち防止) | 変種統治(agent-roles) | Approved |
| HH-018 | R6 状態の是正(variant→main 統合の矛盾解消) | 憲法 | Approved |
| HH-019 | セキュリティの公理の新設(秘密の生記載禁止) | 憲法 | Approved |
| HH-020 | セキュリティの公理に対話的シークレット取り扱い追加 | 憲法 | Approved |
| HH-021 | HyperHelix-only 作業ディレクトリでの R6 延期 | 憲法 | Approved |
| HH-022 | micro task mode の新設 | ループ定義 | Approved |
| HH-023 | review-only 記録の分離(台帳/R6 を増やさない) | 憲法+カウンタ意味論 | Approved |
| HH-024 | amendments 索引化 + 読み込み順の階層化 | 運用規約(読込プロトコル) | Approved |
| HH-025 | main の用途に「ユーザー指示による直接的フレームワーク改善」を追加 + main で R6 停止 | 憲法(統治の公理5/R6)+ ブランチモデル | Approved |
| HH-026 | framework-review への R7(systemic value/absence/frame レンズ)追加 | 統治変更(framework-review 機構) | Approved |
| HH-027 | 実行原則「minimal-first」の憲法明記 | 憲法(実行原則) | Approved |
| HH-028 | 検出器実装時の陽性テスト必須化(evaluate.md V1) | フレームワーク資材(evaluate.md) | Approved |
| HH-029 | ツール呼び出し書式崩れを致命的失敗として明示(実行規律) | 憲法(実行原則) | Approved |
| HH-030 | 重大発見の即時パーキング規則(チャット中の発見の捕捉) | 統治変更(capture 規律) | Approved |
| HH-031 | タスクブリーフの剪定/アーカイブ(検索負荷削減) | 統治変更(記録規律) | Approved (Phase1+2) |
| HH-032 | フラット・ノート台帳の多プロジェクト累積(HH-016 スコープ再導入) | 統治変更(知識螺旋) | Approved |
| HH-033 | gates.yaml の strength_start デッド設定の撤去 | θ(gates)変更 | Approved |
| HH-034 | /sync ツール化に伴う push 人間ゲートの緩和(sync ツール経由は自動可) | 運用規約(git-conventions) | Approved |
| HH-035 | Plan が機械的 change-list を出し Execute は rote 適用に限定 | ループ定義変更 | Approved |
| HH-036 | フェーズ仕様監査 B群の loop コア是正(gate/required_steps/depth) | ループ定義変更 | Approved |
| HH-037 | Search が P6 の入力(対象資材の現状・anchor)を産むよう拡張 | ループ定義変更 | Approved |
| HH-038 | main では R7d(自己参照/ROI レンズ)を STOPPED | 統治変更(R7d 状態)+ ブランチモデル | Approved |
| HH-039 | 能力追加時の消費者配線ゲート(宣言と消費者を同一変更で配線) | ループ定義(P6 規律) | Approved |
| HH-040 | 整理機構(R8 統廃合レンズ + consolidation-report + backlog 焼却 + 跨タスク創発) | 統治変更(framework-review R8)+ ツール | Approved |
| HH-041 | task-level WO 新設: Codex が E+V1+V2 を一括実行(D1-D3 はオーケストレータ残留) | 変種統治(agent-roles) — HH-011/012 executor スコープ拡張 | Approved |
| HH-042 | 承認ゲートの技術的可視化: 人間承認証跡フィールドの追加 | 運用規約・統治変更(提案フォーマット + validate) | Approved |
| HH-043 | Distill の失敗資材化を閉ループ強制(初回手戻り/失敗も必須 + validate DISTILL_CAPTURE) | 統治変更(Distill enforcement) | Approved |
| HH-044 | 未解決マージ競合マーカーの検出(validate CONFLICT_MARKER) | 統治変更(integrity guard) | Approved |
| HH-045 | ノート台帳の索引層化(playbook トピック) + project 別ファイル分割 + strength を last_used 事実へ置換 | 統治変更(知識螺旋構造 — HH-016/032 と同格)+ θ・ツール | Approved |
| HH-046 | ガバナンス承認シグナルの誠実化(自己認証問題の解決 — HH-042 の再定義。arm B=誠実なラベリングを採択) | 憲法・統治変更 | Approved |
| HH-047 | micro タスクの brief をコミットへ畳む(儀式削減 — 独立 tasks/ ファイル不要化) | ループ定義変更(depth_modes.micro 記録先) | Approved |
| HH-048 | 外部価値ゲート(N /cycle 毎に実プロジェクト消費タスクを要求 — main R6/R7d STOPPED 下での axiom-5 運用化) | 統治変更(framework-review + constitution 公理5 運用) | Approved |
| HH-049 | amendments の現行ルール digest(意味の索引化 — HH-024 の semantic 版。決定記録と現行有効ルールの分離) | 統治変更(amendments 構造・大規模) | Approved |
| HH-050 | 収束指標にラチェット(measurement に action trigger — 連続増で焼却/slim を必須化) | 統治変更(framework-review R7a/R8c trigger)+ θ | Approved |
| HH-051 | コミット構築時のシェルインジェクション防止(引用符付きヒアドキュメント必須 + 未信頼内容の非埋め込み + AP-008) | 運用規約変更(git-conventions コミットゲート)+ セキュリティ公理 HH-019 の運用化 | Approved |
| HH-052 | 外部価値ゲートに main 例外を適用(HH-048 を R6/R7d と同じ branch context に — main は STOPPED・measurement のみ) | 統治変更(framework-review R7c + constitution 公理5 + HH-048 scope) | Approved |
| HH-053 | 蒸留の検索→適用ループを閉じる(ノート帰属 --use/--miss の必須化 + validate NOTE_ATTRIBUTION)+ 書き込み時 dedup 提示 | ループ定義変更(D7/evaluate ノート帰属)+ ツール | Approved |
| HH-054 | トークン効率委任姿勢の既定化(survey WO で読取委任 + task WO 実行委任を既定 + ガバナンス境界 + terser orch 出力) | 変種統治(agent-roles §3c)— HH-011/012/041 の委任既定強化 | Approved |
| HH-055 | compaction-recovery フックの framework 統合(.claude/settings.json を /sync・reflux の framework パスに追加 + bootstrap 検証 + auto-run セキュリティ記録) | 統治変更(sync/reflux 伝播 + session-bootstrap)+ セキュリティ運用 | Approved |
| HH-056 | R7d の分割 — 鐙検出器(敵対的類推/フレーム却下)を main で再活性化・ROI 半分は外部価値ゲートへ委譲(HH-038 supersede) | 統治変更(framework-review R7d + constitution 公理5) | Pending |

> 注: HH-017(executor timeout/watchdog)は当初 amendments エントリ未作成のまま `assets/workflows/agent-roles.md` §9 に直接適用された(2026-06-16)。TASK-20260619-014 で遡及エントリを補完し欠番を解消した。

## 現行ルール digest(HH-049 — 意味の索引。読むのはここ、遡るのは本文)

> 目的: 「現行有効なルールは何か」を 46+ の HH 本文の考古学なしに読むための**意味の索引**(HH-024 索引が navigation なのに対し、これは semantics)。
> 各項は**現行値のみ**を述べ、末尾に HH 系譜ポインタを置く。HH 本文は歴史記録(不変・追記)として残す。
> **規律(AP-003)**: 現行ルールに影響する HH を裁可したら、この digest も同一裁可で更新する。
> **競合時**: digest と本文が食い違う場合、**本文の最新裁可が正**(digest は本文の非破壊要約に過ぎない)。単一権威は各項に明記した資材。
> **段階導入(HH-049)**: まず高頻度 anchor(R6 / ブランチモデル / R7d)から。以後の /cycle で順次拡張(深度モード / R7 cadence 等)。

### R6 enforcement 状態(自己目的化チェック)
- **現行**: `main` は **STOPPED**(framework 開発が本来の目的 → enforcement・警告・連続サイクル数記録を停止)。`project/*` `variant/*` は **ACTIVE**(実タスク期待)。measurement は両ブランチ継続、enforcement のみ分岐。
- 単一権威: `assets/checklists/framework-review.md` R6。
- 系譜: HH-004(作成段階の一時停止)→ HH-014/018/021(状態記述の是正)→ HH-025(main STOPPED 確定)。

### ブランチモデル
- **現行**: `main` = framework 開発ブランチ(HH コミット / /cycle / /sync / ユーザー指示による直接改善)。`project/<name>` `variant/<name>` = 実プロジェクト作業(main から派生・/sync で改善を受領)。project コード・project 固有カウンタは main に置かない。
- 単一権威: `assets/workflows/git-conventions.md` Repository 節。
- 系譜: HH-011(変種創設)→ HH-025(main 用途拡張 + R6 STOPPED)。

### R7d(自己参照/ROI レンズ)+ 外部価値ゲート 状態
- **現行**: `main` は R7d も**外部価値ゲートも STOPPED**(ROI・外部消費の判断は project/* + 人間の運用判断)。measurement(最後の消費からの /cycle 数記録)は継続、enforcement(R4 unverified マーク)は行わない。`project/variant` は ACTIVE。
- 単一権威: framework-review R7d / R7c。gates: `external_value_gate`。
- 系譜: HH-038(R7d STOPPED)→ HH-048(外部価値ゲート)→ HH-052(main 例外=外部価値ゲートも STOPPED)。

## 人間ゲートの対象

対象の単一権威は `constitution.md`・統治の公理2。
ノートの追加・strength 更新・アーカイブはすべて自動（人間ゲート不要）。
「軽量な知識操作は自動、影響の大きい変更だけ人間が終端する」が一貫した線引きである。
裁可時、現行ルールに影響する HH は上の「現行ルール digest」も同一裁可で更新する(HH-049 の規律・AP-003)。

## 提案フォーマット

```md
## HH-NNN — 表題

**Status:** Pending | Approved | Rejected | Deferred
**ratified_by:** (人間が記入 — GitHub ID。**self-attested approval** = 人間の裁可を記録する監査証跡であり技術的強制ではない。AI が commit 権を持つ限り偽造可能で、ガバナンスは honor-based。HH-046。Pending 起票時は空欄)
**ratified_at:** (人間が記入 — YYYY-MM-DD。Pending 起票時は空欄)
**種別:** 憲法変更 / θ(gates)変更 / ノートのルール昇華 / ノートのハード削除・大規模統廃合 / ループ定義変更 / 運用規約・統治変更
（HH-016 で撤去した tier/scope 由来の `universal昇格` / `canon降格` は廃止。人間ゲート対象の単一権威は constitution 統治の公理2）

### 観察(なにを観測したか)

### 根拠(カウンタ・タスクID等の証拠)

### 提案(具体的な変更内容)

### 期待効果

### リスク

### 裁可メモ
(人間が Status 変更時に記入)
```

---

## 承認待ち(Pending)

## HH-056 — R7d の分割: 鐙検出器を main で再活性化(HH-038 supersede)

**Status:** Pending
**ratified_by:** (人間が記入 — GitHub ID。**self-attested approval** = 監査証跡であり技術的強制ではない。honor-based。HH-046。Pending 起票時は空欄)
**ratified_at:** (人間が記入 — YYYY-MM-DD。Pending 起票時は空欄)
**種別:** 統治変更(`framework-review.md` R7d の分割・main 状態 + `constitution.md` 公理5 注記)— HH-038 の精緻化/supersession

### 観察(なにを観測したか)

R7d(現行定義: 敵対的類推 — この設計を却下する競合フレーム + 欠く性質を述べる)は、実は**2つの別機能を束ねていた**:
1. **フレーム却下/鐙検出**(より単純・別カテゴリの設計は無いか — 局所最適への固着を破る)。
2. **ROI/自己参照 cadence**(実プロジェクト未適用・ROI 未実証の指摘)。

HH-038 は main で R7d を **丸ごと STOPPED** にしたが、その裁可理由(観察・N-042・索引題名「自己参照/ROI レンズ」)は **(2) の ROI 誤検知のみ**に基づく。(1) を止める根拠はどこにも検討されていない — R7d が「ROI レンズ」と記憶されていたため (1) が判断時に不可視だった。結果、main で唯一の鐙検出器((1))が理由なく死んでいる。フレーム固着は自己参照的作業が続く main で**最も**危険であり、止める場所を誤っている。加えて (2) はその後 **外部価値ゲート(HH-048/052)** へ移行済み・main STOPPED — ROI 懸念は別機構で正しく担われている。

### 根拠(カウンタ・タスクID等の証拠)

- framework-review R7d 現行定義 = 敵対的類推(ROI 語なし)。一方 HH-038 索引題名 =「自己参照/ROI レンズ」= 呼称と定義の乖離。
- HH-038 観察: 「R7d は main で ROI 未実証を flag = 誤検知」→ ROI 半分のみを論拠に丸ごと停止。
- N-042: 「R7d/R7e flag a SELF-REFERENTIAL cadence… external ROI is unproven」= R7d の ROI 運用の記録。
- HH-048/052: ROI 次元を外部価値ゲートへ移行・main STOPPED(ROI は別機構が担当)。
- 設計討議(2026-06-28, 鐙比喩): 漸進改善機械は局所最適に固着し、フレーム却下レンズが唯一の対抗策。

### 提案(具体的な変更内容)

1. **R7d を分割**:
   - **R7d-ROI**(自己参照/実適用/ROI): 外部価値ゲート(HH-048/052)へ委譲済みと明記し、R7d 本文から除去。main STOPPED を維持(単一権威 = external_value_gate)。
   - **R7d-frame**(敵対的類推/フレーム却下/鐙検出): **main で ACTIVE 再活性化**。ただし制約 — 「実プロジェクト未適用/ROI 未実証」を却下理由に**使わない**(それは外部価値ゲートの領分)。問うのは「この設計を却下する競合フレームは何か / より単純・別カテゴリの作り方は無いか / 現行設計が欠く性質は何か」。
2. **加算圧の抑制**: finding は「HH を足す」でなく「**簡素化/再構成候補を1つ**」挙げる形に限定(鐙は減算・再構成であって追加ではない)。AP-004 に従い競合フレーム名 + 欠く性質を fixed-form で記録。
3. **cadence**: 既存 R7 の「5サイクルに1回 or トリガ時」を踏襲。
4. **配線**: framework-review R7d 記述の書換 + Branch context ブロックから R7d-frame を STOPPED 対象外に(R6/外部価値ゲート/R7d-ROI は main STOPPED、R7d-frame は main ACTIVE)。constitution 公理5 注記の整合。現行ルール digest(HH-049)の R7d 項も更新。
5. **HH-038 supersession**: ROI 半分は正しく残り、frame 半分を復活。

### 期待効果

- main で唯一の鐙検出器(フレーム却下/簡素化レンズ)が復活し、局所最適への固着に構造的対抗を回復。
- ROI 誤検知は蘇らない(制約 + 外部価値ゲートが ROI 担当)。
- 加算圧に対する明示的な減算レンズを持つ。

### リスク

- R7d-frame が「もっと単純に」を言い続け別種の nag 化 → cadence 5回に1回 + 「簡素化候補1つ」限定で緩和。
- 敵対的類推は主観 → AP-004(NUMBER or fixed-form evidence)に従い競合フレーム名 + 欠く性質を fixed-form 記録。
- レンズ追加自体が加算(鐙問題の再帰)→ **既存 R7d の分割で新レンズを足さない**(最小介入)。

### 裁可メモ
(人間が Status 変更時に記入)

## 承認済みログ(新しい裁可が上、創設 HH-000 が末尾)

## HH-055 — compaction-recovery フックの framework 統合

**Status:** Approved(2026-06-28 ユーザー直接指示「framework 全体」— PostCompact/UserPromptSubmit を framework 全体で自動実行。HH-025 main 直接改善)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-28
**種別:** 統治変更(`/sync`・reflux の framework パス + session-bootstrap)+ セキュリティ運用(auto-run フック)

### 観察(なにを観測したか)

compaction-recovery フック(PostCompact=marker 記録 / UserPromptSubmit=復旧 context 注入)を TASK-075 で `.claude/settings.json` に登録したが、framework 全体(project/variant ブランチ)では自動実行されない。理由: (a) `/sync` ヒューリスティック(sync.md)と reflux の FW 判定正規表現(tools/hyperhelix.mjs)が `.claude/settings.json` を framework パスに含まず、project ブランチへ伝播しない。(b) session-bootstrap がフック配線を検証しない。(c) auto-run シェルフックを framework 既定にすることのセキュリティ判断が未記録。

### 根拠(カウンタ・タスクID等の証拠)

- sync.md ヒューリスティック: `.claude/commands/**` は含むが `.claude/settings.json` を含まない
- tools/hyperhelix.mjs reflux FW 正規表現: 同様に settings.json 欠落
- claude-code-guide 確認(2026-06-28): PostCompact/UserPromptSubmit は正式イベント・settings.json 登録で発火
- ユーザー直接指示: 「framework 全体」

### 提案(具体的な変更内容)

1. **伝播配線**: `.claude/settings.json` を `/sync` ヒューリスティック(sync.md)+ reflux FW 正規表現(hyperhelix.mjs)の framework パスに追加。main→project の /sync で hooks が伝播する。
2. **コンフリクト安全**: settings.json は全体でなく **手動マージ**(sync.md コンフリクト表): hooks ブロックは main 権威、project 固有の permissions/env は保持。project 設定の上書きを防ぐ。
3. **bootstrap 検証**: session-bootstrap に §3b「フック配線検証」を追加(未配線なら非ブロックで警告)。
4. **セキュリティ記録**: auto-run シェルフックは constitution セキュリティの公理の運用範囲。緩和は honor-based で明示 — スクリプトは fail-open・repo コミット済み(監査可能)・shell 構築規律(AP-008/HH-051)に従う。

### 期待効果

- compaction-recovery が project/variant ブランチでも自動発火し、framework の回復力が全ブランチで一貫。
- settings.json の手動マージ規約で project 固有設定を保護。

### リスク

- settings.json 伝播が project 固有設定を上書きしうる → コンフリクト表の手動マージ(hooks=theirs / local=ours)で緩和。
- auto-run シェルを全ブランチへ配布するセキュリティ面 → スクリプトは監査可能(repo コミット)・fail-open・レビュー可(/hooks)。技術的強制でなく honor-based の可視化(HH-046 と同姿勢)。

### 裁可メモ

ユーザー直接指示「framework 全体」。TASK-075(settings.json 登録)の framework-wide 拡張。実装は本タスク(TASK-20260628-076)。

## HH-054 — トークン効率委任姿勢の既定化(orchestrator トークン節約)

**Status:** Approved(2026-06-28 ユーザー直接指示「オーケストレーションを強化して可能な限り codex に委託しトークンを節約」+ AskUserQuestion で「積極的委任」「HH+memory」を選択 — HH-025 main 直接改善)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-28
**種別:** 変種統治(`assets/workflows/agent-roles.md` §3c 新設)— HH-011/012/041 の委任既定姿勢の強化

### 観察(なにを観測したか)

委任機構(survey WO=HH-012 / task WO=HH-041)は存在するが「委任は選択(HH-012)」で既定は orchestrator 直接実行。実際、直近の長大セッションは**全タスクを orch 直接実行=委任ゼロ**で、orch(Claude)トークンが大ファイル読取(amendments 2300+行等)・冗長ブリーフ(~100行)・編集/validate 実行に集中した。ユーザーは orch トークン節約のため積極委任を選択。

### 根拠(カウンタ・タスクID等の証拠)

- codex-cli 0.139.0 可用(2026-06-28 確認)
- agent-roles §3: 「Delegation is a choice…delegate only when savings outweigh round-trip cost」
- ユーザー直接指示 + AskUserQuestion 選択(積極的委任 / HH+memory)

### 提案(具体的な変更内容 — agent-roles §3c 新設)

1. **既定姿勢=積極委任**: 読取を要するタスクは **survey WO 先行**(Codex が対象を読み anchor/claims を返す→orch は自分で読まず P6 を合成)。実行は **task WO(HH-041)既定**(E+V1+V2)。orch はこれらの往復を編成する。
2. **ガバナンス境界(orch が必ず保持)**: S1 要求判断 / constitution・amendments・HH の P6 authorship / D7 counter+commit / executor 返却の spot-check(HH-012 §5, cited file:line 抽出検証)。executor は事実報告のみ(判断せず・二層権威不変)。
3. **閾値**: 往復コスト > 節約 の小タスク(micro / 1〜2 edit)は orch 直接(`delegate_decision` に理由記録)。§3 既存判断の明示的既定化。
4. **terser orch 出力**: ブリーフ・ユーザー応答は signal のみ(N-021 / HH-047 と整合)。冗長な実況・巨大ブリーフを避ける。

### 期待効果

- orch(Claude)トークンの主要消費(読取・実行)を Codex(別予算)へオフロード。
- 二層権威・intent 忠実性は境界(§3c-2)で保護。

### リスク

- 往復コストで小タスクは逆に高くつく → 閾値(§3c-3)で緩和。
- executor の返却が誤ると orch が誤情報で P6 合成 → spot-check(§3c-2)必須。
- codex 未接続/障害時は §7 degraded mode(orch 直接)へフォールバック。

### 裁可メモ

ユーザー直接指示 + 方針選択(積極的委任・HH+memory)。実装は本タスク(agent-roles §3c)+ セッション memory(feedback)。

## HH-053 — 蒸留の検索→適用ループを閉じる(+ 書き込み時 dedup 提示)

**Status:** Approved(2026-06-28 ユーザー承認 — 直接指示「HH-053 を承認」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-28
**種別:** ループ定義変更(`assets/checklists/distill.md` D7 / `evaluate.md` ノート帰属)+ ツール(validate ガード + 書き込み時 dedup 提示)

### 観察(なにを観測したか)

`core/knowledge.yaml` の strength 分布(61ノート)で大半が **strength=1 に滞留**(約24/61)、高値は少数の外れ値のみ。すなわちノートが**一度書かれて二度と適用確認(`--use`/`--miss`)されていない**。蒸留の「書き込み」側は D6/D7/DISTILL_CAPTURE(HH-043)で強制済みだが、「そのノートは実際に効いたか」のフィードバックが記録されず、台帳が **write-only ログ**化している(学習ループが閉じていない)。加えて重複は consolidation-report の**事後**検出(48+対)でしか捕まらない。

### 根拠(カウンタ・タスクID等の証拠)

- strength 分布実測(2026-06-28): `strength: 1` が最多、大半が 1〜4。高値は N-008(49)/N-018(13)/N-002(9) 等の少数
- consolidation-report: note merge 候補 48+対(事後・出生後の断片化)
- HH-045: strength を last_used に降格済(スコアの弱信号性は既知)
- 設計討議(2026-06-28)

### 提案(具体的な変更内容)

1. **検索→適用ループの強制(本命)**: ブリーフの「取得/適用」表で `適用=✓` としたノートは、D7 で対応する `bump --use`/`--miss` を**必須**とする。validate ガード `NOTE_ATTRIBUTION` が最新ブリーフの `適用=✓` 行 ↔ そのタスクの `--use`/`--miss` 記録の整合を検査(不足なら warn)。AP-004(値を literal で記せ)を**ノート帰属に適用**する。**スコアの意味は不変**(+1/-1 のまま・Goodhart 回避)— 変えるのは「記録漏れを機械検出する」ことだけ。
2. **書き込み時 dedup 提示(相補)**: 新規ノート追加時(`bump` 新規 id / 専用補助)に、同 `project`・タグ overlap ≥2 の既存ノートを提示し「新規 / 既存強化(`--use`) / playbook の leaf 化」を促す。R8 統廃合を**出生時に上流化**(AP-003 / playbook N-059 の「宣言時に関係を配線」を知識へ)。提示のみ(ブロックしない)。

### 期待効果

- 台帳が「未検証の学び」から「**検証済みコーパス**」へ。蒸留の本義(効いたものを残す)が実際に回る。
- 断片化を入口で抑止し、48対の事後統廃合負債を発生源で削減。
- embedding・スコア再導入なしで(HH-016 整合)蒸留ループを閉じる。

### リスク

- #1 は D7 に軽い儀式追加 → N-021 / HH-047(儀式削減)と緊張。緩和: 新テンプレは足さず**既存の取得/適用表への validate 照合**に留める。`適用=✓` が無いタスク(非適用)は免除。
- validate ガードは「ブリーフ表 ↔ bump 記録」の照合が必要。micro(HH-047 で brief ファイル無し)では bump 記録をコミット本文から読む配線が要る(AP-003 注意)。
- #2 は対話的提示のため headless/自動実行で無視されうる → 提示のみ・非ブロック。

### 裁可メモ

ユーザーが「HH-053 を承認」と明示(2026-06-28)。strength 分布実測による蒸留ループ診断由来。実装(distill.md D7 / evaluate ノート帰属必須化 + validate `NOTE_ATTRIBUTION` + 書き込み時 dedup 提示)は裁可後の別タスク。micro(brief 無し)の bump 記録照合の配線に注意(AP-003)。

## HH-052 — 外部価値ゲートに main 例外を適用(HH-048 を R6/R7d と同じ branch context に)

**Status:** Approved(2026-06-28 ユーザー直接指示「HH-048 についても main ブランチは例外のルールを適用して」— HH-025 main 直接改善)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-28
**種別:** 統治変更(framework-review R7c + constitution 統治公理5 + HH-048 scope 精緻化)

### 観察(なにを観測したか)

HH-048 は main で「measurement のみ」としたが、実装は毎 /cycle **R4 を "unverified" とマーク**しており、これは enforcement 相当の nag。main は R6(HH-025)・R7d(HH-038)が **STOPPED** で「framework 開発が本来の目的・外部消費/ROI の判断は人間の運用判断(いつ project ブランチへ移るか)に委ねる」という branch-model を持つ。外部価値ゲートだけが main を毎 /cycle 「不足」と咎めるのは、この確立した例外規則と不整合。

### 根拠(カウンタ・タスクID等の証拠)

- TASK-20260628-065 /cycle: 外部価値ゲート初発火で R4 を "unverified" とマーク(main で毎 /cycle 発生する nag を確認)
- HH-025(main R6 STOPPED)/ HH-038(main R7d STOPPED): 「measurement は継続・enforcement のみ main で停止」の確立パターン
- ユーザー直接指示(2026-06-28): 「HH-048 についても main ブランチは例外のルールを適用して」

### 提案(具体的な変更内容)

外部価値ゲート(HH-048)を R6/R7d と同じ Branch context に載せる:
- **main → STOPPED**: enforcement(R4 unverified マーク)を停止。measurement(最後の実プロジェクト消費からの /cycle 数記録)は継続。project ブランチへ移る判断は人間の運用判断。
- **project/variant → ACTIVE**: N /cycle 内に消費が無ければ R4 "unverified" とマーク。
配線: framework-review R7c(branch-context 対応)+ Branch context ブロック(HH-048 を明記)+ constitution 公理5 注記 + gates `external_value_gate` コメント + 現行ルール digest(R7d+外部価値 項)。

### 期待効果

- main の毎 /cycle nag を解消し、R6/R7d/外部価値ゲートを一貫した branch-model へ統一。
- 外部価値の measurement は main でも継続 — 人間が「project へ移る時期」を判断する材料は残る。

### リスク

- main で外部価値の enforcement が無くなる = 自己目的化の外部 forcing function が弱まる。緩和: measurement 継続 + R6/R7d と同じく「人間の運用判断」に委ねる(HH-025 の趣旨と同じ)。

### 裁可メモ

ユーザー直接指示による main 直接改善(HH-025)。HH-048 の enforcement を R6/R7d の例外規則に揃える一貫性是正。実装は本タスク(TASK-20260628-069)で適用。

## HH-051 — コミット構築時のシェルインジェクション防止

**Status:** Approved(2026-06-28 ユーザー承認 — 直接指示「HH-051 を承認」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-28
**種別:** 運用規約変更(`assets/workflows/git-conventions.md` コミットゲート)+ セキュリティの公理(HH-019)の運用化

### 観察(なにを観測したか)

本セッションで、コミットメッセージ/ブリーフ等の**可変・ファイル由来内容をシェルに埋め込む**運用が常態化した(`git commit -m "$(cat <<'EOF' … EOF)"`)。安全だったのは**引用符付きヒアドキュメント** `<<'EOF'` を一貫使用したため(本文はリテラル・`$(...)`/バッククォート/`$VAR` を展開しない)。しかし: (1) この規律を**強制するルール/検査が無く honor-based**。1回でもクォートなし `<<EOF` に滑れば、メタ文字を含む本文でコマンドインジェクションが起きうる。(2) `reflux` で **project ブランチ/他コントリビュータ由来のノート・amendments** を将来コミットメッセージ等に埋め込む場面では内容の信頼度が下がり、クォートなし埋め込み・直接補間は実在の注入経路になる。

### 根拠(カウンタ・タスクID等の証拠)

- 本セッション TASK-20260628-060..065 のコミットは全て `<<'EOF'`(検証: `git log -1 --format=%B` で特殊文字がリテラル保持)
- ユーザー指摘(2026-06-28): 「応答にコードがそのまま出力されている。インジェクションの危険性はないか」
- constitution セキュリティの公理(HH-019/020)は秘密の生記載・対話取り扱いを規定するが、**shell コマンド構築の規律は未規定**

### 提案(具体的な変更内容)

1. **git-conventions コミットゲートに「シェル構築規律」項を追加**: 可変・ファイル由来内容をシェルへ渡す時は (a) **引用符付きヒアドキュメント `<<'EOF'`** を使う(本文リテラル)、(b) **未信頼内容**(project reflux・外部由来)は `-m` の直接補間・展開ヒアドキュメント `<<EOF` に埋め込まない — 可能なら `-F <file>` / stdin 経由。
2. **anti-patterns.md に AP-008 登録**: trigger=可変/ファイル由来内容のシェル埋め込み / avoid=展開ヒアドキュメント `<<EOF`・直接補間 / prefer=クォート付き `<<'EOF'` or `-F`/stdin / root=シェル構築規律の未明文化。
3. **(見送り)** validate ガードは実効性が限定的(補助スクリプトの静的検出は困難)のため本 HH では提案しない。

### 期待効果

- honor-based の shell 構築規律を明文化し、reflux 時の未信頼内容注入を予防。
- セキュリティの公理(HH-019)を「秘密の非記載」から「コマンド構築の安全」へ運用面で拡張。

### リスク

- 機械強制でないため依然 honor-based(HH-046 と同じく可視化・規律止まり)。技術的強制ではなく規律の明文化に留まる点を正直に認める。

### 裁可メモ

ユーザーが「HH-051 を承認」と明示(2026-06-28)。injection 懸念指摘由来。実装(git-conventions シェル構築規律 + AP-008)は本裁可に続けて実施(TASK-20260628-068)。validate ガードは見送り(実効性限定)。

## HH-048 — 外部価値ゲート(フレームワークが自分自身にしか適用されない問題)

**Status:** Approved(2026-06-28 ユーザー承認 — 直接指示「Pending の HH-048/049/050 を裁可」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-28
**種別:** 統治変更(framework-review + constitution 公理5 の運用化)

### 観察(なにを観測したか)

main では R6(自己目的化)も R7d(ROI)も STOPPED。本セッションの 50+ タスクは全て framework-on-framework で、R7c 外部価値は `/cycle` 自己レビュー内でしか記録されない。実プロジェクト(Project001 37ノート)の実作業は main で一度も走っていない。外部の forcing function が無く、「clean validate / clean cycle」への Goodhart リスク(フレームワークが自分の elegance を最適化する)がある。

### 根拠(カウンタ・タスクID等の証拠)

- cost-report(TASK-20260628-055): ノート分布 Project001:37 / hyperhelix:7 / shared:15。だが本セッション全タスクが hyperhelix
- R7c 外部価値を記録する brief は `/cycle` のみ(TASK-044/049/055)
- constitution 統治公理5「改善は成果物のために存在する」が main R6-STOPPED で運用停止(HH-025)

### 提案(具体的な変更内容)

framework-review に「外部価値ゲート」項を新設: N /cycle(例 N=3)ごとに、フレームワークを**消費する実プロジェクトタスク**を1件(project ブランチで)実施し、直近の framework 変更が実際に役立ったか(採用された成果物 / 削減されたコスト / 置換された人手介入)を記録する。main では **enforcement せず measurement のみ**(未消化なら R4 を "unverified — awaiting real-project consumption" とマーク)。HH-025/038 の「enforcement/measurement 分離」に整合。

### 期待効果

- axiom-5 の精神を R6-STOPPED 下でも運用可能に。framework 変更が実使用に対して earn される。
- 自己目的化(自己最適化)の早期検知。

### リスク

- solo 運用で project タスクが常に後回しになると gate が空回り。→ measurement に留め enforcement しない設計で緩和(記録が溜まること自体がシグナル)。

### 裁可メモ

ユーザーが「Pending の HH-048/049/050 を裁可」と明示(2026-06-28)。フレームワークレビュー #2 由来。実装は裁可後の別タスク(framework-review に外部価値ゲート項 + R4 unverified マーク・enforcement せず measurement のみ)。

## HH-049 — amendments の現行ルール digest(意味の索引化)

**Status:** Approved(2026-06-28 ユーザー承認 — 直接指示「Pending の HH-048/049/050 を裁可」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-28
**種別:** 統治変更(amendments 構造 — HH-024 の semantic 版・大規模)

### 観察(なにを観測したか)

amendments.md は 2110行 / 46 HH の無限追記ログ化。consolidation-report は毎サイクル R6(11 HH)/R7/P6/D2b/STOPPED を collapse 候補として挙げるが、R8b(実際の集約)は人間ゲートで恒久的に先送り —— 同じ狼を毎回叫ぶだけで負債は増える一方。「決定記録(不変・追記=正しい)」と「現行有効ルール(集約すべき)」が未分離。

### 根拠(カウンタ・タスクID等の証拠)

- consolidation-report(毎 /cycle): R8b 同一 anchor(R6 11 HH 等)が繰り返し collapse 候補化
- amendments.md 2110行(cost-report 索引読みだが本文考古学は高コスト)
- HH-024 は navigation 索引を導入したが semantic digest は無い

### 提案(具体的な変更内容)

amendments.md 冒頭(索引の後)に「**現行ルール digest**」節を新設。トピック別(R6 状態 / ブランチモデル / 深度モード / R7 cadence 等)に**現行有効値**を1節ずつ述べ、各節末に HH 系譜へのポインタ(脚注)。46 HH 本文は歴史記録として不変保持。**読むのは digest、遡るのは本文**。HH-024 の index→drill を navigation でなく semantics に適用する。

### 期待効果

- 「現行ルールは何か」を本文考古学なしに読める。
- collapse 負債を「本文集約(破壊的・履歴喪失)」でなく「digest 追加(非破壊)」で解消。

### リスク

- digest と本文の drift(二重管理)。→ digest=現行値のみ・本文=履歴のみと役割を截然分離し、digest 更新を裁可時の必須手順に組み込む(AP-003 配線)。
- 大規模 → 段階導入(まず R6/ブランチモデルの高頻度 anchor から)。

### 裁可メモ

ユーザーが「Pending の HH-048/049/050 を裁可」と明示(2026-06-28)。フレームワークレビュー #3 由来。大規模のため段階導入(まず R6/ブランチモデルの高頻度 anchor から)。実装は裁可後の別タスク。

## HH-050 — 収束指標にラチェット(measurement に action trigger)

**Status:** Approved(2026-06-28 ユーザー承認 — 直接指示「Pending の HH-048/049/050 を裁可」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-28
**種別:** 統治変更(framework-review R7a/R8c に trigger 追加)+ θ(gates.yaml 閾値)

### 観察(なにを観測したか)

収束指標 `last_always_read_lines`(433→434 ▲)・`last_backlog_open_count`(16→17 ▲)は記録・眺めるだけで閾値 trigger が無い。trigger の無い measurement は儀式。直近いずれも増加方向だが誰も動いていない。

### 根拠(カウンタ・タスクID等の証拠)

- 収束指標2本(TASK-042/043 導入)。直近3値いずれも ▲
- R8c は「>3 cycles 未再正当化=finding」はあるが、増加そのものへの action trigger は無い

### 提案(具体的な変更内容)

framework-review R8c / R7a に**ラチェット** trigger を追加:
1. backlog open が K(既定3)/cycle 連続増なら、次 /cycle は追加前に ≥M(既定2)件焼却を必須。
2. 常時必読行数が連続増なら次 /cycle で D5 slim を必須化。
閾値 K/M は `core/gates.yaml` 化して調整可能に。ゲージでなくラチェット(単調増に歯止め)。

### 期待効果

- 改善行為の肥大化を「眺める」から「止める」へ。収束指標が実際に収束を強制する。

### リスク

- 過度に厳しいと正当な追加も阻む。→ 閾値を gates.yaml 化・保守的初期値(K=3/M=2)で緩和。

### 裁可メモ

ユーザーが「Pending の HH-048/049/050 を裁可」と明示(2026-06-28)。フレームワークレビュー #5 由来。実装は裁可後の別タスク(framework-review R8c/R7a ラチェット + gates.yaml 閾値 K/M)。

## HH-046 — ガバナンス承認シグナルの誠実化(自己認証問題の解決)

**Status:** Approved(2026-06-28 ユーザー承認 — 直接指示「046 を B で承認」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-28
**種別:** 憲法変更 + 統治変更(HH-042 の再定義)

### 観察(なにを観測したか)

`ratified_by` は AI が書き込み可能なファイル(amendments.md)にあり、かつ承認者(COCOQ-gh)=AI の操作者=同一人物である。validate `AMEND_RATIFIED_BY_EMPTY` は「空でないか」しか検査しないため、AI が `ratified_by: COCOQ-gh` を自分で記入しても pass する。solo repo では AI が commit 権を持つため、承認シグナルを AI 書き込みの外へ出す真の技術的強制は原理的に不可能(git trailer も protected branch の承認コミットも、最終的に AI が commit を実行するなら偽造可能)。HH-042 は自己承認を「可視化」する狙いだったが、validate が enforcement を半ば匂わせる現状は、A(真の強制)でも B(正直な自己申告)でもない最も弱い中間 = security theater の側面を持つ。

### 根拠(カウンタ・タスクID等の証拠)

- HH-042(2026-06-24 裁可): ratified_by/at 導入。裁可メモに「依然として AI がフィールドを偽造できるため、技術的強制ではなく可視性の向上に留まる」と明記済
- 本セッションのセキュリティ評価(TASK-20260624-045): 「最大のガバナンス脆弱性が honor-based」と結論
- validateAmendRatifiedBy(): 値の非空のみ検査(tools/hyperhelix.mjs)

### 提案(具体的な変更内容 — 人間が arm を選択)

**Arm A(真の enforcement・限定的)**: 承認を repo 外の人間管理チャネル(GitHub の Approved ラベル / 人間のみが push する保護ブランチの承認記録等)へ移し、validate/CI がそれと照合する。**制約**: AI が commit/push 権を持つ solo 運用では実効性に限界があり、完全な強制にはならない。

**Arm B(誠実なラベリング・推奨)**: governance が honor-based であることを明示する。
1. `ratified_by` を「**self-attested approval**(人間の裁可を記録する監査証跡であり、技術的強制ではない)」と再定義(提案フォーマット + knowledge/header の文言)。
2. validate `AMEND_RATIFIED_BY_EMPTY` の役割を「enforcement」でなく「**attestation completeness**(証跡欄の記入漏れ検出)」と明記(コメント + framework-review R1 の説明)。
3. constitution 統治の公理に「統治の信頼アンカーは単一の人間操作者であり技術的強制ではない。フレームワークはこれを honor-based と正直に認める」を追記。

### 期待効果

- enforcement を匂わせる中間状態(security theater)を解消し、フレームワークの「honor-based を正直に認める」美点に整合させる
- 監査者が `ratified_by` を「技術的保証」と誤読するリスクを除去

### リスク

- Arm B は「技術的に守られていない」ことを明文化する = 対外的に弱く見える。ただし現状の誤った enforcement 匂わせより誠実。
- Arm A は solo/AI-commit 環境では illusory になりうる(実装コスト大・実効性小)。

### 裁可メモ

ユーザーが「046 を B で承認」と明示(2026-06-28)。**Arm B(誠実なラベリング)を採択** — Arm A は AI が commit 権を持つ solo repo で illusory なため。実装は裁可後の別タスク: (1) `ratified_by` を self-attested と再定義、(2) validate `AMEND_RATIFIED_BY_EMPTY` の役割を「attestation completeness」と明記、(3) constitution 統治公理へ「信頼アンカーは単一の人間操作者・honor-based」を明記。

## HH-047 — micro タスクの brief をコミットへ畳む(儀式削減)

**Status:** Approved(2026-06-28 ユーザー承認 — 直接指示「047 を承認」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-28
**種別:** ループ定義変更(`core/loop.yaml` depth_modes.micro の記録先)

### 観察(なにを観測したか)

cost-report で brief 53件・平均96行 ≈ 5000行のオーバーヘッド。micro 深度(1〜2行の trivial 修正)にも独立 `tasks/TASK-*.md` ファイル + full D7 セクションが生成される。N-021(signal-vs-ceremony: 実況は儀式でありノイズ)は shared ノートとして存在するのに、フレームワークは自分自身の micro 作業に重い儀式を課している。例: TASK-20260628-048(backlog 1行追加)に約40行の brief。

### 根拠(カウンタ・タスクID等の証拠)

- cost-report(TASK-20260628-055): ブリーフ 53件, 平均 96行
- N-021(shared, strength 1): 「Narration is ceremony, not signal」
- loop.yaml depth_modes.micro.minimum_outputs: [objective, change, validation, D7]

### 提案(具体的な変更内容)

micro 深度の `minimum_outputs`(objective / change / validation / D7)を、**独立 brief ファイルではなくコミットメッセージ本文で充足可**とする。
1. `core/loop.yaml` depth_modes.micro に「記録先は commit message 可(独立 tasks/ ファイル不要)」を明記。
2. `assets/workflows/git-conventions.md` に micro コミットの本文フォーマット(objective/change/validation の3行 + D7 チェック)を規定。
3. `assets/templates/task-brief.md` / phase-gate に「micro は brief ファイル省略可・standard 以上は必須」を明記。
4. D7 カウンタ(`bump` / validate)は不変。DISTILL_CAPTURE / archive-briefs の micro 除外整合を確認。

### 期待効果

- 53-brief overhead の継続的削減(micro が最多クラス)。commit = task working record(routing)に整合。
- micro の摩擦を N-021(signal-vs-ceremony)に揃える。

### リスク

- micro の証跡が git log に散る(ただし commit=記録は routing の task working record と整合)。
- archive-briefs / DISTILL_CAPTURE が「最新ブリーフ」を参照するため、micro が brief を持たない場合の挙動を配線確認する必要(AP-003)。

### 裁可メモ

ユーザーが「047 を承認」と明示(2026-06-28)。フレームワークレビュー #4 由来。実装は裁可後の別タスク(loop.yaml depth_modes.micro / git-conventions / task-brief テンプレ / phase-gate の配線 + DISTILL_CAPTURE・archive-briefs の micro 除外整合)。

## HH-045 — ノート台帳の索引層化(playbook) + project 別ファイル分割 + strength→last_used

**Status:** Approved(2026-06-28 ユーザー承認 — 直接指示「HH-045 を承認」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-28
**種別:** 統治変更(知識螺旋の構造 — HH-016/HH-032 と同格)+ θ(`core/gates.yaml`)+ ツール(`tools/hyperhelix.mjs`)

### 観察(なにを観測したか)

`core/knowledge.yaml` がフラット・タグ索引のまま 535 行に達し、cost-report で >300 bloat フラグ、
consolidation-report で**ノート merge 候補 48 対以上**(encoding/cp932 が N-024/027/032/037/040 に散在、
erb-port/scope も多数)が継続検出されている。すなわち主たる劣化は**検索機構ではなくトピック断片化**である。

構造的に見ると、HyperHelix は amendments.md(HH-024)と読み込み順に「索引で引いて本文へドリルダウン」を
適用済みだが、**ノート台帳だけがこの索引→ドリルの対称を欠く**。knowledge.yaml ヘッダ自身が
「amendments の HH-024 索引と analogous」と述べているのに、台帳側は階層索引を持たずタグ一致のみで引く。
結果、同トピックの弱いノート5件が `top_n=6` を奪い合い、検索精度と維持コストの双方を悪化させている。

加えて `strength` は手動 ±1 nudge の弱い信号で、大半が初期値付近に留まり並び替え力をほぼ持たない。

### 根拠(カウンタ・タスクID等の証拠)

- cost-report(TASK-20260628-049 /cycle): `core/knowledge.yaml` 535 行・>300 bloat。ノート分布 Project001:37 / hyperhelix:6 / shared:15(計 58, next_note_id=59)
- consolidation-report(同): R8a ノート merge 候補「N-024~N-027/032/037/040 共有tag encoding,cp932」ほか「他 48 対」
- process-backlog 既登録: `[low][class:note-frag] Project001 ノート断片化 → project playbook+検索ノート1本へ統合`(R8a)
- 設計討議(本セッション 2026-06-28): 索引→ドリル対称の欠落・strength の弱信号性を特定

### 提案(具体的な変更内容)

**(1) 索引層 = playbook トピックの導入(本命)**

ノートスキーマに `kind: playbook | leaf` と関連リンクを追加し、台帳を2層化する:

```yaml
# 索引層(S2 の一次検索対象)
- id: T-encoding   kind: playbook   project: Project001
  tags: [encoding, cp932, powershell]
  text: "cp932/encoding の権威レッスン(統合手順)"
  leaves: [N-024, N-027, N-032, N-037, N-040]
# 葉(証跡は保持・検索は二次)
- id: N-024        kind: leaf       topic: T-encoding   text: "..."
```

- S2 はまず playbook(強い1件)を返し、葉は playbook が指したときのみ開く(HH-024 の索引→ドリルと同型)
- playbook 執筆・葉の集約は **/cycle R8(人間ゲート)** で行う。自動昇格は導入しない(HH-016 整合)

**(2) project 別ファイル分割(補助手1)**

`core/knowledge.yaml` を `core/knowledge.yaml`(shared + hyperhelix + 索引層)と
`core/knowledge/<project>.yaml`(project 固有の葉群)に分割、または project 固有葉を当該 project ブランチへ移す。
retrieval は既に `project_scope=current+shared`(HH-032)で絞られているため、狙いは検索精度でなく
**常時整合させる本体ファイルの維持コスト削減**(535 行 → 索引層+shared の小ファイル)。

**(3) strength を last_used 事実へ置換(補助手2)**

`strength: <int>`(手動スコア)を `last_used: TASK-YYYYMMDD-NNN`(最後に `--use` された事実)へ置換する。
並び替えは recency 降順。recency は**スコアでなく事実**であり Goodhart を呼ばない。
prune 判断(古く未使用の葉のアーカイブ)にも同じ事実を流用できる。`gates.yaml search` の並び規則を更新。

### 期待効果

- 535 行の常時整合コストを小さな索引層に圧縮(R7a 常時必読・R8a bloat 双方に効く)
- `top_n=6` を弱い類似葉で食い潰さず、強い playbook を返す → 検索精度↑
- 48 対の merge 候補を playbook 化で恒久解消、断片化の再発を構造的に抑止
- strength の弱信号を、監査可能な recency 事実へ置換

### リスク

- スキーマ変更は広範: `tools/hyperhelix.mjs`(NOTE_FIELD_SCHEMA / 検索ロジック / bump --use)、`gates.yaml`、
  `knowledge.yaml` ヘッダ、search.md/evaluate.md/distill.md の手順、/sync コンフリクト解決ガイドに跨る(AP-003 配線必須)
- 既存 58 ノートの移行(kind 付与・playbook 鋳造・last_used backfill)は一度の大きな作業 → 段階移行(grandfather)を推奨
- ファイル分割は /sync の競合面を変える(複数ファイルのカウンタ/ノート照合) → concurrency.md §3 の更新が要る
- embedding/意味検索は**意図的に不採用**(HH-016 が撤去した確率・スコアの再導入、grep 可能性の喪失を避ける)

### 裁可メモ

ユーザーが "HH-045 を承認" と明示(2026-06-28)。本セッションの設計討議(ノート台帳のスマート化)を受けての承認。
**実装は本エントリでは適用せず、裁可後の別タスク**で行う(スキーマ変更・project 別分割・既存58ノートの段階移行・
AP-003 配線=tools/gates/ヘッダ/search.md/evaluate.md/distill.md/concurrency.md §3 を跨る)。
embedding/意味検索は提案どおり不採用(HH-016 整合)。

## HH-044 — 未解決マージ競合マーカーの検出(validate CONFLICT_MARKER)

**Status:** Approved(2026-06-27 /cycle 発見 — ユーザー指示「失敗の自動化(HH-043)」の延長として同種ギャップを是正)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-27
**種別:** 統治変更(integrity guard)

### 不備の原因(究明)

2026-06-27 の /sync で、origin/main の `core/knowledge.yaml` に前回 SYNC-20260622(d05fa3f)由来の**コミット済み未解決競合マーカー**(`<<<<<<< HEAD` / `=======` / `>>>>>>> 85bf1b9`, N-043..058 を包む)が残存していたが、validate の既存ガード(NOTE_FIELD_SCHEMA 等)はノートを正しくパースできてしまい**検出できなかった**。手動で発見・除去するまで潜伏した。HH-043 と同型のギャップ(検知の自動化欠落)。

### 改善(適用)

`tools/hyperhelix.mjs` に validate `CONFLICT_MARKER` を追加: active 資材(core/assets/docs/.claude/commands/tools + amendments.md/constitution.md)を走査し、列0の git 競合マーカー `^<<<<<<< ` / `^>>>>>>> ` を **error** として検出。`=======` 単独は markdown setext 見出し下線との誤検知回避のため除外(競合は必ず `<<<<<<<`/`>>>>>>>` を伴うため検出漏れなし)。framework-review.md R1 機械ガード列挙に追加(CHECK_DOC_CONSISTENCY)。

### 裁可メモ

project/Project001 で適用、main 還元は /sync 候補。マーカー残存の実害(d05fa3f)は本 /cycle で main 側を別途是正済(203fd2e, 未push)。

## HH-043 — Distill の失敗資材化を閉ループ強制(初回手戻り/失敗も必須 + validate DISTILL_CAPTURE)

**Status:** Approved(2026-06-27 ユーザー指示「失敗補足は自動化されているべき。不備として原因究明し改善」HH-025 ユーザー指示直接改善)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-27
**種別:** 統治変更(Distill enforcement 機構)

### 不備の原因(究明)

本日(project/Project001 の一連タスク)、自分の直近タスクが招いた不具合の修正(手戻り)から得た再利用可能な教訓が、D2b で「検知=有」と記録されながら恒久資材化されず、無検証の参照で閉じられた。後続の手動監査で初めて資材化。

**構造的原因**: Distill の失敗資材化は3経路(D2b→process-backlog は**過去**の失敗シグナル限定 / D6→anti-pattern は**再発時のみ必須** / D7→note は「変更なし」可)に分散し、**初回の手戻り/失敗を恒久資材化する強制規定が存在しない**。かつ「検知=有」を無検証の参照で閉じられ、validate も「失敗検知→資材化」の閉ループを検査していなかった。

### 改善(適用)

1. **procedure(distill.md)**: D2b に Self-rework 項、D6 に「初回手戻り/失敗も note/AP 新規登録必須(『none』『変更なし』不可、既存資材で足る場合は該当文を引用)」、D7 に同例外を明記。
2. **automation(tools/hyperhelix.mjs)**: validate に `DISTILL_CAPTURE` を追加。**最新ブリーフ**で D2b 検知=有 または 手戻り/revert/regression を検出した場合、恒久資材(新規 N-NNN / AP-NNN / process-backlog / HH-NNN)の存在を要求し、無ければ WARN。既存ブリーフは grandfather。
3. **整合(framework-review.md R1)**: 機械ガード列挙に `DISTILL_CAPTURE` を追加(CHECK_DOC_CONSISTENCY 充足)。

これで「失敗検知→資材化」がタスク終了時の validate で自動的に閉ループ検査され、手動監査に依存しない。

### 裁可メモ

project/Project001 で適用し、本 /sync(2026-06-27, 外科的A)で main へ還元。main の HH-042(承認ゲート)との番号衝突回避のため HH-043 へ採番した。

## HH-042 — 承認ゲートの技術的可視化: 人間承認証跡フィールドの追加

**Status:** Approved(2026-06-24 ユーザー承認)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-24
**種別:** 運用規約・統治変更(提案フォーマット拡張 + validate ルール追加)

### 観察(なにを観測したか)

`amendments.md` の承認状態は `Status: Pending` → `Status: Approved` というテキスト変更で表現されている。
このテキストは AI が書き換えられるため、承認は honour-based(AI が遵守することを前提)であり、技術的に強制されていない。
承認済みログ内の HH エントリに「誰が・いつ承認したか」を示すフィールドが存在しないため、
AI の自己承認と人間承認の区別が外部から検証できない。

### 根拠(カウンタ・タスクID等の証拠)

- TASK-20260624-045: セキュリティ評価でリスクマトリックス「最大のガバナンス脆弱性」として特定
- 評価結論: 「ガバナンスが社会的(honor-based)であり技術的ではない」

### 提案(具体的な変更内容)

1. **提案フォーマットへのフィールド追加**: HH エントリの `Status` 行の直後に以下2フィールドを追加する:
   ```
   **ratified_by:** (人間が記入 — GitHub ID / 日付)
   **ratified_at:** (人間が記入 — YYYY-MM-DD)
   ```
   - AI がエントリを Pending で起票する時点ではこれら2フィールドを **空** のまま残す
   - 人間が Approved に変更する際にこれら2フィールドを記入する

2. **validate ルール追加**: `承認済みログ` 内の `Status: Approved` 行を持つ HH エントリに
   `ratified_by:` が空の場合、`AMEND_RATIFIED_BY_EMPTY` warning を発する。
   - 既存の承認済み HH は backfill が完了するまで warning を出す(緩やかな移行)

3. **既存エントリの backfill**: 本 HH 裁可後、AI が既存 HH-000〜HH-041 の各 `ratified_by:` / `ratified_at:` 欄を
   git log から推定して埋める(別タスク)。

### 期待効果

- AI の自己承認が視覚的に明白になる(`ratified_by:` が空 = 人間未承認)
- validate が空フィールドを警告するため、次 /cycle で検知される(技術的最低防衛線)
- 監査ログとして「誰が・いつ」の証跡が残る

### リスク

- 既存 HH-000〜041 の backfill が必要(git log から推定可能だが作業量あり)
- validate の `AMEND_RATIFIED_BY_EMPTY` 警告が一時的に大量発生する(backfill 前)
- 依然として AI がフィールドを偽造できるため、技術的強制ではなく「可視性の向上」に留まる

### 裁可メモ

ユーザーが "042を承認" と明示。セキュリティ評価(TASK-20260624-045)を受けての承認。実装は別タスク(backfill + validate ルール)。

## HH-041 — task-level WO 新設: Codex が E+V1+V2 を一括実行(D1-D3 はオーケストレータ残留)

**Status:** Approved(2026-06-22 ユーザー承認 — 直接指示「D1-D3 だけオーケストレータ残留とする。具体的な実装計画を進めて」、設計2ターン確定)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-23
**種別:** 変種統治(agent-roles) — HH-011/012 executor スコープ拡張

### 観察(なにを観測したか)

現行委任モデル(HH-011/012)は TL ユニット単位に WO を発行する: 1タスク N ユニット = N ラウンドトリップ。
さらに V(Evaluate)の全 V1 コマンドをオーケストレータが再実行する規則があり、委任によるトークン削減効果が薄い。

### 根拠(カウンタ・タスクID等の証拠)

TASK-20260622-291 設計議論(2026-06-22)。ユーザー主導 2 ターンで D1-D3 残留決定:
- D1-D3 はクロスタスク判断(ノートの strength/AP 更新・constitution への昇化判断)を要するためオーケストレータ残留。
- E + V1 + V2 は機械的/報告的であり Codex 委任に適する。

### 提案(具体的な変更内容)

1. **新 WO type `task`**: タスク全体(全 E ユニット + V1 + V2)を 1 WO で委任。
   N ラウンドトリップ → 1 往復/タスク。フォーマットは agent-roles.md §3b。
2. **executor 新権限**: V1 machine check コマンド実行(WO `v1_commands` 指定範囲のみ)。
3. **executor 新責任**: V2 受け入れ基準チェック → pass/fail を返却(§4b)。
4. **D1-D3 はオーケストレータ残留**: executor は事実(V2 結果・E4 フラグ)を返すのみ。
5. **re-verification 緩和**: task WO の V1 はオーケストレータが「レビュー + スポットチェック」に変更(全コマンド再実行は不要)。
6. **E4 内部処理**: 検知ユニットをフラグして残りユニットは継続 → 返却 → オーケストレータが修正 → 追加 WO で再実行。
7. **タスクブリーフ**: Execute 節に "Codex 返却受取" オプション欄追加(task WO 使用時のみ)。

### 期待効果

N ラウンドトリップ → 1 ラウンドトリップ/タスク。オーケストレータの V 再実行コスト削減。

### リスク

- V1 再実行なし → Codex の validate 出力を信頼。スポットチェックで一定の信頼性を維持。
- E4 が複数ユニットにまたがる場合、追加 WO が発生して 1 往復を超えることがある。
- task WO はトークンが大きく(全ユニット + V1 + V2)、xhigh = 60K がデフォルト。

### 裁可メモ

2026-06-22 ユーザー承認(「D1-D3 だけオーケストレータ残留とする。具体的な実装計画を進めて」)。
TASK-20260622-291 で全実装: agent-roles.md §1/§2/§3 + §3b + §4b + §5 更新、task-brief.md 返却欄、CLAUDE.md 説明更新。

---


## HH-040 — 整理機構(R8 統廃合レンズ + consolidation-report + backlog 焼却 + 跨タスク創発)

**Status:** Approved(2026-06-22 ユーザー承認 — 直接指示「全部実装」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-22
**種別:** 統治変更(framework-review に R8 追加)+ ツール(consolidation-report)

### 観察(なにを観測したか)

フレームワークは局所改善を**測定**(cost-report/R7)・**局所整合**(validate/R1)・**系統課題の捕捉**(D2b→process-backlog)
する系は持つが、累積した局所パッチを**全体最適へ整理する能動側**が欠けていた。Codex 監査(2026-06-22)が
統廃合余地18件を検出: R6 の supersession 連鎖が live チェックに全残(HH-004→014→018→021→025)、AP-003 が6箇所重複、
HH-035/037/039 が1機構の3分散、承認済み HH が「承認待ち」節下に誤配置、theta-review の DEPRECATED 後手順残存、
Project001 ノート断片化、agent-roles 442行。「最小主義・統合」の規範はあるが surface・強制する機構が無い(クロスリファレンスと同型の穴)。

### 根拠(カウンタ・タスクID等の証拠)

HH 40件 / amendments 1745行 / loop.yaml 223行 / brief テンプレ 189行 / active ノート 35 / process-backlog 未消化6件。
`consolidation-report` は Codex の意味監査を機械的に再現(R6=10HH・P6/STOPPED クラスタ・lifecycle drift・theta-review・
encoding ノート群・bloat)。出所は「整理の実行(冗長GC・規則再構成・backlog 消化・創発統合)が機構化されていない」。

### 提案(具体的な変更内容)

既存の cost-report/R7 と同型の4部構成で整理機構を新設:
1. **測定** `tools/hyperhelix.mjs consolidation-report`: supersession/lifecycle drift・stale deprecated・
   ノート merge 候補・規則表面 bloat・backlog 件数を HINT 出力(情報のみ・cost-report と同性質)。
2. **レンズ** `framework-review.md` **R8**(R8a 冗長 / R8b HH-set supersession / R8c backlog 焼却 / R8d 跨タスク創発 / R8e 自己計測)。
   cadence: R8a/c 毎 /cycle、R8b/d 5回毎 or active 資材 >300行。
3. **トリガ** `process-backlog` の各項目に `class:<根本原因>`、同 class が K=3 再発で統合タスク起票(R8d)。
4. **アクション+ゲート** `assets/workflows/consolidation.md`(統合手順)。mass-consolidation/削除/履歴書換は人間ゲート据置(routing)。

### 期待効果

局所改善が全体最適へ定期的に整理される。「10件の局所→1戦略」を人間の洞察でなく機構が surface。
crossreference 防止(HH-036/037 系)と同じ「規範→強制機構」化を、今度は冗長・統廃合に適用。

### リスク

整理機構自身が ceremony bloat 源になりうる(皮肉)。緩和: R8e 自己計測で overhead を測り、削る bloat より重ければ
cadence を下げる。大半は glance+HINT、重い再構成は throttle。新機械は作らず既存レール(tool/R-lens/Distill/人間ゲート)を再利用。

### 裁可メモ

2026-06-22 ユーザー承認(「全部実装」)。TASK-20260620-038 で全実装: consolidation-report ツール、R8 レンズ、
consolidation.md workflow、process-backlog の class 規約+焼却導線、README/CLAUDE 配線。本 HH 本文は承認済みログ直下に
正配置(HH-040 自身が R8b lifecycle-drift の正例)。既存の誤配置(HH-039/037/036/032/031)は R8 が flag する初回 work-list。

---


## HH-039 — 能力追加時の消費者配線ゲート(宣言と消費者を同一変更で配線)

**Status:** Approved(2026-06-22 ユーザー承認 — 直接指示「HH-039 を承認」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-22
**種別:** ループ定義変更(P6 規律)

### 観察(なにを観測したか)

クロスリファレンス監査(2026-06-22)で10件の漏れを検出。すべて **AP-003 のファイル横断版** —
新しい tool subcommand / validate 検査 / スキーマフィールド / 裁可した HH を「追加」したが、
それを参照する資材・手順・列挙(消費者)を**同じ変更で配線しなかった**。N-041 は既に
「宣言と消費者は同一変更で配線」と述べるが、強制機構が無く、並行マージがドリフトを増幅した。

### 根拠(カウンタ・タスクID等の証拠)

TASK-20260620-034/035 で是正した10件:install-commands 孤立 / README 欠落 / `ARCHIVE_INDEX` が
R1 未掲載 / `project:` が D7 未配線 / phase-gate 表ドリフト 等。共通の出所は「能力追加が消費者配線を
P6 に含めなかった」。L1 バリデータ(TASK-20260620-036)が機械検知可能サブセットを実装済。

### 提案(具体的な変更内容)

`assets/checklists/plan.md` P6 と `core/routing.yaml` に「能力追加ゲート」を追加:
**tool subcommand・validate 検査・スキーマフィールドの追加、または HH の裁可を含む変更は、
その消費者(参照する資材・手順・列挙)の編集を同じ change-list に含める。** 機械検知可能な
サブセット(subcommand↔資材・guard↔R1・note field 台帳↔データ)は L1 バリデータ
(`TOOL_DOC_CONSISTENCY` / `CHECK_DOC_CONSISTENCY` / `NOTE_FIELD_SCHEMA`)が事後強制する。

### 期待効果

能力追加と消費者配線が原子化し、クロスリファレンス漏れの発生源を断つ(L1=検知、本ゲート=予防、
L3 マージ後監査=cross-lineage fallout の清算 の三層)。

### リスク

P6 のチェック項目が増える。ただし対象は「能力追加」を含む変更に限定され、通常の編集タスクには無負荷。

### 裁可メモ

2026-06-22 ユーザー承認。L2 を適用: `assets/checklists/plan.md` P6 に「能力追加配線ゲート」項目、
`core/routing.yaml` の routing リストに「能力追加 → 消費者を同一 change-list で配線」kind を追加
(TASK-20260620-037)。L1(検出器3本)は TASK-20260620-036 で適用済、L3(マージ後監査)は
git-conventions に適用済。三層そろって発効。

---

## HH-037 — Search が P6 の入力(対象資材の現状・anchor)を産むよう拡張

**Status:** Approved(2026-06-22 人間裁可 — 直接指示「HH-037 を承認」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-22
**種別:** ループ定義変更(`core/loop.yaml` Search/Plan。amendment 級)

### 観察(なにを観測したか)

HH-035 で Plan に P6(機械的 change-list = 対象ファイル + 正確な anchor + 変換)を課したが、anchor を得るには
**編集対象資材の現状を読む**必要がある。ところが Search の S2 は「ナレッジ資産(notes / anti-patterns / 過去ブリーフ)の
照会」のみで、「**編集対象資材の現状を読み anchor を抽出する**」を規定しない。P6 の入力を名前付きで産むフェーズ/ステップが
無い = **Search↔Plan の handoff(declare↔consume)ギャップ**。HH-035 は discovery を Execute→Plan に移したが、
本来のきれいな分離は discovery(Search)→ decision(Plan)→ application(Execute)。現状 Search は**ナレッジの discovery**は
規定するが**対象資材の discovery**を規定していない。

### 根拠(カウンタ・タスクID等の証拠)

ユーザー観察(2026-06-22)。`core/loop.yaml` Search S2(ナレッジ照会のみ)/ P6(対象+anchor 要求)。実証: 本セッションの
P6 タスク(TASK-018..021)が「anchor 確定のため読む」を **Plan 直前**に実施 = discovery が Plan に滞留。

### 提案(具体的な変更内容)

1. `core/loop.yaml` Search に **target-state survey**(S2 拡張 or 新ステップ)を追加: 実装タスクでは、編集対象資材の現状を読み、
   P6 が要する anchor(対象ファイル + 一意の現行テキスト)を抽出する。既存 S2(ナレッジ照会)とは別の調査軸として明示。
2. Search の成果(`survey-notes` / `retrieved-materials`)が anchor を含むと規定し、Plan の P6 はそれを**合成するだけ**にする。
   phase_gate plan evidence は既に retrieved-materials を含む(HH-036)→ PHASE_CONSISTENCY と整合。
3. `assets/checklists/search.md` に対応項目。
4. spike / 非実装タスクは対象資材が無いので対象外(P6 同様 conditional)。

### 期待効果

discovery が Search で完結し、Plan は決定(change-list 合成)、Execute は rote に純化。HH-035 の「実装は機械的に」が
**前段(調査)から**成立する。委任(HH-011/012)も Search→Plan→executor が綺麗に分離。

### リスク

Search が重くなる(対象全読)。緩和: 「P6 が要する anchor を抽出する」目的読みに限定(全読でなく該当箇所)。spike/非実装は
対象外。小タスクは anchor=一意見出しで足りる。over-spec を避け「Plan が再調査しなくて済む」レベルで充足。

### 裁可メモ

2026-06-22 人間裁可: **採用**(直接指示「HH-037 を承認」)。TASK-20260620-025 で適用: loop.yaml に Search **S4
(target-state survey)** 新設 + standard.required_steps に S4 + P6 文言を「anchors は S4 由来・P6 は合成のみ」に改訂、
search.md S4 節、task-brief テンプレに S4 節。本タスク自身が S4 を実演(対象 anchor を Search で確定→Plan 合成→Execute rote)。
(本エントリは Pending 節に残置=承認済。物理移動は次回 amendments 整理時。)

---

## HH-036 — フェーズ仕様監査 B群の loop コア是正(gate/required_steps/depth)

**Status:** Approved(2026-06-22 人間裁可 — 直接指示「HH-036を承認」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-22
**種別:** ループ定義変更(`core/loop.yaml` の phase_gate / depth_modes / required_steps。amendment 級)

### 観察(なにを観測したか)

フェーズ仕様監査(2026-06-22, Codex + 自己精読)で、loop.yaml の phase_gate・depth_modes・required_steps に
**宣言↔消費/必須性の不整合**が複数。いずれも loop コア(amendment 級)。

### 根拠(カウンタ・タスクID等の証拠)

Codex survey 監査(TASK-20260620-019 起点)。出典は各項に file:line。A群(#1/#3/#7/#9)は TASK-019 で是正済、
detail 明確化(#10/#11/#13/#14)は TASK-020 で直接是正済。本提案は loop コアの残り。

### 提案(具体的な変更内容)— 8項目

1. **#5 D2b を standard.required_steps へ**: distill.md は D2b を「必須(none detected も明記)」とするのに
   standard は D2/D6 のみ条件付きで D2b 非要求(`loop.yaml:40` vs `distill.md:13`)。standard に D2b を明示。
2. **#4 risk-list を conditional に**: P4 が standard.required_steps に無いのに plan.artifacts は risk-list を
   無条件宣言(`loop.yaml:39,104`)。テンプレは「リスク一覧(P4 — 該当時)」=条件付きが intent → artifacts/checklist を
   conditional に揃える(or P4 を standard 必須化。**裁可で方向決定**)。
3. **#2 plan gate に retrieved-materials**: search.artifacts は retrieved-materials を宣言するが plan gate evidence は
   requirements/survey/unknowns のみ(`loop.yaml:60,85`)。S2 をスキップ可。gate に追加(D7 note 帰属の入力)。
4. **#12 evaluate gate に failure-case-log**: execute.artifacts は failure-case-log を宣言するが evaluate gate は
   implementation/execution-log のみ(`loop.yaml:62,130`)。EX-5 探索証跡が V/D 前に失われうる。gate に追加(条件付き)。
5. **#8 light.minimum_outputs に D7**: light は D7 を欠くが EX-4 は「D7 + triage」を要求(`loop.yaml:32` vs
   `exception-handling.md:46`)。micro すら D7 を含む。light に D7 を追加。
6. **#6(=β)D5 にトリガ**: D5(スリム化)は standard 非要求でトリガ無し、一方 R5 は「D5 が最近走ったか」を期待
   (`loop.yaml:39` vs `framework-review.md:41`)。→ D5 を /cycle の framework-review で定期検討(cadence)に紐付け、
   または N タスクごとの軽量トリガ。**設計は裁可で確定**(機構の自己肥大を避ける軽量案を推奨)。
7. **spike の required_steps 定義**: spike は deliverable/handoff のみで required_steps 未定義。loop 公理「全5フェーズ」と
   整合する最小集合(S1-S3 + D7 bookkeeping)を明示。
8. **micro の minimum_outputs と phase_gate の整合**: micro は4出力だが phase_gate は各フェーズ固有 evidence を要求。
   micro 時のゲート evidence の最小写像を注記。

### 期待効果

phase_gate・depth・required_steps の宣言↔消費/必須性が一致。標準タスクが必須 D2b/D7 を黙ってスキップしなくなる。
探索証跡・S2 入力がゲートで守られる。スリム化が構造的に発火する。

### リスク

required_steps を増やすと per-task 負荷増。緩和: 既に「必須」と宣言済みの項目(D2b/D7)を required に揃えるだけで
新規負荷でなく整合化。D5 トリガは軽量・低頻度で機構肥大を回避。方向に選択肢がある #4/#6 は裁可で確定。

### 裁可メモ

2026-06-22 人間裁可: **採用**(直接指示「HH-036を承認」)。保留2点を確定: **#4=risk-list を conditional**
(テンプレ「該当時」と整合)、**#6=D5 を /cycle(framework-review Completion)の定期検討トリガに紐付け**(per-task 負荷なし)。
TASK-20260620-021 で適用: loop.yaml(D2b を standard / light に D7 / plan gate に retrieved-materials / evaluate gate に
failure-case-log / conditional-evidence 注記 / spike required_steps / micro gate 写像)、plan.md P4 conditional、
framework-review に D5 トリガ行。(本エントリは Pending 節に残置=承認済。物理移動は次回 amendments 整理時。)

---

## HH-031 — タスクブリーフの剪定/アーカイブ(検索負荷削減)

**Status:** Approved（Phase 1: 2026-06-20 適用済 TASK-20260620-006 / Phase 2: 2026-06-21 ユーザー承認）
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-21
**種別:** 統治変更(記録規律 — `git-conventions.md` / `framework-review.md` / `tools/hyperhelix.mjs` / `routing.yaml` に跨る)

### 観察(なにを観測したか)

`tasks/TASK-*.md` ブリーフが 178 件・平均 106 行(cost-report 実測、計 ~18.8K 行)コミットされ永久保持。ブリーフは
phase-gate / AP-001 の監査ログで、Distill が教訓を `core/knowledge.yaml` ノートへ蒸留する設計上、蒸留後の生ブリーフの
**検索価値は大きく低下**する。それでも 178 件が grep/glob を常時圧迫する。R7 cost-report は「ブリーフ overhead」を
**計測しているが処分(disposition)を持たない**(測って終わり)。git 履歴が下層にあるので、原則「chat is not storage /
durable knowledge must land in a file」を「すべて永久 live 保持」へ適用するのは過剰である、という人間の設計洞察(雑談 2026-06-20)。

> 追跡計測(更新): /cycle TASK-20260620-257 (2026-06-21) 時点で **319 件・平均 115 行(計 ~36.7K 行)** に増加(HH-031 ratify 時 178/106 から +141 件)。Phase 1 (`tasks/.rgignore`) は適用済で既定 grep/glob からは除外されているため検索圧迫は緩和済。Phase 2(実アーカイブ/剪定)は前提 (a)-(f) 未充足のため Pending 継続。R7e 再正当化: 累積コストは増加継続だが Phase 1 で検索コストは頭打ち=即時の処分必要性は低、Phase 2 着手は前提設計完了が条件。

### 根拠(カウンタ・タスクID等の証拠)

cost-report「ブリーフ overhead: 178 件, 平均 106 行」。`core/loop.yaml:78`(S2 は過去ブリーフも引く)。
`assets/checklists/framework-review.md:56`(R7a はブリーフ平均を overhead 計測)。Codex 独立レビュー(下記、出典確認済)。

### 提案(具体的な変更内容)— 2段階

**Phase 1(推奨・即時・低リスク・削除なし)— 検索衛生**
1. **検索除外**: `tasks/` をオーケストレータの既定 grep/glob 探索から外す(ripgrep ignore 等のツールレベル除外)。
   ファイルは削除も移動もしない(`git-conventions.md:106`「削除は HH 裁可必須・アーカイブが正路」に抵触しない)。
2. **検索一次層の明示**: `core/routing.yaml` / `core/loop.yaml` S2 に「ブリーフの一次検索層はノート(knowledge.yaml)。
   生ブリーフは必要時のみ task-id 直指定で開く」を明記(HH-016 の蒸留設計を運用に反映)。
3. **R7 に disposition**: cost-report のブリーフ overhead 計測に「検索除外が効いている/いない」の判定を付け、
   計測が処分に繋がるようにする。

→ Phase 1 だけでユーザーの主訴(grep 圧迫)は解決し、削除・並行・consumer 改変のリスクをすべて回避する。

**Phase 2(保留・重い・Codex 列挙の前提を満たすまで裁可しない)— 実アーカイブ/剪定**
working-tree 剪定 + git 履歴保持 + INDEX マニフェスト。ただし下記前提を**すべて**設計に落とすまで時期尚早:
- (a) 生ブリーフの**全 consumer** を同時配線(phase-gate 参照・S2・EX-2 追記・Distill exit・WO state)。
- (b) **HH-015 並行安全**: ブリーフは作成セッション所有・D7 デルタが reconcile 証拠。剪定は閾値駆動の別アクションとし、
      in-flight WO/セッションが対象を参照しないことを確認してからのみ許可。
- (c) **git-conventions:106 との整合**: ブリーフ剪定は「ハード削除(HH 裁可必須)」に該当。`git rm` を通常 /cycle アクションに
      せず、archival mode を明示定義する。
- (d) **git-backed validator**: 「live TASK は INDEX 行を持つ」「INDEX の live 行は live ファイルを持つ」「archived hash が
      `git cat-file`/`git show` で解決する」を検査(現 validator は live `tasks/` のみ列挙)。
- (e) **INDEX スキーマ**: 1行 `task-id|date|title|hash` は薄すぎる(S2 は内容を読む)。tags/summary/touched-files/phase を持たせるか、
      剪定ブリーフを証拠に使う前に `git show` 復元を必須化。年シャード(HH-024 索引思想)で INDEX 自体の肥大を防ぐ。
- (f) **/cycle 順序**: 剪定が R7 計測の前/後/D7 後/別タスクか確定(cost-report 証拠が順序依存にならないように)。

### Codex 独立レビュー所見(2026-06-20, gpt-5.5 / survey WO TASK-20260620-005/TL-002・出典スポットチェック済)

8件(high 3 / medium 4 / low 1)。全件採用:

- **[high] AP-003 配線不足**: 生ブリーフの consumer はドラフトが挙げた5資材に留まらず、phase-gate 参照・S2・EX-2 追記・
  Distill exit・WO state も該当(`assets/checklists/phase-gate.md:8`, `core/loop.yaml:78`, `core/loop.yaml:165`,
  `assets/checklists/distill.md:47`, `assets/workflows/agent-roles.md:125`)。→ Phase 2 (a)。
- **[high] HH-015 並行非安全**: ブリーフは作成セッション所有、他セッションは編集/再利用/stage 不可、D7 デルタが reconcile 証拠
  (`concurrency.md:18,37`)。単一writer操作は last_framework_review のみ(`concurrency.md:53`)。→ Phase 2 (b)。
- **[high] 削除が監査規律と衝突**: 追跡資材の削除は HH 裁可必須・アーカイブが正路で削除は非正路(`git-conventions.md:106`)、
  no force-push/rebase/amend(`:102`)。「git rm=非ハード削除」は成立せず、archival mode の明示定義が要る。→ Phase 2 (c)。
- **[medium] INDEX が薄い**: S2 はブリーフを**読んで**答えを得る(`core/loop.yaml:78`)、D2b は source task を辿る
  (`distill.md:16`)。→ Phase 2 (e)。
- **[medium] 双方向 validate 未定義**: amendments 索引検査は同一 live ファイル内で成立(`tools/hyperhelix.mjs:389,401`)。
  task 検査は live `tasks/` のみ列挙(`:91,135,298`)。剪定検証には git-backed consumer が要る。→ Phase 2 (d)。
- **[medium] /cycle 順序未定義**(`.claude/commands/cycle.md:6,7,10`)→ Phase 2 (f)。
- **[medium] 安価な代替を未評価**: squash/rebase は no force-push で不可(`git-conventions.md:102`)、「ブリーフ非コミット」は
  tracked 規則と衝突(`:27`)、`.gitattributes` は EOL 固定のみで grep/R7 に無効(`.gitattributes:1`)。
  **search-ignore/ツールレベル除外が低リスクの第一歩**(`framework-review.md:56`)。→ **Phase 1 に採用**。
- **[low] 未決への推奨**: N=30 は live 最小窓に留め、剪定は閾値超過時のみ(毎 /cycle でない)。INDEX は当初から年シャード。
  剪定は必須でなく閾値駆動(`amendments.md:400,401`, `framework-review.md:54,57`)。→ Phase 2 既定に採用。

### 裁可メモ
2026-06-21 ユーザーが Phase 2 を承認。前提 (a)-(f) は『実装前ブロッカー』から『実装タスクの設計要件』へ格下げ＝設計に織り込んだ上で full-depth タスクで実装する。`git rm` を通常 /cycle アクションにしない archival mode を定義する。

**Codex 結論**: as-is では裁可不可。全 consumer・並行安全な剪定窓・git-backed validator 契約・INDEX スキーマ/階層・
代替の明示採否を先に定義せよ。

### 期待効果

Phase 1 で検索圧迫を即時に解消(削除ゼロ=リスクほぼゼロ)。R7 の計測が初めて処分に繋がる。Phase 2 は重い実アーカイブを
Codex 列挙の前提付きで将来オプションとして保留し、「動く最小版を先に着地」(HH-016 の精神)を踏襲する。

### リスク

Phase 1: 検索除外でブリーフが見つけにくくなる → 緩和: ノートが一次層・task-id 直指定は可能・ファイルは消さない。
Phase 2: 上記 (a)-(f) 未充足のまま実装するとデータ/監査/並行を壊す → 緩和: 前提を裁可条件として明文化、未充足なら着手しない。

### 裁可メモ

2026-06-20 人間裁可: **Phase 1 を採用**(直接指示「Phase 1 を承認」)。TASK-20260620-006 で適用:
`tasks/.rgignore`(TASK-*.md をデフォルト ripgrep 検索から除外・削除なし)、`core/loop.yaml` S2 と
`assets/checklists/search.md` S2(ノート=一次検索層・ブリーフは task-id 直指定)、`core/routing.yaml`
(task working record 注記)、`assets/checklists/framework-review.md` R7a(brief-overhead disposition)。
機構は陽性/陰性テストで検証済(tasks/ 全体検索=0、直接パス=ヒット)。
**Phase 2(実アーカイブ/剪定)は 2026-06-21 にユーザー承認・実装済** — `hyperhelix.mjs archive-briefs`(完了ブリーフを `tasks/INDEX.md` へ退避)+ validate `ARCHIVE_INDEX`(TASK-265/266)。Codex 列挙の前提 (a)-(f) は実装時に充足。

---

## HH-032 — フラット・ノート台帳の多プロジェクト累積(HH-016 スコープ再導入の検討)

**Status:** Approved（2026-06-21 ユーザー承認。park の待機トリガを解除し設計・実装へ）
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-21
**種別:** 統治変更候補(知識螺旋 — HH-016 のノートスコープ再導入)

### 観察(park=1捕捉)

/sync 還元が `origin/main` ハブ化(TASK-20260620-001)で**実際に機能し始めた**結果、複数プロジェクトの蒸留ノートが
フラット台帳 `core/knowledge.yaml` に累積する局面が到来する。HH-016 はスコープ撤去時に「多プロジェクト適用時は
新 HH でノートスコープを再導入可」と明示保留しており、その瞬間が現実化しつつある。現状 334行・40ノートで Project001 系
(CP932/Project003, strength 低・project 固有)が大半。SYNC で入った sync.md コンフリクトガイドの「プロジェクトタグ付与」は
応急処置で、根治はスコープ/タグ階層の再導入検討。

### 次段(未着手 — park ゆえ具体設計は保留)

2つ目以降の還元が実際に来た時点で、ノートスコープ(project タグ + 検索フィルタ or top_n の per-project 化、
archived の扱い)を設計・本起票する。トリガ: 横断還元が複数プロジェクトで常態化、または knowledge.yaml の
project 固有ノート比率が検索精度を実害化したとき。

### 裁可メモ

2026-06-20 人間裁可: **安価な一手を採用**(直接指示「承認する」+ Codex レビュー verdict「do a cheap step now, keep parked」)。
TASK-20260620-013 で適用: `core/knowledge.yaml` ヘッダに project タグ規約(`project:<name>` / `scope:framework`)、
`core/loop.yaml` S2 と `assets/checklists/search.md` S2 に「current project + scope:framework を generic より優先」。
free-tag 規約のみで HH-016 撤去の tier/scope 機構は呼び戻さない。**フル・スコープ再導入(per-project top_n 等)は Pending 維持** —
真の多プロジェクト累積(2つ目以降の還元常態化 or 検索精度の実害)まで本起票しない。

2026-06-21 ユーザー承認。「2つ目の還元到来」待機トリガを解除し、ノートスコープ(project タグ+検索フィルタ)の設計・実装を別タスク(full depth)で進める。

**実装済(TASK-267)**: `core/knowledge.yaml` に `project:` フィールド(7番目のノートフィールド・`shared`=横断)、`core/gates.yaml` に `search.project_scope`、S2 取得を「現プロジェクト + shared」にスコープ。これが 2026-06-20 の free-tag 安価一手を置換し「フル・スコープ再導入」を実装した(per-task の D7 は project: 付与を指示。loop.yaml D7 / distill.md / task-brief)。

---
## HH-038 — main では R7d(自己参照/ROI レンズ)を STOPPED

**Status:** Approved(2026-06-22 人間裁可 — 直接指示「main では R7d を無効とする」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-22
**種別:** 統治変更(framework-review R7d の main 状態)+ ブランチモデル

### 観察(なにを観測したか)

R7d(敵対的類推レンズ)は main で「自己参照的 cadence・実プロジェクト未適用・ROI 未実証」を flag する
(直近 /cycle TASK-20260620-023, N-042)。だが main はフレームワーク開発ブランチで、実プロジェクト適用と
ROI 検証は project/* ブランチで行われる。HH-025 が同じ理由で main の R6 を STOPPED にしたのと同型 — main での
R7d「実プロジェクトへ適用せよ」は誤検知(本来の仕事をしているのに逸脱と判定する)。

### 根拠(カウンタ・タスクID等の証拠)

ユーザー直接指示(2026-06-22):「実プロジェクト適用は別ブランチの /Project で実施中。main では R7d を無効とする」。
HH-025(main で R6 STOPPED)の先例。直近 /cycle の R7d finding(TASK-20260620-023, N-042)。

### 提案(具体的な変更内容)

1. `framework-review.md` R7d に **main → STOPPED** を追加: main では R7d を実施しない/finding としない
   (ROI・実プロジェクト適用は project ブランチで検証)。project/variant では ACTIVE。単一権威は R7d。
2. `constitution.md` 統治の公理5 の HH-025 注記に1行併記(R7d も main で STOPPED、R6 と並列)。
3. R7a-c/e/f は不変(計測は止めない。HH-026「main でも記録、enforcement なし」の精神)。N-042 の「main で surface」は
   本 HH で superseded(main では surface しない)。

### 期待効果

main の R7d 誤検知が止まる。ROI 判断が project ブランチに集約。R6/R7d が「main=開発、project=ROI 検証」のモデルで一貫。

### リスク

main で ROI ブレーキ(R6+R7d)が両方外れ、自己肥大の歯止めが弱まる。緩和: 趣旨「改善は成果物のため」は憲法公理5 に残る・
R7a/e のコスト計測は継続・実 ROI は project ブランチで検証。

### 裁可メモ

2026-06-22 人間裁可: **採用**(直接指示)。TASK-20260620-027 で framework-review R7d・constitution 公理5 に適用。

---

## HH-035 — Plan が機械的 change-list を出し Execute は rote 適用に限定

**Status:** Approved(2026-06-22 人間裁可 — 直接指示「HH 起票して loop に反映」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-22
**種別:** ループ定義変更(`core/loop.yaml` Plan/Execute。amendment 級)

### 観察(なにを観測したか)

Execute フェーズに discovery(調査・anchor 解決・「何を/どこを変えるか」の判断)が漏れ込む。loop.yaml の Plan(P1-P5)は
最小単位・順序・受入条件・検証計画までは要求するが、**各単位の機械的変更内容(対象 + 正確な anchor + 変換)の確定を要求しない**。
Execute の purpose は「build according to plan」だが、計画に機械的差分が無いため anchor 解決が Execute に滑り込む。
本セッション自身が実例(gates の strength_start 撤去・amendments の HH 移動で、編集直前に現行テキストを読んで anchor 確定)。

### 根拠(カウンタ・タスクID等の証拠)

ユーザー観察(2026-06-22「実装は機械的であるべきだが、ログでは実装に入ってから調査している」)。loop.yaml Plan steps に
機械的 change-list 要求なし。Execute purpose「build according to plan」。委任(HH-011/012)は機械的 Execute を前提とするが
未配線だった。

### 提案(具体的な変更内容)

1. `core/loop.yaml` Plan に **P6(機械的 change-list)** を追加し、`standard.required_steps` に P6 を加える。
2. Execute の purpose を「計画された change-list の機械的適用。discovery が必要になったら Plan の穴 → E4 で Plan へ戻す」へ改訂。
3. `assets/checklists/plan.md`(P6 節)・`execute.md`(Execute=rote 前提)・`agent-roles.md`(implementation WO は change-list を運ぶ)・
   `assets/templates/task-brief.md`(P6 注記)を整合。
4. 真の未知は従来どおり **EX-5/spike** へ(Execute に隠さない)。

### 期待効果

Execute が rote=機械的になり、ループ忠実性が上がる。何より **委任(HH-011/012)が現実的**になる — Plan が exact diff を出せば
executor やスクリプトが調査なしで適用できる。「実装は機械的に」の intent を機構化。

### リスク

Plan が重くなる(全 anchor の事前解決)。緩和: 「実装タスクで」に限定し、anchor は一意文字列/見出しで足りる。真の探索は
EX-5/spike に逃がす。over-spec を避け「Execute が判断しない」レベルで充足とする。

### 裁可メモ

2026-06-22 人間裁可: **採用**(直接指示「HH 起票して loop に反映」)。TASK-20260620-018 で loop.yaml/plan.md/execute.md/
agent-roles/template に適用(本タスク自身が P6 を実演 — Plan で機械的 change-list を確定し Execute を rote 適用)。

---

## HH-034 — /sync ツール化に伴う push 人間ゲートの緩和

**Status:** Approved(2026-06-20 人間裁可 — 直接指示「push も含めて完全自動」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-20
**種別:** 運用規約変更(`assets/workflows/git-conventions.md` の push ゲート)

### 観察(なにを観測したか)

/sync の実施が手作業で、還元 push ごとに人間確認(git-conventions「push only on human instruction」/
sync.md step9)を要する。ユーザーは push を含む完全自動化を要望。

### 根拠(カウンタ・タスクID等の証拠)

ユーザー直接指示(2026-06-20)+ AskUserQuestion 回答「push も含めて完全自動」。

### 提案(具体的な変更内容)

`node tools/hyperhelix.mjs sync` 経由の origin/main への push を**自動可**とする(ツール実行=standing 指示)。
**安全境界が人間確認を代替**する: (1) push 前に validate 必須で error なら停止、(2) ff-only(分岐・衝突では停止し
手動 reconcile へ委譲、force-push しない)、(3) push 拒否で停止。**それ以外の push は従来どおり人間ゲート**。
git-conventions の push 規則と sync.md step9 に例外を明記。

### 期待効果

/sync の手作業解消。安全(validate + ff)を保ったまま push を自動化。

### リスク

自動 push で不正状態を送る。緩和: validate error / 分岐 / 拒否で停止、force-push しない、counter/notes 衝突は
自動解決せず手動へ委譲。

### 裁可メモ

2026-06-20 人間裁可: **採用**(直接指示「push も含めて完全自動」)。TASK-20260620-016 で
`tools/hyperhelix.mjs sync` 実装 + git-conventions / sync.md に push ゲート例外を反映。

---

## HH-033 — gates.yaml の strength_start デッド設定の撤去

**Status:** Approved(2026-06-20 人間裁可 — 直接指示「承認する」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-20
**種別:** θ(`core/gates.yaml`)変更

### 観察(なにを観測したか)

`core/gates.yaml` の `notes.strength_start: 1` は宣言されるが consumer が無い。新規ノートの初期 strength は
`core/knowledge.yaml` ヘッダが "start 1" とハードコードし(単一権威)、`bump`/note-add ツールも validator も
`strength_start` を読まない。= デッド設定(宣言のみ・消費側なし。AP-003 の逆向き)。Codex 網羅監査(2026-06-20)で検出。

### 根拠(カウンタ・タスクID等の証拠)

Codex survey 監査(TASK-20260620-009 起点)。出典: `core/gates.yaml:23`(strength_start)/ `core/knowledge.yaml:19`
("start 1" ハードコード)/ `tools/hyperhelix.mjs`(gates は schema_version のみ読む)。

### 提案(具体的な変更内容)

`core/gates.yaml` から `notes.strength_start` を撤去する(初期 strength の単一権威は knowledge.yaml ヘッダに一本化)。
θ変更につき人間ゲート。将来 strength_start を可変にしたくなれば、その時 tooling と**同時配線**で再導入(AP-003)。

### 期待効果

宣言と実装の一致。デッド設定の除去で gates.yaml が「生きたパラメータだけ」になる。

### リスク

低(未使用値の削除・挙動不変)。緩和: 撤去後に validate と note-add の初期値=1 を確認。

### 裁可メモ

2026-06-20 人間裁可: **採用**(直接指示「承認する」)。TASK-20260620-013 で `core/gates.yaml` から
`notes.strength_start` を撤去(初期 strength=1 の単一権威は knowledge.yaml ヘッダ)。挙動不変。

---

## HH-030 — 重大発見の即時パーキング規則(チャット中の発見の捕捉)

**Status:** Approved(2026-06-20 人間裁可 — 直接指示「承認」。park 計上は「タスク内=統合・タスク外=micro」を選択)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-20
**種別:** 統治変更(capture 規律 — constitution ループの公理4 / `core/routing.yaml` / `assets/workflows/review-only.md` の整合)

### 観察(なにを観測したか)

/helix 点検「チャットログで重大な発見が発生した時、資料化するルールは明確か?」(2026-06-20, review-only)で、
資料化ルールは**部分的にしか明確でない**ことを確認した。明確なのは:発見の**種別→格納先**(routing.yaml 表)、
タスク末尾の **Distill(D1-D7)** での捕捉、原則「**chat is not storage**」。一方、次の構造的な穴がある:

1. **捕捉トリガがタスク末尾(Distill)に偏る。** チャット途中・タスク外で重大発見が出ても「その場で park する」明示規則がない。
2. **「重大(=即時資料化に値する)」の閾値が未定義。** routing は**種別**で振り分けるが**重要度**では振り分けない。
3. **review-only.md §2 が所見を「リポジトリ外(チャット/issue/メモ)に記録してよい」とし、「chat is not storage」と緊張関係。**
   ゼロ成果物変更の議論中に重大発見が出ると、恒久資材に残らず**蒸発しうる**。

本フレームワーク自身の証言:最も価値ある洞察(索引化=HH-024 / ROI=HH-026)は AI レビューでなく**人間のチャット発言**から
出た(HH-026 観察)。まさに「チャット中の重大発見」が構造的に捕捉されていなかった事例である。

### 根拠(カウンタ・タスクID等の証拠)

2026-06-20 の /helix 点検報告。出典: `constitution.md` ループの公理4 / `core/routing.yaml`「chat is not storage」+ routing 表 /
`core/loop.yaml` D1-D7 / `assets/workflows/review-only.md` §2(リポジトリ外可)/ `core/gates.yaml` human_actions(prune・lift_to_rule)/
HH-026 観察。

### 提案(具体的な変更内容)

「重大発見の即時パーキング規則」を導入する(機構は軽量・固定語彙駆動で AP-004 散文化を回避):

1. **即時パーキング**: チャット中に重大発見(下記トリガ該当)が出たら、フェーズ/タスク境界を問わず、まず**恒久資材へ1行 park** する
   — 候補ノート(`knowledge.yaml` に draft タグ付き)または amendments Pending(統治級なら)。**park は「捕捉」であり「昇華」ではない**
   (重要度判定・ルール化は従来どおり Distill / 人間ゲート)。
2. **「重大」トリガ(固定語彙、主観排除)**: 次のいずれか — (a) ルール/憲法/θ に触れうる気づき、(b) 既存資材の矛盾・盲点の指摘、
   (c) 人間が出した設計洞察、(d) 同種問題の2回目(same-problem-twice)。該当しなければ通常どおり Distill で捕捉。
3. **review-only との整合**: review-only.md §2 の「リポジトリ外可」に但し書き — **重大発見トリガに該当する所見は、ゼロ成果物変更
   セッションであっても恒久資材へ1行 park する**。park を task_index 加算対象とするか(=軽微タスク化)、park 専用の非加算例外とするかは
   **裁可で決定**(HH-023 の線引きと整合させる)。
4. **格納先の配線**: `routing.yaml` に「重大発見の即時パーキング」エントリ(発見→候補ノート/amendments Pending)を追加。
   `constitution.md` ループの公理4 に「捕捉はフェーズ末尾に限らない(重大発見は即時 park)」を1行追記。

### 期待効果

人間由来・タスク外・議論中の重大発見が Distill を待たず/リポジトリ外へ逃げず、恒久資材に最低1行残る。
「種別で振り分ける」routing に「重要度で即時化する」トリガを補い、capture 規律をフェーズ末尾依存から解放する。

### リスク

過剰 park(些末な気づきまで park)で資材が膨らむ。緩和: トリガを固定語彙に限定し、該当外は通常 Distill。park=1行(昇華でない)に限定。
review-only の抜け道(park を口実に R6 回避)。緩和: park は1行・候補状態に限定し、実装着手で通常タスク化(HH-023 踏襲)。
規則自体の儀式化。緩和: 軽量・固定語彙・「1行で済む」設計。

### 裁可メモ

2026-06-20 人間裁可: **採用**(直接指示「承認」)。park の task_index 扱いは **「タスク内=統合・タスク外=micro」** を選択
(AskUserQuestion)。TASK-20260620-004 で `core/routing.yaml`(`significant_discovery_parking`)・`constitution.md` ループの公理4・
`assets/workflows/review-only.md` §2 に配線。

---

## HH-029 — ツール呼び出し書式崩れを致命的失敗として明示(実行規律)

**Status:** Approved(2026-06-20 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-20
**種別:** 憲法変更(実行原則の追加)

### 観察(なにを観測したか)

2026-06-20 セッションで、ツール呼び出しを正規の function-call 書式でなく、余計なトークン
(`count`)を前置し素の `<invoke>`/`<parameter>` タグで複数回出力した。結果、呼び出しが
パースされず**未実行のままターンが終了**し、作業がサイレントに停止。直前までの編集が
未コミットで放置され状態不整合を招いた。**診断・是正を表明した後も再発**した。

### 根拠(カウンタ・タスクID等の証拠)

システムからの「Your tool call was malformed and could not be parsed」エラー(複数回)。
TASK-20260620-191(本起票)。anti-patterns.md AP-007。

### 提案(具体的な変更内容)

`constitution.md` の「実行原則」に1条追加:
> ツール呼び出しは常に正規書式のみで行う。呼び出しの直前に余計なトークンを出力しない。
> 書式崩れは**致命的失敗**(作業のサイレント停止 + 状態不整合)として最優先で回避し、
> 「malformed」を受けたら即座に正規書式で再送し、実行成立を確認してから次へ進む。

### 期待効果

作業継続性・信頼性の確保。途中停止・未コミット放置の再発防止。

### リスク

低(実行規律の明文化のみ。機構変更なし)。生成時の直列化崩れは規律で完全には防げないため、
anti-pattern(AP-007)による常時想起と併用する。

### 裁可メモ
2026-06-20 人間裁可(ユーザー承認)。constitution.md「実行原則」へ反映済み(TASK-20260620-192)。

---

## HH-028 — 検出器実装時の陽性テスト必須化(evaluate.md V1 追加)

**Status:** Approved(2026-06-19 人間裁可 — /cycle 人間ゲート審査で承認)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-19
**種別:** フレームワーク資材(evaluate.md V1 への追記)

### 観察(なにを観測したか)

N-018「When implementing a DETECTOR, always write a positive test」が strength 6 に達した。
HyperHelix 自身の `validate` / `finish` / `active-scan` ツールに直接適用される教訓であり、
evaluate.md V1 に書くことでツール変更時のチェックとして常時発動させるべき。
具体例: マーカー名 regex `[A-Z_]+` が数字入り名前 `HH:D7` を silent miss した(陰性のみでは検出不可)。

### 根拠

N-018: strength 6, last_used 348。HyperHelix ツール実装で 6 回適用 pass。

### 提案(具体的な変更内容)

`assets/checklists/evaluate.md` の V1 に1項目追加:
> `- [ ] Detector / validator / anchor-parser changed? Write at least one POSITIVE test (an input that SHOULD be flagged). A negative-only suite cannot catch a silent miss. Example: regex [A-Z_]+ silently skipped HH:D7 (digit in name) — only a positive test caught it. (HH-028)`

N-018 を `state: archived` に変更(evaluate.md へ昇華済み)。

### 期待効果

ツール変更時に陽性テスト追加が必須チェックとして発動。silent miss の見落としを防ぐ。

### リスク

evaluate.md V1 の肥大化。ただし追加は1項目のみ。

### 裁可メモ

2026-06-19 承認。

---

## HH-027 — 実行原則「minimal-first」の憲法明記

**Status:** Approved(2026-06-19 人間裁可 — /cycle 人間ゲート審査で承認)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-19
**種別:** 憲法(実行原則)

### 観察(なにを観測したか)

N-002「Build the minimal working implementation first; expand only after it runs.」が strength 9(台帳2位)に達し、
長期にわたって多数のタスクで成果物に適用され pass してきた。深度モード(micro/light/standard)の判定にも一貫する根幹原則。

### 根拠(カウンタ・タスクID等の証拠)

N-002: strength 9, last_used 335。台帳全 33 ノート中 strength 2 位(N-008=49 は Project001 固有)。

### 提案(具体的な変更内容)

`constitution.md` の「実行原則」末尾に1行追加:
> `- 最小動作実装から始める。動いてから拡張する。(HH-027)`

N-002 を `state: archived` に変更(ルール昇華により台帳役割終了)。

### 期待効果

S2 タグ検索を経ずに常時適用される実行規範になる。深度モード選択の判断根拠と一致。

### リスク

実行原則の肥大化。ただし追加は1行のみで軽微。

### 裁可メモ

2026-06-19 承認。

---

## HH-026 — framework-review への R7(systemic value/absence/frame レンズ)追加

**Status:** Approved(2026-06-19 人間裁可 — 直接指示「承認する」。改稿で Codex 13所見を反映済み)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-19
**種別:** 統治変更(framework-review.md の機構拡張)

### 観察(なにを観測したか)

R1〜R6 と AI のレビューは**局所整合**(在るものの正否)は捕えるが、**系統的盲点**——omission(在るべきで無いもの)・
cost-without-value(コストが価値に見合うか)・frame lock-in(枠そのものの是非)——を構造的に見落とす。
本セッションで最も価値ある洞察(amendments 索引化・ROI)は AI のレビューでなく**人間**から出た。設計詳細は
`docs/改善アイデア.md`「R7 の設計」。

### 根拠(カウンタ・タスクID等の証拠)

本セッションの考察(2026-06-19)。索引化(HH-024)は AI が3回レビューし /cycle も回したのに人間指摘まで未検出。
ROI 評価も人間の問いが契機。R1-R6 はいずれも presence/consistency チェックで、無索引886行ファイルは R1 を通過した。

### 提案(具体的な変更内容)

**改稿(2026-06-19, Codex 所見反映)**。`docs/改善アイデア.md`「R7 の設計」を実装する:

1. **R7 サブチェック(a-f)** を `assets/checklists/framework-review.md` に追加:
   R7a 固定費計測(300行超+索引なし=finding)/ R7b 無索引バルク検出(N=300 を finding 基準に固定)/
   R7c 外部価値(採用/将来コスト削減/人間介入置換 のいずれか具体。無ければ finding)/
   R7d **敵対的類推**(支持 + 棄却する競合類推 + 欠ける性質。支持1つでは不充足)/
   R7e 累積棚卸し(価値根拠 + 再正当化期限)/ R7f R7 自身の overhead 計測。
2. **配線(同時必須・AP-003)** — Codex#1/#6: `.claude/commands/cycle.md`/cycle skill の「R1〜R6」→「R1〜R7」、
   framework-review Completion の「R1..R6」→「R1..R7」。これをしないと R7 は発火しない。
3. **cost-report を前提化** — Codex#5: `node tools/hyperhelix.mjs cost-report`(必読総行数・索引なし300行超 flag・
   バッチコスト)を R7a-c の**前提**に(後続候補から格上げ)。横断計測の手動依存=R1-R6 が見落とした所だから。
4. **記録先** — Codex#8: R7 結果は /cycle ブリーフ本文のみ。標準テンプレに R7 欄は追加しない(旧『次段』の
   「テンプレ R7 記入欄」を撤回。ブリーフ軽量化と整合)。
5. **main の穴** — Codex#9: R6 STOPPED でも cost-report + R7c が機械的に cost-without-value を記録(enforcement は
   無いが検知は残す)。
6. **頻度**: R7a/R7b/R7f + cost-report は毎 /cycle。R7c/d/e は5サイクルおき or 300行超時。
7. **AP-004 緩和**: 各サブチェックは閾値/敵対形/数値+根拠で固定(散文のみ不可)。

### 期待効果

systemic レンズが機構に乗り、人間が毎回割り込まなくても omission/ROI/frame の問いが構造化される。
計測駆動ゆえ「いいえ」で充足する散文化(AP-004)を回避。

### リスク

R7 自体の儀式化(R7 が cost-without-value になる)。緩和: 軽量・計測駆動・低頻度(R7c-e)で設計。
omission をチェックリストで完全には消せない。緩和: 「数値が問いを強制する」へ転換(完全網羅は狙わない)。

### Codex 独立レビュー所見(2026-06-19, gpt-5.5 / TASK-20260619-019 survey WO・出典スポットチェック済み)

13件(high 3 / medium 8 / low 2)。要点:

- **[high] 配線未完(AP-003)**: R7 を framework-review に足しても、`.claude/commands/cycle.md` と
  Completion 行が「R1〜R6」を hard-code しているため **R7 は発火しない**。/cycle 手順と Completion を
  R1-R7 へ更新しないと宣言だけになる(出典確認済: cycle.md・framework-review.md:50)。
- **[high] R7d が散文充足可**: 「何に似るか1つ述べる」だけで固定語彙・閾値・敵対的(反証)類推が無く、
  AP-004 の根本(散文で充足)に該当。→ **競合する類推 + 「この設計を棄却する類推は何か」を必須化**すべき。
- **[medium] R7c/R7e の弱さ**: R7c は外部価値・採用・将来コスト削減を測らず main では情報提供のみ=
  cost-without-value を自動検知しない。R7e の「まだ正当か」は開いた判断で「正当」散文化しうる。
- **[medium] 手動計測の楽観**: 索引見落としは複数ファイル横断の計測(行数・索引有無・伸び)を要し、
  まさに R1-R6 が手動で見落とした所。→ `cost-report` を後続でなく**前提**にする方が R7a/R7b が実際に効く。
- **[medium] main の穴**: R6 STOPPED(main)+ R7c 情報提供のみ → **フレームワーク作業が最も起きる main で
  cost-without-value が機械検知されない**ままになる。
- **[medium] 自己矛盾**: HH-026 は「標準テンプレに R7 欄を追加しない」が、設計『次段』は「テンプレ R7 記入欄」と
  記述(出典確認済: amendments:100 vs 改善アイデア:427)。軽量化と衝突 → 設計を修正。
- **[low] 健全なのは R7a/R7b**(索引見落としを捕えたはず)。ただし「必読」の出典と閾値 N(現状未定義、300は cadence)を確定要。

採否: 全件採用(出典 file:line を確認)。**結論: R7 は R7a/R7b を核に有望だが、配線(/cycle・Completion)・
R7d/e の散文化対策・テンプレ矛盾・main の機械検知欠落を解消するまで裁可は時期尚早**。

### 裁可メモ

2026-06-19 改稿: 上記13所見を**提案へ反映済み**(配線 /cycle・Completion / cost-report 前提化 / R7d 敵対類推 /
テンプレ R7 欄撤回 / main の機械検知 / R7f 自己計測 / 閾値 N=300 固定)。
2026-06-19 人間裁可: **採用**(直接指示「承認する」)。別タスクで framework-review への R7a-f 追加・
配線(/cycle・Completion)・cost-report ツール実装に進む。

## HH-025 — main の用途に「ユーザー指示による直接的フレームワーク改善」を追加 + main で R6 停止

**Status:** Approved(2026-06-19 人間裁可 — 直接指示「main ブランチの用途にユーザー指示によるフレームワークの直接改善を追加。メインブランチでは R6 の警告を停止する」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-19
**種別:** 憲法変更(統治の公理5 / R6 状態)+ ブランチモデル(git-conventions main 用途)

### 観察(なにを観測したか)

main は git-conventions で「framework-only ブランチ(HH-NNN・/cycle・/sync)」と定義される一方、実態として
本セッション(TASK-005〜016)のような**ユーザー指示による直接的フレームワーク改善**(/helix でフレームワーク資材を
直接編集)が main 用途として明文化されていなかった。また R6(自己目的化チェック)は main で REACTIVATED /
CONTEXT-DEFERRED の半端な状態にあり、連続 framework-only が14回に達して「次は実タスク必須」の警告を出し続けたが、
**main がフレームワーク開発の場である以上、framework-only はドリフトではなく本来の仕事**であり、この警告は
main では誤検知である(R6 は本来「実プロジェクト作業をすべき場で framework-only に逸れる」ことを検知する装置)。

### 根拠(カウンタ・タスクID等の証拠)

本セッションの連続 framework-only=14(TASK-20260619-015 /cycle R6 記録)。git-conventions main 定義
(framework-only だが「ユーザー指示の直接改善」が未明記)。framework-review.md R6 の CONTEXT-DEFERRED
(HH-021)が main で enforcement を延期しつつ警告を出し続ける半端状態。ユーザー直接指示(2026-06-19)。

### 提案(具体的な変更内容)

ブランチで R6 の意味を明確に分離する:

1. `assets/workflows/git-conventions.md` main 定義に**「ユーザー指示による直接的フレームワーク改善」**を
   正規用途として追加(HH-NNN・/cycle・/sync に加え、/helix によるフレームワーク資材の直接編集)。
2. `assets/checklists/framework-review.md` R6 に **main → STOPPED** 状態を追加:
   main はフレームワーク開発ブランチであり、framework-only が本来の目的。R6 の連続数 enforcement・
   「次は実タスク必須」警告・連続数のメタ記録要求を**停止**する。project/variant では ACTIVE のまま
   (実プロジェクト作業の場でのドリフト検知は維持)。
3. `constitution.md` 統治の公理5 に HH-025 注記: main では R6 停止(framework 開発の場)。単一権威は R6。
4. `assets/templates/task-brief.md` の R6 メタ記録行を「main では `n/a (main: R6 STOPPED)` 可」に緩和。

### 期待効果

main の用途が実態(ユーザー指示の直接改善)と一致。R6 が「逸脱検知」の本来の役割に純化され、main では誤検知の警告が
止まり、project/variant では実プロジェクトのドリフトを検知し続ける。ROI/自己目的化の判断は main では
**人間の運用判断**(いつ project ブランチへ移るか)に委ねられる。

### リスク

main で R6 を止めると、自己目的化の自動ブレーキが外れる(無限にフレームワークを磨き続けうる)。
緩和: R6 の趣旨(成果物のために改善する)は憲法本文に残し、project/variant の R6 は維持。実プロジェクト適用の
ROI 実証は人間判断で project ブランチに切り替えて行う(本セッションの ROI 議論で確認した運用)。

### 裁可メモ

2026-06-19 人間裁可: **採用**(直接指示)。TASK-20260619-017 で git-conventions・framework-review R6・
constitution 公理5・テンプレに適用。

## HH-024 — amendments 索引化 + 読み込み順の階層化(起動固定費の削減)

**Status:** Approved(2026-06-19 人間裁可 — 直接指示「索引化を実装する」)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-19
**種別:** 運用規約(読み込みプロトコル)+ amendments 構造 + validator チェック追加

### 観察(なにを観測したか)

人間の問い(2026-06-19):「辞書はどれほど分厚くても索引が機能していれば読者は全て読む必要はない。
このフレームワークはそうなっているか?」。計測の結果、知識ノートは索引(tag + top_n=6 + strength)を
持つ一方、**統治史 amendments.md(886行・23 エントリ・冒頭索引なし)は読み込み順で全文必読**であり、
HH が増えるたび青天井に伸びる。dictionary.yaml(92行)は deprecated 明記済みなのに読み込み順に残存。
起動固定費は計 ~1525 行で、その大半が当面のタスクに無関係な決着済み歴史。

### 根拠(カウンタ・タスクID等の証拠)

read-only 計測(2026-06-19): amendments.md 886行・`## HH-` 23件・冒頭索引なし。読み込み順(CLAUDE.md/
AGENTS.md)が amendments と deprecated な dictionary.yaml を必読指定。知識ノートのみ索引機構あり(gates top_n)。

### 提案(具体的な変更内容)

1. `amendments.md` 冒頭に**索引表**(番号 | 表題 | 種別 | Status)を新設。読み込み順は索引だけを読み、
   関係する HH の本文へドリルダウンする。新規 HH は索引にも1行追加。
2. `tools/hyperhelix.mjs validate` に**索引完全性チェック**を追加: 全 `## HH-NNN` 見出しが索引表に
   1行を持つ(双方向 exact match)。索引ドリフトを機械的に防ぐ(AP-003: 宣言と消費側を同時配線)。
3. 読み込み順(CLAUDE.md / AGENTS.md)を**階層化**: 常時必読(憲法 + loop + routing + gates)/
   索引読み(amendments=索引のみ・本文はドリルダウン)/ オンデマンド(checklists・workflows・knowledge ノートは S2 で tag 検索)。
   `dictionary.yaml`(deprecated)を必読から外す(ファイルは保持=ハード削除は別途人間ゲート)。

### 期待効果

起動固定費を ~1525 行 → 実質 ~500 行 + 必要時ドリルダウンへ削減。統治史も「索引で引く辞書」になり、
育っても読者(エージェント)が全文を読む必要がなくなる。知識螺旋に既にある原則を統治螺旋へ拡張。

### リスク

索引のドリフト(本文追加時に索引行を忘れる)。緩和: validate の双方向チェックで機械的に強制。
ドリルダウン漏れ(関係する HH の本文を読み飛ばす)。緩和: 索引の表題=効果要約を十分具体的にし、種別で絞れるようにする。

### 裁可メモ

2026-06-19 人間裁可: **採用**(直接指示「実装する」)。TASK-20260619-013 で amendments 索引・validator・
読み込み順の階層化に適用。

## HH-023 — review-only 記録の分離(task_index/R6 を増やさない軽量レビューログ)

**Status:** Approved(2026-06-19 人間裁可 — /helix「改善アイデアを全て実装」内で AskUserQuestion により「今ここで裁可して実装」を選択)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-19
**種別:** 憲法変更(統治の公理5 注記)+ カウンタ意味論(knowledge.yaml ヘッダ)+ R6 規則

### 観察(なにを観測したか)

「レビューして報告だけ」の依頼でも、通常タスク化すると task_index と framework-only 連続数が増える。
/cycle と「ちょっと見て」の重さが同一になる(改善アイデア.md 案5)。一方、レビュー所見(同 2026-06-19)で、
task_index を増やさない別ログは R6(自己注目の過剰検知)を無力化しうる危険も指摘された。

### 根拠(カウンタ・タスクID等の証拠)

改善アイデア.md 案5 とそのレビュー所見。HH-021(CONTEXT-DEFERRED)が R6 の重さを既に一部手当て済み。

### 提案(具体的な変更内容)

review-only 記録を**ゼロ成果物変更**に厳格限定して導入する:

1. `assets/workflows/review-only.md`(新設, AI層): review-only の定義・厳格ガード・昇格条件。
   - **ゼロ成果物変更が必須条件**。いかなるファイル変更(コード・資材・ブリーフ)も伴わない確認・報告のみ。
   - task_index を増やさない(タスクではない)。R6 の framework-only 連続数にも加算しない(サイクルではない)。
   - **昇格**: 所見を1つでも実装した瞬間に通常ループへ戻し、task_index を計上する。durable lesson は実装タスクの D7 で知識化。
   - **抜け道禁止**: フレームワーク変更を「レビュー」と称して R6 を回避することを禁ずる(ファイル変更=実タスク)。
2. `core/knowledge.yaml` ヘッダ: 「review-only 記録は task_index を増やさない(ゼロ成果物変更時のみ)」を明記。
3. `assets/checklists/framework-review.md` R6: review-only 記録は連続数に加算しない(ゼロ成果物変更の厳格ガード付き)。
4. `constitution.md` 統治の公理5 に1行: review-only の単一権威は review-only.md(状態は断定しない)。

### 期待効果

確認だけの依頼で台帳・R6 を汚さない。/cycle と軽量レビューの重さを分離。厳格ガードで R6 回避の抜け道を塞ぐ。

### リスク

review-only の濫用(実作業の偽装)。緩和: ゼロ成果物変更を機械的条件(git diff 空)として明記し、
1ファイルでも変われば実タスク。

### 裁可メモ

2026-06-19 人間裁可: **採用**。TASK-20260619-007 で review-only.md 新設・knowledge ヘッダ・R6・憲法に適用。

## HH-022 — micro task mode の新設(light より小さい trivial 修正用の深度モード)

**Status:** Approved(2026-06-19 人間裁可 — /helix「改善アイデアを全て実装」内で AskUserQuestion により「今ここで裁可して実装」を選択)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-19
**種別:** ループ定義変更(core/loop.yaml depth_modes。amendment 級)

### 観察(なにを観測したか)

typo・リンク・見出し番号・明白な旧語置換・README 1〜2行のような trivial 修正にも light 以上のブリーフ負荷がかかる
(改善アイデア.md 案4)。一方レビュー所見(2026-06-19)は「新モードは light と重複し R4=フェーズゲート判定の
無曖昧性を劣化させうる」「固定語彙で適用条件を狭めれば緩和可」と指摘した。

### 根拠(カウンタ・タスクID等の証拠)

改善アイデア.md 案4 とそのレビュー所見。直近 TASK-108(見出し番号修正)を standard で回した過剰負荷の実例。

### 提案(具体的な変更内容)

`core/loop.yaml depth_modes` に `micro` を追加(light の下位、固定語彙で厳格化):

- `use_when`(固定語彙): `typo-fix` / `link-fix` / `heading-number-fix` / `obvious-removed-term-replacement` / `readme-1-2-line`
- `forbidden_when`: light の禁止に同じ(ambiguous/destructive/security-sensitive/user-facing-behavior-change/
  cross-module/durable-rule-likely)+ `any-logic-change` / `any-gate-or-axiom-touch`
- `minimum_outputs`: `[objective, change, validation, D7]`(改善アイデア.md の4行最小記録)
- 注記: フェーズは削除しない(S/P/E/V/D の精神は残す)。判定理由をブリーフに固定語彙で記録。誤分類は次タスクで standard に昇格。

R4 への配慮として、use_when を**固定語彙の列挙**に限定し「小さい」という主観判断を排除する(レビュー所見の緩和策)。

### 期待効果

trivial 修正のブリーフ負荷を最小化。light は「small/reversible/low-risk」に集中し、micro は列挙された定型作業に限定。

### リスク

「micro と言い張る」逃げ道。緩和: use_when を固定語彙に限定し、列挙外は micro 不可。誤分類は D2 で蒸留し standard へ。

### 裁可メモ

2026-06-19 人間裁可: **採用**。TASK-20260619-007 で loop.yaml depth_modes に適用。

## HH-021 — HyperHelix-only 作業ディレクトリでの R6 実タスク必須判定を延期

**Status:** Approved(2026-06-18 人間裁可 — 直接指示)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-19
**種別:** 憲法変更(統治の公理5 注記の追加 + R6 enforcement 条件の精緻化)

### 観察(なにを観測したか)

HyperHelix だけが存在する作業ディレクトリ(`E:\AIera\HyperHelix`)では、そのチャットは実プロジェクト作業ではなく
HyperHelix の調整用セッションとして使われる。R6 の「3回連続 framework-only → 次は実タスク必須」は、
プロジェクトコードや host project が同じ作業ディレクトリに存在する場合には自己目的化防止として有効だが、
HyperHelix-only の作業ディレクトリでは実タスクの実行対象がそもそも存在しないため、実タスク必須判定が
運用不能なブロックになる。

### 根拠(カウンタ・タスクID等の証拠)

TASK-20260618-002 の R6 記録で framework-only 連続数が 8 回目となり、次タスクは実タスク優先とされた。
しかし現在の CWD は HyperHelix ルートそのもので、作業対象はフレームワーク資材のみ。ユーザー直接指示
(2026-06-18): 「HyperHelixしかない作業ディレクトリはHyperHelixの調整用チャットと判断して実タスク必須判定を延期してほしい」。

### 提案(具体的な変更内容)

1. `constitution.md` 統治の公理5の注記に、HyperHelix-only 作業ディレクトリでは R6 の実タスク必須 enforcement を
   **deferred** として扱う例外を追加する。連続 framework-only 数の記録と自己目的化警告は維持する。
2. `assets/checklists/framework-review.md` R6 に判定手順を追加: CWD が HyperHelix ルートで、同一作業ディレクトリに
   host project / project artifacts が存在しない場合、そのセッションは HyperHelix tuning context とみなし、
   「次は実タスク必須」を延期する。project/variant 作業ディレクトリ、またはユーザーが実プロジェクト文脈を与えた
   セッションでは従来どおり ACTIVE enforcement。
3. README の運用要点に同じ実務説明を反映する。

### 期待効果

HyperHelix のみを置いた調整用チャットで、存在しない実タスクを要求してループが詰まることを防ぐ。一方で、
連続数記録・警告・R4 の external-artifact 未検証扱いは残るため、自己目的化リスクの可視化は維持される。

### リスク

HyperHelix-only と称して実タスク回避に使われる恐れ。緩和: 延期は CWD/作業対象に基づく運用判定に限定し、
project/variant ブランチや host project が存在する作業ディレクトリでは従来どおり enforcement ACTIVE。
また「停止」ではなく「延期」とし、連続 framework-only 数は必ず記録する。

### 裁可メモ

2026-06-18 人間裁可: **採用**(直接指示)。TASK-20260618-003 で constitution.md / framework-review.md / README.md に適用。

## HH-020 — セキュリティの公理に対話的シークレット取り扱いを追加(第5項)

**Status:** Approved(2026-06-17 人間裁可 — 直接指示)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-17
**種別:** 憲法変更(セキュリティの公理に項追加)

### 観察(なにを観測したか)

HH-019 適用後、本プロジェクトの別チャットで `/report --auto` のキー未設定時に「ローカルシェルに
API キーを設定する」提案が出た(ユーザー報告)。env 参照自体は正しいが、その設定方法が2経路で漏洩しうる:
(1) `export SUPABASE_KEY=値` がシェル履歴に平文残留、(2) AI が実値を含むコマンドを実行/貼付要求すると
生キーがチャット・ログに露出(HH-019 第1項に抵触)。HH-019 はファイル/コミットの生記載は塞いだが、
**AI が対話で秘密を能動的に受け渡す場面**(聞き出す/echo する/実値コマンドを実行する)を明示規定して
いなかったため、エージェントが不安全手順を安全と誤認した。

### 根拠(カウンタ・タスクID等の証拠)

ユーザー報告(2026-06-17、別チャットでの `/report --auto` 確認時の不安全提案)。constitution セキュリティの
公理(HH-019)第1〜4項に対話的取り扱いの項が無いこと。report.md §1.5 step1 の「環境変数設定を案内」が
方法を具体化していなかったこと。ノート N-021(信頼境界をまたぐ秘密)。

### 提案(具体的な変更内容)

1. `constitution.md` セキュリティの公理に**第5項**を追加: AI は生の秘密を聞き出さない・echo しない・
   実値を含むコマンドを実行しない(チャット/ログ露出の防止)。必要時は**存在の有無のみ**を確認し
   (値を出力しない)、設定は**ユーザーが端末履歴に残さない方法でチャット外で**行うよう案内する
   (例: bash `read -rs VAR && export VAR`、PowerShell `$env:VAR = Read-Host`、OS キーチェーン/権限制限ファイル)。
2. `.claude/commands/report.md` §1.5 step1 の認証エラー案内を、存在チェックのみ・履歴非残留設定・
   実値非貼付の具体手順に改定。

### 期待効果

対話的シークレット受け渡しの不安全手順を憲法級で禁止し、全チャット(新規セッションは憲法を読込む)へ
波及。HH-019(ファイル/コミット)と HH-020(対話)で秘密漏洩面を両面から塞ぐ。

### リスク

存在チェック snippet が誤って値を出力する表現になる懸念。緩和: 真偽のみ出力する形に限定し dogfood で確認。
公理の冗長化。緩和: 第5項は1項に凝縮し、具体コマンドは report.md へ分離。

### 裁可メモ

2026-06-17 人間裁可: **採用**(直接指示「/helix で対応」— 直前の AI 提案=憲法第5項追加+report.md 改定を承認)。
TASK-20260617-003 で constitution.md / report.md に適用。

## HH-019 — セキュリティの公理の新設(秘密情報の生記載禁止 + コミット前スキャン)

**Status:** Approved(2026-06-17 人間裁可 — 直接指示)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-17
**種別:** 憲法変更(セキュリティの公理新設)+ ゲート規則追加(検証ポリシー secret_scan)

### 観察(なにを観測したか)

直前タスク TASK-20260617-001 の `/report --auto` セキュリティ監査で、秘密情報(Supabase service_role
キー)の扱いが製品コードの規律(env/Secrets 参照・マスク)のみに依存し、フレームワークのルール層に
「秘密を生(plaintext)で残さない」恒久原則も、コミット前の秘密検出ゲートも存在しないことを確認した
(grep で HyperHelix 配下に該当ルールゼロ=net-new)。loop.yaml の `security-sensitive` は深度モードの
トリガ語にすぎず、秘密の取り扱いを規定しない。

### 根拠(カウンタ・タスクID等の証拠)

TASK-20260617-001(/report --auto 監査と is-it-safe 判定)。ノート N-021(信頼境界をまたぐ DB→LLM→
公開物の注入/秘密面)。HyperHelix 配下の secret/api-key 規則 grep=0 件。ユーザー直接指示(2026-06-17):
「HyperHelix のルールにセキュリティチェックを追加。特に API キーなどのセキュリティ情報は絶対に生で
記載しないこと」。

### 提案(具体的な変更内容)

原則→チェック→強制点の三層で配線する:

1. `constitution.md` に「## セキュリティの公理」(4項)を新設: ①秘密の生記載禁止(資材/コード/ブリーフ/
   コミット/ログ/チャット)・参照は env/Secrets・資材には変数名のみ、②出力前マスク・サンプルは
   プレースホルダ、③全コミット前に秘密スキャン(検出時はコミット停止・是正・露出時は鍵ローテーション)、
   ④秘密に触れる作業は security-sensitive(light 禁止=loop.yaml と整合)。
2. `core/loop.yaml` Evaluate V1 の機械シグナルに秘密スキャンを追加。
3. `core/routing.yaml` validation に `secret_scan`(全コミット対象)を追加。
4. `assets/checklists/evaluate.md` V1 に実行可能な秘密スキャン(具体 grep)を追加。
5. `assets/workflows/git-conventions.md` コミットゲートに「生秘密は絶対にコミットしない/スキャンを通す」を追加。

### 期待効果

秘密の生記載を憲法級の禁止事項として恒久化し、コミット前の機械チェックで前向きに遮断する。
製品・フレームワーク双方のタスクに一貫適用される(checklist 駆動)。

### リスク

grep の誤検知(env 変数名を秘密と誤認)/見逃し(網羅でない)。緩和: 「変数名・プレースホルダは適合・
実値長閾値で実値のみ拾う・ヒューリスティックな一次防御」と明記し、原則は公理側で担保。将来 hyperhelix.mjs
validate への内蔵は別 SPEC。

### 裁可メモ

2026-06-17 人間裁可: **採用**(直接指示「セキュリティチェックを追加…絶対に生で記載しないこと」)。
TASK-20260617-002 で constitution.md / loop.yaml / routing.yaml / evaluate.md / git-conventions.md に適用。

## HH-018 — R6 状態の是正: variant→main 統合後の SUSPENDED 根拠の不整合解消

**Status:** Approved(2026-06-16 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-16
**種別:** 憲法変更(統治の公理5 注記の文言修正 + R6 状態の単一権威の更新)

### 観察(なにを観測したか)

origin/main の TASK-2026-0616-004 が R6 を SUSPENDED に設定した根拠は「本ブランチ(variant/claude-codex)は
固有プロジェクト未適用」であった。しかしこの4コミットを main へマージした結果(merge commit 42b5bdb)、当該記述は
main 上に置かれた。main には Project001(project!=hyperhelix)の実タスクが多数完了済み(TASK-077..102 等)であり、
SUSPENDED の前提「固有プロジェクト未適用」は main では成立しない。さらに constitution.md 統治の公理5 は
「本項の『3回ルール』は現在有効」と状態を断定しつつ同じ括弧内で「本憲法は状態を断定しない」と述べ自己矛盾していた。
両者(憲法=有効 / R6=SUSPENDED)はマージ後に相互矛盾していた。

### 根拠(カウンタ・タスクID等の証拠)

merge commit 42b5bdb。framework-review.md R6(SUSPENDED, TASK-004 由来)。constitution.md 統治の公理5 括弧書き。
main の Project001 実タスク TASK-077..102。HH-004 の自動再開条件「project!=hyperhelix の実タスク完了 → 自動再開・再裁可不要」。

### 提案(具体的な変更内容)

1. framework-review.md R6 を **REACTIVATED** に更新(main は HH-004 自動再開条件を充足)。enforcement ACTIVE。
2. constitution.md 統治の公理5 括弧書きから状態断定(「現在有効」)を除去し、状態の単一権威を R6 に一本化
   (「自動再開する(再裁可不要)。ライブ状態の単一権威は R6、本憲法は状態を断定しない」)。

### 期待効果

憲法 ⇔ R6 の矛盾解消。状態権威の R6 一本化。main の実態(実プロジェクト稼働)と R6 enforcement の整合。

### リスク

低(状態の事実整合のみ。3回ルール本体・自動再開メカニズムは不変)。変種ブランチで作業再開する場合は、
当該ブランチの実態に応じ R6 を再判定する(状態はブランチローカルの事実に従う)。

### 裁可メモ

2026-06-16 人間裁可: **採用**(/cycle TASK-20260616-103 の R1/R6 所見に対するユーザー選択「REACTIVATED に修正」)。
同 /cycle で constitution.md・framework-review.md に適用。

## HH-017 — executor の timeout / watchdog(background 委任の無限待ち防止)

**Status:** Approved(2026-06-16 適用済み。2026-06-19 TASK-20260619-014 で遡及エントリを補完=記録の事後正規化)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-19
**種別:** 変種統治(agent-roles.md — オーケストレータ/実行エージェント契約への項追加)

### 観察(なにを観測したか)

2026-06-16、background で dispatch した実行エージェント(Codex)ジョブ(TASK-085)が完了したのに通知が
検知されず、エスカレーション機構が無いためユーザーが無限に待つ事態が発生した。完了通知は context
compaction やサンドボックスのクラッシュで黙って失われうるが、オーケストレータが受動的に待ち続ける
設計上の穴があった。本変更は当初 amendments エントリを起票せず agent-roles へ直接適用され(commit
b6af338)、HH 番号だけが参照される欠番状態になっていた(HH-024 の索引化で可視化)。

### 根拠(カウンタ・タスクID等の証拠)

TASK-20260616-085(Codex ジョブが未検知で完了・無限待ち)。commit b6af338(agent-roles §8 へ watchdog
追加)。ノート N-014(background 委任後はウォッチドッグを予算期限にスケジュールする)。HH-024 の索引完全性
チェックが HH-017 の欠番を検出。

### 提案(具体的な変更内容)

`assets/workflows/agent-roles.md` に「Timeout and watchdog」節(現 §9)を追加する:

- **予算**: dispatch 前に wall-clock 予算を設定(実装パターン=5分・survey/novel=10分)。ブリーフの Execute に記録。
- **ウォッチドッグ**: background ジョブ dispatch 後、予算期限にチェックを ScheduleWakeup 等で予約。成果物が
  あれば Evaluate へ(通知欠落)、無く誤りも無ければ +5分延長して再チェック、なお無ければエスカレーション。
- **エスカレーション**: 確定タイムアウト時、ブリーフに経過記録 → 同一 WO で1回だけ再 dispatch → 再度タイムアウト
  なら EX-1 縮退(オーケストレータが直接実行)→ 新規の失敗様式ならノート化。
- **自律モードガード**: 自律実行(ユーザー就寝中)では watchdog 必須。ScheduleWakeup 不能なら予算期限に
  インラインでポーリングしてから次へ進む。無限待ちを禁止する。

### 期待効果

委任の無限待ちを構造的に排除。通知欠落・サンドボックス障害に対して fail-safe(再 dispatch → 縮退)で進行を保証。
自律実行下でもユーザー不介入で停止しない。

### リスク

ウォッチドッグの予算見積り誤り(早すぎる打ち切り/遅すぎる検知)。緩和: 予算は型別デフォルト + 1回の延長。
再 dispatch の二重実行。緩和: 同一 WO の冪等性と1回上限。

### 裁可メモ

2026-06-16 適用(commit b6af338、agent-roles §9・N-014)。当時 amendments への起票を欠いたため、
2026-06-19 TASK-20260619-014 で遡及的に本エントリと索引行を補完した(挙動・ルールは当時のまま不変。記録の正規化のみ)。

## HH-016 — 知識螺旋の簡素化(整数ゲート機構を「学習ノート台帳」へ置換)

**Status:** Approved(2026-06-15 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-16
**種別:** 憲法変更級(知識螺旋の構造変更 + θ機構の撤去)

### 観察(なにを観測したか)

~63 タスク(本プロジェクト)運用後、ゲート管理下の active 資材は 7 件(継承3・本期鋳造3)に留まる一方、学習の実体は
amendments(HH-011..015)と anti-patterns に流れた。tier(4段)×scope(3段)×窓付き昇格降格×recompute×orphan_window×
θレビューという**最も精巧な機構が最も飢えている**(/cycle TASK-063 評価)。暫定タグも長期 provisional のままで負債化。

### 根拠

knowledge.yaml の active 資材数と鋳造履歴(本期鋳造3)。amendments HH-011..015(統治螺旋は活発)。本プロジェクト評価。

### 提案(具体的な変更内容 = 案S)

指針「常に完全を目指さず、次回もう少し良くする」を機構に埋め込み、整数ゲート機構をフラットな**学習ノート台帳**へ置換:

1. データモデル: `materials`(tier/scope/recompute/窓/contexts)→ `notes`(`id`/`text`/`tags`/`strength`/`last_used`/`state` の6項)。
2. 更新規則: 1タスク=最大1手(ノート add / 効いた `strength+1` / 外した `strength-1`)。recompute・派生・整合再計算なし。strength は並び順ヒント(ゲートではない=Goodhart 回避)。
3. 撤去: 昇格/降格ゲート、scope 昇格降格、orphan_window、tuning_signals/θレビュー、id_seq/辞書解決ゲート、conflict authority、consolidation。
4. 人間ゲート(知識側): ①重要ノートの憲法/amendments への手動昇華、②/cycle 時の低 strength/陳腐ノートの目視 archive。自動なし。
5. 適用: core/knowledge.yaml・core/gates.yaml・tools/hyperhelix.mjs・core/loop.yaml・assets/checklists/{distill,framework-review}.md・constitution.md(統治の公理2)。theta-review.md / dictionary.yaml は deprecated 化。

### 期待効果

per-task 負荷の最小化(引く+±1一手)。全体再計算を要求しない。複雑さを価値の所在(規律・統治)へ寄せる。コード量大幅減。

### リスク

知識の自動格付け(普遍/ジャンル)を失う。緩和: 単一〜少数プロジェクト期は母数不足で機能せず不要。多プロジェクト適用時に新 HH で再導入可。
canon は人間層へ集約=二層モデルと整合。移行中の不整合。緩和: 指針どおり「動く最小版」を先に着地(branch feature/hh-016-notes-ledger)、磨きは次回。

### 裁可メモ

2026-06-15 人間裁可: **採用**(ユーザー指示「案Sを採用」)。実装は別ブランチ(`feature/hh-016-notes-ledger`)で用意し、
メインが静穏点で制御マージ(ユーザー指示「別ブランチで実装」)。並行する在flight タスクは新スキーマ/新ツールへ rebase が必要。
**繰越(次回)**: assets/checklists/evaluate.md・core/routing.yaml・assets/templates/task-brief.md・README/docs・(外側リポジトリ).claude/commands/cycle.md の文言整合。

## HH-015 — 同一ブランチ並行セッションの運用プロトコル

**Status:** Approved(2026-06-14 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-14
**種別:** 運用規約改定(git-conventions + knowledge.yaml ヘッダのカウンタ意味論)

### 観察(なにを観測したか)

2026-06-14、複数のオーケストレータセッションが同一ブランチ(main)で並行してタスクを実行した結果、
(1)`task_index` の二重加算(235→236 を両セッションが行い reconcile が必要)、(2)タスクID衝突(024/025 等の
取り合い)、(3)`core/knowledge.yaml` の頻繁な競合、(4)手動 3-way reconcile の多発、が発生した。
現行 git-conventions は HH-011 のクロスブランチモデルは定義するが、**同一ブランチ上の複数セッション**を
未定義で、Quick reference は `git add -A` を推奨しており、他セッションの未追跡 brief を巻き込む危険があった。

### 根拠

本セッションの実体験(TASK-022〜030 で task_index 競合・ID衝突・手動 reconcile が反復発生)。

### 提案(具体的な変更内容)

1. `assets/workflows/concurrency.md`(新設, AI層): 不変条件=「同じセルを絶対値で二重書きしない/共有状態は
   可換操作(sum/max/append)で更新」。タスクID claim 規則(非連続NNN許容・衝突時バンプ・他セッションbrief不可侵)。
   カウンタ別の reconcile 規則(累積=base+Σδ / 高水位=max / recent=append)。`git add -A` 排除の特定ファイルコミット規律。
   独立性(未コミット状態に依存しない)。単一writer操作(θレビュー/last_framework_review リセット)。
2. `assets/workflows/git-conventions.md`: 同一ブランチ並行の節を追加、Quick reference の `git add -A` を
   特定パス staging に改定。
3. `core/knowledge.yaml` ヘッダ: 並行時のカウンタ可換 reconcile 規則を明記(意味論の単一権威)。
4. 入口(CLAUDE.md/AGENTS.md)の参照資材に concurrency.md を追加。

### 期待効果

複数セッションがロック無しで並行してもループ・カウンタ・git が破綻しない。マージ順非依存。手動 reconcile の定型化。

### リスク

規律(特定ファイル staging・delta 記録)の不徹底。緩和: git-conventions と入口から参照し、brief の D7 に delta を記録。
任意の自動化(`hyperhelix.mjs reconcile`)は後続 SPEC とし、本改定は手動規則だけで安全性が成立するよう設計。

### 裁可メモ

2026-06-14 人間裁可: **採用**(直接指示「平行セッションでも…ループに支障が無いようにルールを改定して」)。TASK-20260614-030 で適用。

## HH-014 — 憲法 axiom5 の HH-004 状態記述の更新(陳腐化の解消)

**Status:** Approved(2026-06-14 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-14
**種別:** 憲法変更

### 観察(なにを観測したか)

/cycle(TASK-20260614-026)の R6 点検で、HH-004 の再開条件「hyperhelix 以外のプロジェクトを文脈とする
実タスクが1件完了」が既に充足済み(TASK-20260614-022/025、および variant の Project001 系)であることを確認。
状態の単一権威 `assets/checklists/framework-review.md` R6 は REACTIVATED へ更新し、`core/loop.yaml`
の `anti_self_purpose` は状態断定を除去して R6 に委譲済み。一方、`constitution.md` 統治の公理5の
括弧書きは依然「本項の『3回ルール』は停止中」と記述しており、事実と乖離している。

### 根拠

constitution.md 統治の公理5 括弧書き(「HH-004 による一時停止… 停止中… 自動再開し、再裁可は不要」)。
HH-004 は「再裁可は不要」と明記しており、再開自体は自動で成立済み。残るのは記述の陳腐化のみ。

### 提案(具体的な変更内容)

constitution.md 統治の公理5 の括弧書きを次の趣旨に修正する:
「HH-004: フレームワーク作成段階での一時停止は、非hyperhelix 実タスクの完了により自動再開済み
(2026-06-14)。3回ルールは現在有効。連続回数の記録は継続。**ライブ状態の単一権威は
framework-review.md R6**(本憲法は状態を断定しない)。」

### 期待効果

憲法・loop.yaml・framework-review.md の三者で状態の二重記述・矛盾を解消し、状態権威を R6 に一本化する。

### リスク

低(記述の事実整合のみ。挙動・ゲートは不変)。緩和: 文言修正に留め、3回ルール本体は変更しない。

### 裁可メモ

2026-06-14 人間裁可: **採用**(ユーザー指示「HH-014を許可する」)。TASK-20260614-027 で constitution.md に適用。

## HH-013 — 基幹ルール追加: 初回読込み時の実行可能構造の検証

**Status:** Approved(2026-06-14 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-14
**種別:** 憲法変更(環境制約の公理への項追加)

### 観察(なにを観測したか)

Project001 作業ディレクトリ(`E:\AIera\Project001(改)`)で `/helix` を実行したところ「Unknown command」となり、
コマンドが実行できなかった。原因は、`.claude/commands/` が未整備、かつ HyperHelix がネスト位置
(`doc/HyperHelix/`)にあるためコマンド内のパスが作業ディレクトリから解決できなかったこと。
初回読込み時にこの種の構造不整合を検知・是正する基幹ルールが存在しなかった。

### 根拠(カウンタ・タスクID等の証拠)

本セッション 2026-06-14 の実体験(/helix 実行不能 → `.claude/commands/{helix,cycle}.md` を
`doc/HyperHelix/` 起点に新設・修正して解消)。人間の直接指示。

### 提案(具体的な変更内容)

1. `constitution.md` 環境制約の公理に項を追加: AIは HyperHelix 初回読込み時、作業ディレクトリが
   フレームワークのコマンド(`/helix`・`/cycle`・`tools/hyperhelix.mjs`)を実行可能かを検証し、
   不能なら作業前に是正する。
2. 検証・是正の手順を AI 層資材 `assets/workflows/session-bootstrap.md` に新設(ルート特定・
   コマンド到達性・validator 実行・リポジトリ境界・是正手順)。
3. 入口ガイド `CLAUDE.md` / `AGENTS.md` に「0. 起動前検証」ポインタを追加(pointer-only を維持)。

### 期待効果

新規プロジェクト適用やネスト配置でのコマンド実行不能を初動で検知・自動是正でき、初回の取りこぼしを防ぐ。

### リスク

検証ステップの形骸化(空チェック)。緩和: session-bootstrap.md に観測可能な確認項目(コマンド到達・
validator 実行)を具体化。入口へのルール本体流入。緩和: 入口は pointer-only を厳守し手順は AI 層へ分離。

### 裁可メモ

2026-06-14 人間裁可: **採用**(直接指示「基幹ルールに追加」)。TASK-20260614-023 で適用。

---

## HH-012 — 委任範囲の拡張: survey / trial Work Order の新設

**Status:** Approved(2026-06-13 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-13
**種別:** 変種統治構造の変更(agent-roles.md — HH-011 創設規約の改訂)

### 観察(なにを観測したか)

コスト非対称の前提(オーケストレータ=高性能・高単価モデル、実行エージェント=安価モデル)では、現行の委任範囲「Execute の実装単位のみ」がトークン消費の実態と不一致。S2 の大量読み込み調査と EX-5 の試行反復は「トークン大量消費・統治判断不要」の仕事だが、現行規約ではオーケストレータ専管に積まれている。高単価モデルのトークンは計画(WO の質)と検証に集中投下するのが最適配分である。

### 根拠(カウンタ・タスクID等の証拠)

2026-06-13 の作業振り分け分析。過去ブリーフの実態(S2 調査・探索が作業量の主要部)。

### 提案(具体的な変更内容)

agent-roles.md §3 に WO 種別を導入する:

- **implementation WO**(現行どおり): Execute 実装単位。scope のファイルを編集可
- **survey WO**(新設): 読み取り専用の調査(S2 / spike 相当)。scope は読み取り対象の指定。ファイル編集は一切不可。成果物は「主張+出典(ファイル:行)」形式の調査レポート
- **trial WO**(新設): EX-5 の単一試行。仮説・試行内容・期待結果・チェックを WO に明記。編集規則は implementation WO と同一

§5 検証規則への追記: survey 結果はオーケストレータが出典をスポットチェックしてから S2 に採用(主張のみの行は不採用)。trial 結果は self_checks の生出力を必須とし、採用前にオーケストレータが再実行。

不変条件の明記: 共通規則(結果は再検証まで信頼しない / scope 違反は全体リジェクト / 統治=ゲート・カウンタ・蒸留・amendments・コミットはオーケストレータ専管)は変更しない。変わるのは委任の範囲であり、委任の信頼度ではない。

適用ファイル: assets/workflows/agent-roles.md(§3・§5)。

### 期待効果

高単価モデルのトークンが計画と検証に集中。調査・試行の並列化。EX-5 探索ループのコスト構造改善。

### リスク

調査レポートへの誤り(安価モデルの幻覚)混入。緩和: 出典必須+スポットチェックの契約化。試行ログの偽装・粉飾。緩和: 生出力必須+採用前再実行。委任の固定費が survey/trial では回収できない小タスクへの過剰委任。緩和: 委任は義務でなく選択肢(オーケストレータの裁量)と明記。

### 裁可メモ

2026-06-13 人間裁可: **採用**。TASK-20260613-005 で agent-roles.md §3・§5 に適用(WO に type フィールドを追加 — 種別の機械判別のための最小具体化、判断はブリーフ S3 に記録)。

---

## HH-011 — 変種創設: variant/claude-codex(オーケストレータ/実行エージェント分離)

**Status:** Approved(2026-06-13 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-13
**種別:** 変種創設(憲法変更級。ブランチ分離により main は不変)

### 観察(なにを観測したか)

人間指示(2026-06-13):「Claude をオーケストレータ、Codex を実行エージェントとして扱うルールを定義して。この変更はフレームワークの別バージョンとして別ブランチで管理すること」。現行フレームワークは単一エージェント前提で、委任時の編集権限境界・契約形式・検証責任が未定義。

### 根拠(カウンタ・タスクID等の証拠)

上記の人間指示そのもの(変種の創設はユーザー層の intent 判断)。

### 提案(具体的な変更内容)

1. ブランチ `variant/claude-codex` を別バージョンとして創設(main = 単一エージェント版、本ブランチ = オーケストレーション版)。
2. ロール定義: **オーケストレータ(Claude)** が全フェーズの統治(ゲート・ブリーフ・Search/Plan・Work Order 発行・Evaluate の全機械検証・Distill・カウンタ・amendments・コミット)を専管。**実行エージェント(Codex 等)** は Work Order 契約で委任された Execute 実装単位のみを担当。詳細は `assets/workflows/agent-roles.md`。
3. 既存2入口の機能分化: CLAUDE.md = オーケストレータ入口、AGENTS.md = 実行エージェント入口。
4. git-conventions を改訂: 単一ブランチ規則をブランチモデル(2系統・マージは受け側 HH 必須)に置換。
5. 5フェーズ・ゲート・人間窓口・θ は不変(ロールは工程内の分担であり工程を変えない)。

### 期待効果

実装の並列化・委任を、知識螺旋のカウンタ整合と証跡主義を壊さずに導入できる。main の安定性は維持。

### リスク

変種と main の乖離が無秩序に進む。緩和: マージは受け側ブランチでの HH 裁可を必須化。実行エージェントの結果の無検証取り込み。緩和: agent-roles.md で「再検証まで信頼しない」を規則化。

### 裁可メモ

2026-06-13 人間裁可: **採用**(/helix 指示による創設裁可)。TASK-20260613-003 で variant/claude-codex ブランチ上に適用。

---

## HH-010 — standard 深度への P2 追加(task-list スキーマとの整合)

**Status:** Approved(2026-06-13 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-13
**種別:** ループ定義変更(core/loop.yaml ヘッダにより amendment 級)

### 観察(なにを観測したか)

TASK-20260613-001 の task-list スキーマは `order` / `depends_on` を必須列としたが、standard の required_steps に P2(依存順序付け)が含まれないため、standard タスクはスキーマの必須列を正規工程なしで埋めることになる(001 が生んだ不整合)。この修正は 2026-06-13 のレビューで、ブリーフ・HH を持たない先行編集として作業ツリー上に発見された。

### 根拠(カウンタ・タスクID等の証拠)

assets/workflows/task-list-schema.md の必須列定義、core/loop.yaml depth_modes、2026-06-13 変更レビュー(手続き所見2件)。

### 提案(具体的な変更内容)

`depth_modes.standard.required_steps` に P2 を追加: `[S1, S2, S3, P1, P2, P3, P5, E1, E2, E3, V1, V2, D1, D3, D4, D7]`。

付記: 同じ作業ツリーにあったツール変更(provisional_at_observation の配線=TASK-20260612-011 が残したデッド設定の解消、task-list 検証の追加)は自動範囲のため本提案の裁可対象外とし、同タスク(TASK-20260613-002)で通常変更としてコミットする。

### 期待効果

スキーマと深度定義の整合。standard タスクの依存順序付けが正規工程になる。

### リスク

standard の工程が1つ増える(軽微 — 実行計画表の order/depends_on 列の記入で充足)。先行編集の正規化を認めることが「先に編集して後で HH」の前例にならないよう、AP-001 抵触の事実を本ログと TASK-20260613-002 の D2 に記録する。

### 裁可メモ

2026-06-13 人間裁可: **採用**(/helix 指示による起票前裁可)。TASK-20260613-002 で正規化・コミット。

---

## HH-007 — observation 鋳造時のタグ制約緩和(辞書ブートストラップの解消)

**Status:** Approved(2026-06-12 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-12
**種別:** θ変更(tagging 規則)

### 観察(なにを観測したか)

HyperHelix 生まれの10タスクで新規資材の鋳造が0件。毎回の D7 が「適合タグの語彙不足のため見送り」を記録している(id_seq は創設時から不変)。原因は構造的デッドロック: 資材のタグは辞書解決が必要(distill.md D7)だが、新規タグの辞書鋳造には資材3件への再現が必要(gates.tagging.new_tag_min_recurrence)— 資材が先に存在できないためタグが再現せず、タグがないため資材を鋳造できない。その間、実際の教訓は検索インデックスのないブリーフ(追記専用)に堆積し、知識螺旋の入力が空転している。

### 根拠(カウンタ・タスクID等の証拠)

TASK-20260612-001/004/006/009 ほかの D7 記録(鋳造見送り)。counters.id_seq が HH-000 以来不変(RETRY:2 / IMPL:2 / SEARCH:45 / LOOP:2)。

### 提案(具体的な変更内容)

observation 鋳造時に限り、辞書未登録タグを**暫定タグ**として許可する。

- gates.tagging に `provisional_at_observation: true` を追加し、規則を注記: 暫定タグは validator で warn(現行挙動のまま)、同一暫定タグが `new_tag_min_recurrence` 件の資材に再現した時点で辞書へ鋳造(現行規則をそのまま適用)。
- pattern → principle の `require_broader_tag_mapping` は不変(昇格には辞書解決が必要 — 昇格時の品質ゲートは維持)。
- 適用ファイル: core/gates.yaml(tagging)、assets/checklists/distill.md(D7 の「tags resolve」行)、core/dictionary.yaml(MINTING 注記)。

### 期待効果

鋳造デッドロックの解消。教訓がブリーフでなく知識ストアに入り、整数ゲートの選抜が初めて実データで機能する。

### リスク

暫定タグの乱立。緩和: 暫定は observation 限定で昇格には辞書解決が必須、θレビューの retrieved_unused が死蔵資材(と死にタグ)を検出する。

### 裁可メモ

2026-06-12 人間裁可: **採用**。TASK-20260612-011 で gates.yaml / distill.md / dictionary.yaml に適用。

---

## HH-008 — 成果指標を θ レビュー信号に追加

**Status:** Approved(2026-06-12 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-12
**種別:** θ変更(tuning.signals の拡張+記録基盤)

### 観察(なにを観測したか)

現行5信号はすべてコーパス運用の内部統計(自己参照)であり、「フレームワークが成果を改善しているか」を測る外部指標が存在しない。初回θレビュー(task 200)は信号がほぼ全て0または継承由来で、判定材料が実質なかった。11タスク全Pの recent 文字列はすべて自己採点である。

### 根拠(カウンタ・タスクID等の証拠)

TASK-20260612-008 D7 の tuning-report 記録(全信号 0)。全ブリーフの V2 表。

### 提案(具体的な変更内容)

gates.tuning.signals に成果系3信号を追加し、counters.tuning_signals に記録欄を新設する(AP-003 に従い消費側も同一変更で配線):

- `evaluate_fail_count` — V2 結果表の Fail 件数(バッチ累計)
- `execute_returns` — V2 Fail による Execute/Plan への差し戻し回数
- `external_artifact_tasks` — project ≠ hyperhelix のタスク数(自己目的化の定量化。R6 再開後の監視面)

適用ファイル: core/gates.yaml(tuning.signals)、core/knowledge.yaml(counters.tuning_signals+ヘッダ)、tools/hyperhelix.mjs(tuning-report 出力)、assets/workflows/theta-review.md(計算表・判定指針)、assets/templates/task-brief.md(D7 記録行)。

### 期待効果

θレビューが「成果を出しているか」を初めて問える。external_artifact_tasks=0 の継続が R6 停止中の自己目的化を定量的に可視化する。

### リスク

Fail を記録すると Fail を避ける誘因(Goodhart の再生産)。緩和: theta-review 判定指針に「Fail は正常な信号であり、Fail 0 の長期継続はむしろ検証不足のシグナルとして扱う」を明記する。

### 裁可メモ

2026-06-12 人間裁可: **採用**。TASK-20260612-011 で gates.yaml / knowledge.yaml / hyperhelix.mjs / theta-review.md に適用(テンプレ D7 行は権威参照型のため編集不要 — 逸脱理由はブリーフ S2 に記録)。

---

## HH-009 — 「適用(seen)」の定義の厳格化(反証可能性の回復)

**Status:** Approved(2026-06-12 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-12
**種別:** θ変更(カウンタ意味規則)

### 観察(なにを観測したか)

PRINCIPLE.IMPL.001 が seen 41・全P で axiom_candidate に滞在しているが、適用先の大半が「全体方針」で反証不能。機械チェックが失敗しても方針レベルの資材には失敗を帰属できないため、fail+1 が構造的に効かず、昇格ゲートが「曖昧で毎回引用される資材」を選好する(Goodhart)。具体的で反証可能な知見ほど F を負って昇格しにくい逆選抜が起きる。

### 根拠(カウンタ・タスクID等の証拠)

全ブリーフの S2 表(「全体方針」適用が9件)。IMPL.001 の fail=0 は品質でなく反証不能性の帰結。

### 提案(具体的な変更内容)

core/knowledge.yaml ヘッダの seen 規則に追記: 「**APPLIED は、機械チェック(test / lint / run / validate)を持つ具体的成果物への適用に限る。タスク全体・方針への適用は retrieval として扱う**」。

- 適用ファイル: core/knowledge.yaml(ヘッダ)、assets/templates/task-brief.md(S2 表の凡例)、assets/checklists/evaluate.md(失敗帰属)。
- 遡及なし: 既存カウンタは修正しない(min_seen は累積値のため IMPL.001 の tier は維持される)。新規則下で適用が止まれば last_used が停滞し、orphan_window(200)経由で自然退役する — これは意図された矯正である。

### 期待効果

seen が反証可能な適用だけを数え、recent の P/F が実際の検証結果と連動する。曖昧資材は retrieved_unused に蓄積し θレビューが検出する。

### リスク

真に有効な広域原則が過小評価される。緩和: 広域原則は constitution / loop.yaml 等のルール層に昇華する経路(amendments)が既にあり、知識ストアは反証可能な知見に特化する方が二層の役割分担として一貫する。

### 裁可メモ

2026-06-12 人間裁可: **採用**。TASK-20260612-011 で knowledge.yaml ヘッダ / テンプレ S2 凡例 / evaluate.md に適用。同タスクの D7 から新規則で計上。

---

## HH-005 — framework-change の深度判定の精緻化

**Status:** Approved(2026-06-12 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-12
**種別:** ループ定義変更(core/loop.yaml ヘッダにより amendment 級)

### 観察(なにを観測したか)

`depth_modes.full.use_when` の `framework-change` が一律 full を要求するため、裁可済み変更の適用や注記追加のような軽量タスク(例: TASK-20260612-002 は実質5ファイルへの注記追加)にも全工程+150行級ブリーフが課される(点検 3-1/5-1)。直近4タスクの作業量の過半がブリーフ記入で、運用負荷の主因。

### 根拠(カウンタ・タスクID等の証拠)

tasks/TASK-20260611-001〜TASK-20260612-004(いずれも full)。2026-06-12 点検の 3-1(過剰設計・中)・5-1(運用負荷・中)。

### 提案(具体的な変更内容)

`depth_modes.full.use_when` の `framework-change` を `framework-structural-change`(フェーズ構造・ゲート規則・公理・スキーマに触れる変更)に限定し、`depth_modes.standard.use_when` に `framework-application-change`(裁可済み変更の適用・注記・参照配線・カウンタ更新のみの変更)を追加する。

### 期待効果

軽量フレームワークタスクのブリーフ負荷が約半減。full は構造変更に集中し、証跡の密度が必要箇所に揃う。

### リスク

「適用のみ」のつもりが構造に波及する誤分類。緩和: light と同様に判定理由のブリーフ記録を必須とし、誤分類は D2 で蒸留。

### 裁可メモ

2026-06-12 人間裁可: **採用**。TASK-20260612-006 で loop.yaml depth_modes に適用(同タスク自身は depth_modes に触れるため新基準でも full)。

---

## HH-006 — standard 深度への D2/D6 の条件付き追加

**Status:** Approved(2026-06-12 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-12
**種別:** ループ定義変更(core/loop.yaml ヘッダにより amendment 級)

### 観察(なにを観測したか)

standard の required_steps は D1/D3/D4/D7 のみで、D2(失敗要因の抽出)と D6(アンチパターン登録)を含まない。一方 light(EX-4)は D2/D3/D5/D6 のトリアージを要求しており、**標準タスクの方が時間切れタスクより失敗の蒸留が薄い**逆転がある(点検 1-1)。standard タスクで検証が失敗しても、その失敗要因は公式工程上どこにも蒸留されない。

### 根拠(カウンタ・タスクID等の証拠)

core/loop.yaml depth_modes.standard.required_steps と assets/workflows/exception-handling.md EX-4 表の対比。2026-06-12 点検の 1-1(不整合・中)。

### 提案(具体的な変更内容)

standard の required_steps に条件付き工程を追加: 「D2・D6 は、Evaluate で Fail が1件でも発生した場合、または確定失敗事例がある場合に必須」。常時必須にはしない(失敗ゼロのタスクに空欄 D2 を強制しない — 証跡主義との整合)。

### 期待効果

standard タスクの失敗が確実に蒸留パイプラインへ入る。light との逆転解消。

### リスク

「Fail 発生」の判定揺れ。緩和: V2 の結果表(Pass/Fail/Skip)を判定基準として明記。

### 裁可メモ

2026-06-12 人間裁可: **採用**。TASK-20260612-006 で loop.yaml depth_modes.standard に conditional_steps として適用。

---

## HH-004 — R6 自己目的化チェック(3回ルール)の一時停止

**Status:** Approved(2026-06-12 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-12
**種別:** 憲法変更(統治の公理5の一時停止)

### 観察(なにを観測したか)

HyperHelix は作成段階にあり、適用先の固有プロジェクトが存在しない。統治の公理5の「フレームワークのみのサイクルが3回続いたら、次は実タスクを優先する」は、実タスクが存在し得ない現段階では強制不能であり、フレームワーク整備を不当にブロックする(TASK-20260612-001 完了時点でフレームワークのみ2回連続、残り1サイクル)。

### 根拠(カウンタ・タスクID等の証拠)

人間指示(2026-06-12):「現在、固有プロジェクトに適用していない。フレームワークの作成段階のため R6 自己目的化チェックを一時的にオフにする」。TASK-20260611-001 / TASK-20260612-001 の R6 メタ記録。

### 提案(具体的な変更内容)

3回ルールを**一時停止**する(削除しない)。

- 停止対象: 「3回連続→次は実タスク必須」の強制のみ。公理の趣旨(改善サイクルは成果物を作るために存在する)と、連続フレームワークのみサイクル数の記録は維持する。
- 再開条件: **project ≠ hyperhelix の文脈を持つ実タスクが1件完了した時点で自動再開**。原ルールの復元であるため再裁可は不要。
- 適用箇所: constitution.md 統治の公理5(注記)、core/loop.yaml `meta_strand.anti_self_purpose`(SUSPENDED 化・原文保持)、assets/checklists/framework-review.md R6(停止中仕様)、.claude/commands/cycle.md 手順7(ルール本体記述をポインタ化)。

### 期待効果

作成段階のフレームワーク整備が3回ルールにブロックされない。停止状態・再開条件が全記述箇所で一致し、監査可能。

### リスク

自己目的化リスクそのものは残存する(改善活動が成果物につながらないまま続く可能性)。緩和策: 趣旨の原則文と記録義務を維持し、再開を機械的条件(最初の実タスク完了)に紐付けて恒久化を防ぐ。

### 裁可メモ

2026-06-12 人間裁可: **採用**(指示による直接裁可)。TASK-20260612-002 で適用。

---

## HH-001 — tier 降格セマンティクスの一本化

**Status:** Approved(2026-06-12 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-12
**種別:** θ変更

### 観察(なにを観測したか)

`core/gates.yaml` の `demotion.max_fail_in_window: 3`(窓内失敗が3を**超過**したら**1段**降格)に対し、`tools/hyperhelix.mjs` の `recomputeMaterial` は降格処理を持たず、昇格ゲートのみから tier を毎回再計算する。実効挙動は「pattern は窓内F≥3、principle は F≥2、axiom_candidate は F≥1 で降格し、複数段を一気に降格しうる」であり、裁可済み θ の字義と一致しない。`max_fail_in_window` はツール内でパースされるが参照されないデッド設定になっている。

### 根拠(カウンタ・タスクID等の証拠)

TASK-20260611-001(フレームワークレビュー)。一時コピー上で PATTERN.RETRY.001 の recent を "PPPPPPPFFF"(窓内F=3、仕様上は降格なし)に設定したところ、`recompute --check` は observation への複数段降格を出力した(再現可能)。

### 提案(具体的な変更内容)

**案B(推奨):** 再計算モデルを正とする。`demotion.max_fail_in_window` を削除し、demotion セクションに「tier は昇格ゲートの再計算で決まる(実効降格閾値 = 各昇格ゲートの max_fail)」と明記する。ツール変更なし。メモリレス(整数カウントからの純関数)で統治の公理1と整合する。

**案A:** 仕様を正とする。ツールに履歴依存の1段降格(窓内F>3 のとき直前 tier から1段のみ)を実装する。直前 tier の状態保持が必要になり、純関数性を失う。

### 期待効果

仕様と実装の一致。降格条件が監査可能になり、validate / recompute の出力を信頼できる。

### リスク

案B: 裁可済み θ(AM-001〜009 系譜)より降格が厳しくなる方向の追認(高 tier ほど窓内失敗に敏感)。案A: ツールの複雑化と状態フィールドの追加。

### 裁可メモ

2026-06-12 人間裁可: **案B を採用**(再計算モデルを正とし `max_fail_in_window` を削除)。TASK-20260612-001 で gates.yaml の demotion セクション改訂とツールの死んだパース削除を適用。

---

## HH-002 — layer_active_cap の実装または削除

**Status:** Approved(2026-06-12 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-12
**種別:** θ変更(未実装設定の整理)

### 観察(なにを観測したか)

`core/gates.yaml` の `demotion.layer_active_cap`(universal 64 / genre 96 / project 128、超過時は最小 seen を archived へ退避)は `tools/hyperhelix.mjs` でパースされるのみで、recompute / validate のどちらからも参照されない。退避も警告も発生しないデッド設定。

### 根拠(カウンタ・タスクID等の証拠)

TASK-20260611-001。hyperhelix.mjs 内で `layerActiveCap` の使用箇所ゼロ(parseGates での定義のみ)を確認。

### 提案(具体的な変更内容)

**案B(推奨):** 設定を削除する。アクティブ集合の有界性は `search.max_context_materials: 12`(タスク毎ロードの上限)と `orphan_window: 200`(未使用資材の退避)で実質担保されており、「原則が要求する以上に部品を増やさない」(docs/設計書.md §1)に従う。必要になった時点で再裁可する。

**案A:** recompute に層別アクティブ数の集計と超過時退避(最小 seen → archived)を実装する。

### 期待効果

宣言と実装の一致。フレームワークレビュー R3(機械的整合)の信頼回復。

### リスク

案B: ストア肥大時の上限装置を失う(検索上限があるため実害は限定的)。案A: 「最小 seen」基準の退避が鋳造直後の新資材を巻き込む可能性。

### 裁可メモ

2026-06-12 人間裁可: **案B を採用**(削除)。TASK-20260612-001 で gates.yaml から `layer_active_cap` を削除、ツールの死んだパースも削除。必要が再発したら新たな HH 提案で再裁可する。

---

## HH-003 — HH-000 の記載訂正(継承資材数)

**Status:** Approved(2026-06-12 人間裁可)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-12
**種別:** 憲法変更(裁可済みログの事実訂正)

### 観察(なにを観測したか)

HH-000 第2項に「`core/knowledge.yaml` の資材4件と全カウンタ(task_index=191)は Helix_Reflex の運用履歴を継承した」とあるが、実際の継承は3件(PATTERN.RETRY.001 / PRINCIPLE.IMPL.001 / OBSERVATION.SEARCH.044)であり、OBSERVATION.LOOP.001 は HyperHelix 生まれの種資材である。knowledge.yaml の FOUNDING CORPUS 注記および docs/設計書.md D-06 と不整合。

### 根拠(カウンタ・タスクID等の証拠)

core/knowledge.yaml ヘッダ(「plus one HyperHelix-born seed (OBSERVATION.LOOP.001)」)、docs/設計書.md D-06(「資材3件とカウンタを逐語継承し、…1件追加」)。

### 提案(具体的な変更内容)

HH-000 第2項を「`core/knowledge.yaml` の資材3件と全カウンタ(task_index=191)は Helix_Reflex の運用履歴を継承し、HyperHelix 生まれの種資材1件(OBSERVATION.LOOP.001)を加えた」に訂正する。

### 期待効果

裁可ログと設計記録の一致(監査証跡の正確性)。

### リスク

なし(事実訂正のみ。裁可済みログの修正のため人間ゲートを通す)。

### 裁可メモ

2026-06-12 人間裁可: **採用**。TASK-20260612-001 で HH-000 第2項を訂正し、訂正の事実を HH-000 の裁可メモに注記。

---

## HH-000 — HyperHelix 創設裁可

**Status:** Approved(2026-06-11 フレームワーク制作指示による)
**ratified_by:** COCOQ-gh
**ratified_at:** 2026-06-11
**種別:** 憲法変更(創設)

### 内容

3つの先行フレームワークを統合し HyperHelix を創設した。

1. **5フェーズループの採択** — MetaHelix の4フェーズ(S/P/E/D)に Helix_Reflex の Evaluate を明示フェーズとして加え、HelixPDCA の P0〜P8 は Plan の工程(P1〜P5)に、C1〜C4 は Evaluate に、A1〜A5 は Distill に畳み込んだ。
2. **θ と知識コーパスの継承** — `core/gates.yaml` の全閾値は Helix_Reflex thresholds.yaml v1(AM-001〜AM-009 裁可済み)を、`core/knowledge.yaml` の資材3件と全カウンタ(task_index=191)は Helix_Reflex の運用履歴を継承し、HyperHelix 生まれの種資材1件(OBSERVATION.LOOP.001)を加えた。(HH-003 により訂正 2026-06-12)
3. **人間ゲートの単一窓口化** — HelixPDCA の supplement.md と MetaHelix の improvement-log の昇格機能を本ファイル(amendments.md)に一本化した。
4. **AM-ENV の改訂** — `.claude/commands/` を「薄い起動コマンド専用(ルール本体禁止)」として許可した(HelixPDCA・MetaHelix のスラッシュコマンド運用実績を採用)。エントリポイント(AGENTS.md / CLAUDE.md)のポインタ専用則は維持。
5. **メタループの畳み込み** — フレームワーク自身の改善は {project: hyperhelix, genre: framework} を文脈とする通常資材として同一パイプラインに流す(Helix_Reflex 方式)。MetaHelix のレビュートリガーと自己目的化防止則は憲法に継承。

### 裁可メモ

創設時の設計判断の全記録は `docs/設計書.md` を参照。個別判断への異議は新たな HH 提案として起票できる。
第2項の継承資材数は HH-003(2026-06-12 裁可)により訂正された(4件 → 3件継承+種資材1件)。
