# amendments.md — 人間承認の単一窓口

<!-- GENERATED VIEW (SC-04 / HH-067): 構造化正本は governance/amendments/(registry.yaml + bodies/ + view-template.md)。編集はそちらへ行い `node tools/hyperhelix.mjs amendments-doc` で再生成する。本ファイルの手編集は GOV_VIEW_DRIFT で fail する。 -->

HyperHelix における高影響変更の承認待ち・承認済みログ。ユーザー層資材(通信言語=日本語)。
人間はオンデマンドで裁可する。pending は溜めてよい。
本ファイルは構造化正本 `governance/amendments/`(registry + HH 別本文)から生成される view である(HH-067)。
lifecycle state(Status・attestation・supersedes)の正本は `governance/amendments/registry.yaml`。

## 索引(全 HH 一覧 — HH-024)

読み込み順ではこの索引だけを読み、関係する HH の本文だけにドリルダウンする(本文は必読でない)。
この表は registry から生成される。新規 HH は `governance/amendments/registry.yaml` へ1エントリと
`governance/amendments/bodies/HH-NNN.md` を追加して起票する(`validate` が registry・本文・view の整合を検査する)。

{{INDEX_TABLE}}

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

### R7d(分割: frame / ROI)+ 外部価値ゲート 状態
- **現行(HH-056 で分割)**: R7d は2つに分かれた。
  - **R7d-frame(敵対的類推/鐙検出)**: `main` **ACTIVE**(唯一止めない反フレーム固着レンズ)。(a)競合フレーム/(b)より単純な別設計/(c)欠く性質/(d)外部ツール置換 を fixed-form で問い、簡素化候補を1つ挙げる。**別モデルのエージェントへの委託を推奨**(agent-roles)。
  - **R7d-ROI(自己参照/ROI)**: 外部価値ゲート(R7c)へ委譲。`main` **STOPPED**、`project/variant` ACTIVE。
- **外部価値ゲート**: `main` STOPPED(measurement のみ・R4 マークなし)、`project/variant` ACTIVE。
- 単一権威: framework-review R7d-frame / R7d-ROI / R7c。gates: `external_value_gate`。
- 系譜: HH-038(R7d 丸ごと STOPPED)→ HH-048(外部価値ゲート)→ HH-052(main 例外)→ **HH-056(R7d 分割・frame を main 再活性化・別モデル委託推奨)**。

### ノート ID 規約(knowledge.yaml)
- **現行**: 新規ノートは全ブランチで生成時に恒久 ID `N-<branch由来slug>-<YYYYMMDD><連番英字>` を得る(例 `N-era-20260716a`)。slugは可逆`zHH` byte escape。還元時の採番・`adopt-notes`・`[[参照]]`置換は行わず、`adopt-notes`はno-op互換alias。既存`N-NNN`はlegacyとして有効、deprecated provisionalはmainでerror。FI-01/02でcontract/parser/consumer移行を完了。
- 単一権威: `core/knowledge.yaml` ヘッダ + `assets/workflows/concurrency.md`。機械可読な正本への移行は HH-066/FI-01。
- 系譜: HH-016(ノート台帳)→ HH-057(counters 導出化)→ HH-061(仮採番)→ **HH-064(生成時恒久 ID へ置換)**。

### タスク ID / HH 番号の衝突対策
- **現行**: 新規task IDは`TASK-<encoded-branch-slug>-<YYYYMMDD>-<NNN>`、legacy task IDは据え置きread compatibility。HH番号は序数を維持し、`next-hh-id`がlocal+`origin/main` maxを突合する。fetch/show失敗はnonzero、明示`--offline`のみlocal fallback。push競合時はfootprintの小さい側を同一transactionで再採番する。FI-03で実装。
- 単一権威: `core/contracts.json` の machine-readable contract + `assets/workflows/concurrency.md` / task brief workflow。
- 系譜: HH-058(同一ブランチの claim/path 衝突回避)→ HH-064(note ID 恒久化)→ **HH-065(task ID 横展開 + HH 突合)**。

### main PR / hosting enforcement
- **現行**: private/free運用を有効とし、branch protectionは必須でなく任意ハードニング。`/sync`・`reflux`はvalidate後にPRを作成してCI checksを待つ。統治pathは同一publisherを許可し、CODEOWNER Approveなしで人間手動merge待ち、非統治pathはchecks後に自己mergeできる。direct-main/force-push/rebase/admin-bypass禁止はサーバー強制ではなくtool+humanのhonor-based契約。
- 単一権威: `constitution.md` 統治の公理2 + `assets/workflows/git-conventions.md` Repository/History protection + `assets/workflows/branch-protection-runbook.md`。
- 系譜: HH-046(honor-based自認)→ HH-060(branch protectionで外部強制)→ HH-069(CODEOWNER必須承認を撤回)→ **HH-070(branch protection必須も撤回)**。

### 構造化正本の権威境界(SC-00)
- **現行(実装完了)**: 実行事実は構造化正本、文章は intent/理由/生成 view。governance/ は amendments の付属構造化正本(registry + HH 別本文)で、amendments.md は registry からの生成 view。外部 dependency は yaml + Ajv の2件限定。SC-01〜08 は完了し、epoch は task / governance = `semantic-parity-confirmed`、knowledge = `legacy-adapter-removed`。
- 単一権威: `core/contracts.json` の `structures.epochs`、governance registry、生成 view の byte 一致検査。移行経緯と完了証跡は `docs/structured-canon-migration-plan.md`。
- 系譜: HH-046(honor-based 自認)→ HH-060(外部職務分離)→ HH-066(契約変更ゲート)→ **HH-067(権威境界の構造化)**。

### 契約変更ゲート / framework 検証範囲
- **現行(実装済み)**: 識別子、固定語彙、CLI、anchor、role/review、schema semantics、HH lifecycle の変更は Contract Change Gate 対象。task brief の contract impact と R1-R3 evidence を `finish`/CI が changed framework path と突合する。完了主張は L1 structure / L2 contract / L3 behavior / L4 review evidence の全層成功時だけ行う。
- **現行の構造不変条件**: `## 承認待ち(Pending)` と `## 承認済みログ` は lifecycle consumer の固定 anchor。Pending が0件でも両ヘッダを常設し、ヘッダ欠落は fail-closed 検査(RT-18)で拒否する。
- 単一権威: `core/contracts.json` の machine-readable contract + brief anchors + `finish`/CI。導入経緯は TASK-20260717-002 FI-01/FI-05/FI-06。
- 系譜: HH-028(検出器の陽性test)→ HH-039(capability追加のconsumer配線)→ **HH-066(既存契約変更へ拡張し完了経路へ接続)**。

## 人間ゲートの対象

対象の単一権威は `constitution.md`・統治の公理2。
ノートの追加・strength 更新・アーカイブはすべて自動（人間ゲート不要）。
「軽量な知識操作は自動、影響の大きい変更だけ人間が終端する」が一貫した線引きである。
裁可時、現行ルールに影響する HH は上の「現行ルール digest」も同一裁可で更新する(HH-049 の規律・AP-003)。

## 提案フォーマット

新規起票前に`node tools/hyperhelix.mjs next-hh-id`を実行し、localと`origin/main`のmaxを突合する。
fetch/show失敗時は起票を止める。remoteを参照できないことを操作者が明示的に受容する場合だけ`--offline`を使う。
push競合で同番号が先取された場合はfootprintの小さい側を再採番し、registry/body/digest/xrefを同一transactionで更新する。

起票の手順(SC-04 / HH-067): `governance/amendments/registry.yaml` へ `status: Pending`・
`ratified_by: null`・`ratified_at: null` のエントリを追加し、`governance/amendments/bodies/HH-NNN.md` に
下記フォーマットで本文を書き、`node tools/hyperhelix.mjs amendments-doc` で本ファイルを再生成する。
裁可時は registry の `status`/`ratified_by`/`ratified_at` を更新して再生成する(本文の Status 行は
歴史記録であり、実行 state は registry のみが持つ)。

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

{{PENDING_BODIES}}

## 承認済みログ(新しい裁可が上、創設 HH-000 が末尾)

{{APPROVED_BODIES}}
