# HH-081(選択肢 B)設計 spike — 結果

- 日付: 2026-10-02 / task: TASK-main-20261002-007(spike: 成果物は本書のみ。コード・資材変更なし)
- 対象: `governance/amendments/bodies/HH-081.md`「裁可(2026-10-02)」の採用範囲 B
- 計測方法: 関数範囲は top-level 宣言境界、行数は `wc -l` / `rg -c` の実測。見積りは「(見積り)」と明記

## 1. 結論(先に)

1. **置換面は実在する** — 削除可能(R)1,285 行 + 移行要(M)459 行 = 1,744 行(HH-081 本文の見積り 1,722 行とほぼ一致)。
   テスト 25 件(458 行)が R、14 件が M。
2. **ただし削減の成否はホストプロジェクトの扱いで決まる。** 同じ `tools/` が `/sync` でホスト(Project001 等・remote 無し)へ
   配布されるため、**ホストがローカル記録を使い続ける限り R の 1,285 行は 1 行も消せない**。その場合 framework repo
   だけ GitHub 経路が増え、HH-081 が禁じた二重管理になる。
3. ∴ **B を実際の削減につなげるには、ホストを含む「記録の置き場を 1 つのモデルに統一する」判断が要る**。
   これは HH-081 裁可時の「ホスト側タスクは対象外」の範囲を超えるため、**人間の判断事項**(§4 判断 H1)。

## 2. 実測した置換面

| 区分 | 行数 | 主な内容 |
|---|---|---|
| R(削除可) | 1,285 | `brief`(200)・`render-brief`(57)・archive 群(147+14)・`--update-brief`(64)・claim sidecar/`--sid`(34)・`validateTaskRecords`/`validateTaskLists`・`task-record.mjs` 374・`task-artifacts.mjs` 69・`migration.mjs` task domain 82 |
| M(移行) | 459 | `framework-evidence.mjs` 230(PR 本文検査にそのまま使える)・L4 evidence・`NOTE_ATTRIBUTION`・`NOTE_MOVE_MATERIALIZED`・`DISTILL_CAPTURE` |
| K(維持) | 1,100 | verify 本体・finish(verify→秘密スキャン→bump→commit)・bump のカウンタ/`--use`/`--miss`・review-only・PR 配管(gh) |
| 新規 adapter/CI | 150-300(見積り) | PR/コミット本文の YAML ブロック parser + CI チェック |

- データ: `tasks/` 13,377 行(record 80 件 10,244 行・Markdown 12 件・INDEX.md 453 行)。
  **record の namespace 内訳 = main 39 / Project001 35 / Project003-lab-h 4 / Project005 1** — ホストの記録が既に main へ流入しており、
  git-conventions「No project task records … belong on main」と矛盾している(既存の不整合)。
- 資材の参照: 40 ファイル・301 行(`docs/` 除くと 32 ファイル・189 行)。
- カウンタは task ID にほぼ依存しない(依存は `last_bump_task` の冪等キーのみ)。

## 3. 既存バリデータの移行可否

| コード | 移行後 | 備考 |
|---|---|---|
| `TASK_RECORD` | 本文 YAML ブロックの schema 検査へ縮小 | 大半が消える |
| `NOTE_ATTRIBUTION` | 差分ベースへ(**現行より強い**) | 「最新 artifact」でなく当該変更の ledger 差分と照合 |
| `NOTE_MOVE_MATERIALIZED` | 本文の宣言 ID が head の台帳に実在するか | そのまま移せる |
| `DISTILL_CAPTURE` | 差分に新規 note/AP/backlog 行があるか | **v2 で発火しない既知バグ(backlog high)が設計ごと解消** |
| `ARCHIVE_INDEX` | 不要 | |
| L4 evidence | CI で本文を読む | PR 本文なら workflow に `edited` trigger が必要。pre-push では本文が無い |

## 4. 設計判断(人間判断 2 件 + 推奨で進める 6 件)

### 人間の判断が必要

**H1. ホストプロジェクトの記録をどうするか(HH-081 の範囲拡張)**

| 案 | 削減 | ホストへの影響 |
|---|---|---|
| (a) ホストはローカル記録を維持 | ほぼ 0 行(コードを残すため) | なし。ただし二重管理が増える |
| **(b) 全 repo で「記録は変更が着地する場所に置く」に統一** | R 1,285 行 | ホストの記録が `tasks/records/*.yaml` からコミット本文へ移る(HH-047 micro 形式の一般化) |

推奨: **(b)**。(a) は「規模だけ動かす」形になり、8/26 に C(保留)を選んだ理由そのものに当たる。

**H2. 記録の置き場所 — PR 本文か、コミット本文か**

| 案 | 長所 | 短所 |
|---|---|---|
| (a) PR 本文(B の文言どおり) | GitHub 上で読みやすい | ホスト(remote 無し)では使えず、結局 2 方式になる。pre-push で L4 を検査できない。本文修正で CI を再実行するには `edited` trigger が要る。1 タスク = 1 PR に寄せると CI 待ちと手動マージの回数がタスク数に比例する(2026-10-02 は 5 タスクを 1 PR に束ねた) |
| **(b) コミット本文の YAML ブロック(ID の採番と claim だけ GitHub Issue)** | **全 repo で 1 方式**(ホストもそのまま使える)・オフライン可・pre-push で L4 を検査できる・PR は複数タスクを束ねてよい(手動マージ回数が増えない) | 記録が「GitHub の Issue/PR」ではなく「GitHub に push される git 履歴」になる = B の文言からの解釈変更 |

推奨: **(b)**。B の目的(ローカル制御面の縮小)を、ホストを含めて 1 方式で達成できる唯一の形。
ただし **B の文言「Issue/PR を記録に」からの解釈変更**になるため、HH-081 本文への追記(裁可者による確認)を要する。

### 推奨で進める(H1/H2 が推奨どおりなら)

| ID | 判断 | 推奨 |
|---|---|---|
| D3 | task ID | framework repo は Issue 番号(`GH-<n>`)を `parseTaskId` に追加。ホストは現行形式のまま(採番は git log 走査のみ — 約 25 行に縮小、見積り) |
| D4 | bump の実行場所 | 現状どおり作業ブランチ内(HH-057 high-water を維持) |
| D5 | L4 の実行場所 | コミット本文方式なら pre-push と CI の両方で同じ検査(現行と同等以上) |
| D6 | 既存データ | 最後に `archive-briefs` を 1 回実行し、`tasks/INDEX.md` を静的な履歴として凍結・関連バリデータを撤去。Issue への移入はしない |
| D7 | 帰属検査 | CI の差分ベースへ(warn のまま) |
| D8 | ホスト記録の還元 | `reflux`/`sync` で `tasks/` を除外。main に流入済みのホスト記録 35+5 件は D6 の凍結に含める |

## 5. 段階的移行案(H1=b, H2=b の場合)

各段階は独立にマージでき、途中で止めても壊れない順序にする。

1. **本文 YAML ブロックの parser + CI/pre-push 検査を追加**(M の 459 行を移植。旧経路と並走)。
2. **`finish` が記録をコミット本文へ書く**ように変更(`tasks/records` への書き込みを停止)。`GH-<n>` ID を受理。
3. **既存データの凍結**(D6・D8)— 最終 archive → INDEX 凍結 → `reflux`/`sync` の `tasks/` 除外。
4. **R の削除**(brief / render-brief / archive 群 / claim / task-record.mjs 等)と資材 32 ファイルの参照更新。
5. **計測** — `cost-report` で CLI 到達面と標準タスクの儀式コストを再計測し、本書の見積りと比較する。

## 6. 残るリスク

- 強制力は増えない(honor-based のまま)。本移行は**規模の削減**であって信頼境界の獲得ではない(HH-081 本文どおり)。
- コミット本文の記録は長くなる(現行 record は平均 129 行)。記録の項目自体の削減を段階 2 で同時に行う必要がある。
- ホスト側の運用変更(Project001 等)は、ホストのセッションで `/sync` を受けたときに初めて効く。移行期間中はホストに旧版ツールが残る。

## 7. 実施結果(段階 1-4 完了 — 2026-10-02 実測)

移行前 = `5ad6d7c`(PR #25 マージ直後・段階 1 着手前)との比較。

| 対象 | 移行前 | 移行後 | 差 |
|---|---|---|---|
| CLI 到達面(cost-report) | 20 files / 7,595 行 / 関数 293 | 18 files / 6,272 行 / 関数 241 | **−1,323 行 / −52 関数** |
| `tools/hyperhelix.mjs` | 4,033 行 | 3,358 行 | −675 行 |
| `tasks/` | 96 ファイル / 13,534 行 | 4 ファイル / 746 行(凍結 INDEX 等) | −12,788 行 |
| テンプレート(`assets/templates/`) | 2 | 0 | −2 |
| validate の検査コード | TASK_LIST / ANCHOR / TASK_RECORD / ARCHIVE_INDEX / NOTE_ATTRIBUTION / NOTE_MOVE_MATERIALIZED / FRAMEWORK_EVIDENCE_TEMPLATE を撤去 | 意図は hh-record の検査(finish・verify)へ統合 | −7 |

- 見積り(R 1,285 / M 459)に対し、CLI 到達面の純減は 1,323 行(新設の `commit-record.mjs` を差し引いた後)。
- 1 タスクの儀式: 作業記録ファイル(平均 129 行)の作成・更新・アーカイブが無くなり、記録はコミット本文の 1 ブロックになった。
- 強制力は増えていない(HH-081 本文どおり honor-based)。ホスト側は次の `/sync` で新方式に移る。移行期限 2026-11-01 までは、旧記録付きの古いコミットを記録済みとみなす経過措置がある(`LEGACY_RECORD_CUTOVER`)。
