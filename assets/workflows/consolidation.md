# Consolidation workflow (HH-040)

局所改善が累積して生じる冗長・supersession・bloat を**全体最適へ整理する**実行手順。
framework-review **R8** がトリガ、`node tools/hyperhelix.mjs consolidation-report` が候補を測定する。
既定はbounded decision set（note 5 + backlog 5）、`--full` は全候補を出す。
本ファイルは「どう統合するか」の権威。**何を人間ゲートに残すかは constitution 統治の公理2 / routing**。

## 位置づけ(既存の全体健全性系との対応)

| 軸 | 測定ツール | レンズ | 実行手順 |
|---|---|---|---|
| コスト | `cost-report` | R7 | (D5 スリム化) |
| **冗長/統廃合** | **`consolidation-report`** | **R8** | **本ファイル** |

機構は**候補を提案するだけ**。実 merge / 削除 / 規則書換 / 履歴再構成は HH 提案 + 人間裁可。

## シグナル別の整理手順

### 1. 冗長クラスタ(同一規則が複数箇所)— R8a
- **判定**: 「単一権威 + ポインタ」か「無制御重複」か。例・スコープ・検出主張を**複数箇所が持つ**なら後者。
- **整理**: 1つを権威に定め、他は1行ポインタへ縮約(`see <authority>`)。AP-003 系(anti-patterns / R1 / N-041 / plan P6 / routing)が典型。
- **健全な重複は残す**: 操作上必要な再掲(コマンド片など)は権威を明示しつつ許容。

### 2. amendment supersession / lifecycle drift — R8b(人間ゲート)
- **supersession 連鎖**(例: R6 の HH-004→014→018→021→025): live チェックには**現行の1状態表 + 履歴脚注**だけを残し、経緯は amendments 本文へ。
- **lifecycle drift**: Status=Approved の HH 本文が「承認待ち」節下にある → **承認済みログへ移動**(決定の変更ではない housekeeping だが、履歴順序に触れるため人間確認)。
- **near-parallel 成長**(HH-025 R6 と HH-038 R7d 等): 共通方針(「main=開発、project/*=ROI 検証」)を1つ定め、各レンズはそれを参照。

### 3. stale deprecated — R8a
- DEPRECATED 宣言後に命令形手順が残る資材(例 `theta-review.md`): **歴史的参照ブロック**へ明示変換するか、より硬くアーカイブ。生きた手順と紛れさせない。

### 4. ノート merge 候補 — R8a
- 同 project・tag 重複が高いノート群(例 Project001 encoding 群): **1つの簡潔な検索ノート**へ統合 or project playbook 化し、残りは archived ポインタに。retrieval の断片化を解消。
- 失敗パターンが anti-patterns に既存なら、ノートは「ポインタ + 適用知見」に縮約。

### 5. 規則表面 bloat — R8a
- active 資材 >300行(例 `agent-roles.md` 442行): **live 契約 + 任意 appendix** に tier 分割し索引を付す(R7b と同じ手法)。

## backlog 焼却(R8c)とトリガ(R8d)

- `docs/process-backlog.md` の各 open 項目は `class:<根本原因>` を持つ。R8c は通常、priority/oldest順の最大5件を**処理 or 期限付き再正当化**する。5回ごと・ratchet・>300行・same-problem・明示fullでは`--full`で全件を走査する。
- **`last_backlog_open_count` の測定時点は pre-burn(焼却前)である**(2026-08-24 確定)。`/cycle` 手順は
  `consolidation-report --write-baseline` を step 3 = **R8 の処理より前**に置くので、記録される数は必ず
  その回の焼却前の値になる。∴ **trend と ratchet(`backlog_streak_k`)の比較対象も pre-burn 同士**であり、
  `/cycle` の record は**トレンド値として pre-burn の数を報告する**(焼却した件数は別途「今回 -N」として書く)。
  post-burn の数をトレンド欄に書くと基準の異なる比較になり、ratchet の発火・不発が両方とも信用できなくなる。
  これは尺度の単位(行数 vs 文字数、HH-073)とは独立した問題で、**先に片方だけ確定できる**。
- **行の宛先 `dest:main` / `dest:here`(2026-08-24 実測)**: project ブランチの backlog には、是正先が
  `main` にしか無い行(tools/CLI の書き換え・main 所有ノート・cross-branch sync)が混ざる。**その行はこの
  branch では構造的に焼却できない**のに、R8c のラチェットは accretion として数え、R8d は class を集計して
  発火していた — どちらのゲージも project ブランチで過大報告になる。∴ 該当行に **`dest:main`** を付す:
  - `consolidation-report` が open 総数と**このブランチで焼却可能な数**を分けて出力する(消費者)。
  - **R8c の burn 義務・再正当化回数の対象は「焼却可能な行」だけ**。`dest:main` 行は再正当化不要で、
    main の /cycle が所有する(global な open 総数には残るので main 側では通常どおり焼却対象)。
  - ラチェット(`backlog_streak_k`)の比較も**焼却可能な数**同士で行う。
  - **R8d の class 集計も焼却可能な行だけを数える**(下記 R8d 節)。
  - 既定は `dest:here`(無印)。判定に迷う行は無印のまま扱う — 免除は明示だけが根拠になる。
- R8d は `class:` を集計し、同一 class が **K=3** 回再発したら**1つの統合タスク**を起票(per-task の `same-problem-twice` を跨タスク化)。
  **集計対象は焼却可能な行だけ**(`dest:main` 行を除く)。**2026-08-30(/cycle ordinal 15)に配線した** — 上の
  `dest:main` 節は問題文で「R8c のラチェットは accretion として数え、**R8d は class を集計して発火していた**」と
  両方のゲージを名指ししながら、消費者リストは R8c とラチェットしか挙げておらず、**R8d だけ配線されずに残っていた**
  (AP-003 declare↔consume。宣言は両方・実装は片方)。実測 ordinal 15: `class:enforcement-gap` が 6 件で K=3 を
  超えて発火したが、**6件すべてが `dest:main`** ∴ この branch では1件も処理できない class に対して統合タスクの
  起票を要求していた。除外後は 0 件で不発火が正しい。
- `cost-report --write-baseline` と `consolidation-report --write-baseline` は同じknowledge正本writerなので必ず順次実行し、並列化しない。

## 自己防衛(R8e)

整理機構自身が bloat 源になりうる。**反 bloat の機構が bloat したら本末転倒**。
- 大半は glance + HINT(安価)。重い再構成(HH 畳み込み・意味クラスタ)は 5回毎 or >300行 に throttle。
- 新機械を作らず既存レール(tool subcommand / R-lens / Distill routing / 人間ゲート)を再利用。
- R8e で R8 自身の overhead を計測し、削る bloat より重ければ cadence を下げる。

## 完了

- 整理は通常タスクとして loop を通す(change-list = P6)。mass-consolidation は amendments HH + 人間裁可。
- 処理した backlog 項目は行を消すかタスクID/HH を付す。
