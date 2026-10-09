# TASK-20260717-002 レビュー補助資料 — コミット 49fdbc2 の独立レビュー結果

**日付:** 2026-07-17
**対象コミット:** `49fdbc2`(TASK-20260717-002: フレームワーク改善統合計画を策定)
**位置づけ:** 統合改善計画(正本: `tasks/TASK-20260717-002.md`)の実装時入力。
本資料は計画の変更ではなく、FI-05/FI-06 実装 task が Contract Impact / regression へ
取り込むべき追加 finding の記録である。

---

## 1. レビューで再現・確認できた事項(Pass)

| # | 検証項目 | 結果 |
|---|---|---|
| 1 | `node tools/hyperhelix.mjs validate` | 0 error / 0 warning(コミット主張を独立再現) |
| 2 | 実装 task 数の算術整合 | FI-01〜03 + FI-04a〜e(5)+ FI-05/06 + FI-07a/b/c×3/d(6)+ FI-08 = 17。計画の「17 task / 17 commit」と一致 |
| 3 | RT matrix | RT-01〜17 が一意、traceability 表の全 finding が package と RT に対応 |
| 4 | slug encoder 例示 | `-`=0x2d→`z2d`、`_`=0x5f→`z5f`、`z`→`z7a` — byte 値と整合 |
| 5 | counters / D7 | task_index 534→535、last_framework_review→535、N-059 strength+1・last_used 535 の1手 — D7 規約どおり |
| 6 | HH-065/066 lifecycle | index・body・digest・ratified fields が同期、承認済みログの降順維持 |

---

## 2. Finding R-01(中)— Pending 節ヘッダ削除で consumer 3件が浮いた

### 観察

HH-065 を承認済みログへ移した際、`amendments.md` の `## 承認待ち(Pending)` 節が
空になりヘッダごと削除された(brief の Evaluate #1 も「Pending header 0」を Pass 条件と
しており意図的)。しかし以下の consumer は依然この節/ヘッダを前提にしている。

| consumer | 参照内容 | 影響 |
|---|---|---|
| `core/routing.yaml:34` | 気づきの park 先「amendments.md Pending entry if governance-level」 | park 先の節が存在せず、書き込み位置が未規定 |
| `core/routing.yaml:50` | 同上 | 同上 |
| `assets/workflows/review-only.md:34` | 同上 | 同上 |
| `tools/hyperhelix.mjs:2218-2224` | lifecycle drift 検査が `## 承認待ち` ヘッダを `indexOf` で探す | ヘッダ不在(`pIdx=-1`)で検査全体が**黙ってスキップ**され、無効化されたままになる |

### なぜ問題か

- 次の HH-067 起票時、書き手は節を再作成するか承認済みログ先頭に置くかが未規定。
  後者の場合「Pending body が承認済みログ節下にある」**逆向き drift** を誰も検出しない。
- これは本コミットが裁可した HH-066(宣言/構造の変更時に consumer を突合する)の
  対象そのものであり、AP-003 の同型再発である。

### 是正候補(人間ゲート判断待ち)

1. **(最小)** 空でも `## 承認待ち(Pending)` 節ヘッダを常設に戻し、
   「節は空でも削除しない」を amendments.md の構造規約として明文化する。
2. **(計画統合)** FI-05 の Contract Impact に本 finding の3 consumer を列挙し、
   amendments.md の節構造(Pending 節・承認済みログ節)を FI-01 の
   machine-readable contract の anchor として管理する。

推奨は 1+2 の併用(即時に穴を塞ぎ、恒久策は計画に載せる)。

---

## 3. Finding R-02(低)— drift 検査の fail-open が RT matrix 未カバー

### 観察

`tools/hyperhelix.mjs` の lifecycle drift 検査は、前提ヘッダが見つからないと
エラーも警告も出さずに検査をスキップする(fail-open)。「検証が黙って
検査せず pass 相当を返す」形で AP-010 と同型だが、RT-01〜17 に対応する
regression が存在しない。

### 是正候補

- FI-06(L1-L4 verify)へ **RT-18 候補** として追加:
  「amendments.md の必須節ヘッダ欠落を L1/L2 で fail にする。
  drift 検査は前提不成立時に skip ではなく報告する」。
- fixture: (a) Pending ヘッダ欠落 → fail、(b) Pending body が承認済みログ下 → fail、
  (c) 正常構造 → pass。

---

## 4. 計画への取り込みマップ(実装 task 用)

| finding | 取り込み先 | 追加 regression |
|---|---|---|
| R-01 consumer 3件(routing.yaml ×2 / review-only.md / hyperhelix.mjs) | FI-05 Contract Impact + FI-01 contract anchor | RT-14/15 の fixture に amendments 節構造を追加 |
| R-01 即時是正(Pending 節ヘッダ復活) | 独立の小 task(本計画の commit とは別) | — |
| R-02 fail-open drift 検査 | FI-06 | RT-18(新設) |

本資料の finding はいずれも計画本体(17 task 構成・依存順・出口条件)の変更を
要求しない。FI-05/06 の scope 追記と RT の1件追加で閉じる。

---

## 5. オーケストレータ裁定(TASK-20260717-003)

**判定: 採用。** R-01/R-02 は現物で再現し、`validate` 0/0 のまま lifecycle 検査が
ヘッダ不在で黙ってskipすることを確認した。

ただし本資料の原案には、R-01即時是正を「独立の小task」としながら「17 task構成は変更しない」
という算術矛盾がある。独立taskは必ずtask_index/commitを消費するため、次のように補正する。

- FI-00 = TASK-20260717-003 を追加し、Pending anchor復旧・本資料の追跡・計画接続を実施。
- 現行programは **18 task / 18 commit**。
- regressionは **RT-01〜18**。RT-18がheader欠落・逆向きdrift・正常構造を検査する。
- lifecycle検査本体のfail-closed化はFI-06で実装し、FI-00は現行anchorを即時復旧する。

本節が§4末尾の「17 task構成を変更しない」を置換する。元文は独立レビューの監査証跡として残す。
