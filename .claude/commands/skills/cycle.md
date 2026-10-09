HyperHelix フレームワーク自身を対象に自己改善サイクルを実行する。

このコマンドは薄い起動コマンドである(憲法・環境制約の公理)。ルール本体は資材側にある。

1. `entrypoint.md`(正本・HH-059)の always-read tier を読む。full sweep の有効条件は **`assets/checklists/framework-review.md` を単一権威とする**(ここで再記述しない — 再記述すると /cycle 発火条件の「5タスク」と R7/R8 の「every 5th review」が混線し、後者が空文化する。2026-08-23 実測)。明示 `--full` は常に有効。framework material を変更しただけでは full R1〜R8 を起動しない（各task V1のlocal R1〜R3が担う）。
2. **同一正本writerを直列実行する**。まず `node tools/hyperhelix.mjs cost-report --write-baseline`（full sweepなら `--full` 追加）を実行し、完了を待つ。出力された `/cycle mandatory read-set` の全ファイルを読む。delta基準不能はtoolがfull fallbackする。default出力で >300行/ratchet triggerが判明したら、read-onlyの `cost-report --full` で全read-setを取得して読む。
3. 前step完了後にのみ `node tools/hyperhelix.mjs consolidation-report --write-baseline`（full sweepなら `--full` 追加）を実行する。cost/consolidation の2つの `--write-baseline` を並列dispatchしてはならない。default R8 decision setはnote最大5 + backlog最大5、`--full`は全件。出力をtask recordへ記録する。`--write-baseline` は /cycle 専用で、探索実行は付けない。
4. `assets/checklists/framework-review.md` の R1〜R8 を実施し、問題を重大度付きで一覧化する。固定読込は全checklist、`assets/ai/anti-patterns.md`、`assets/workflows/exception-handling.md`、`assets/workflows/consolidation.md`。その他workflowはcost-reportのdelta/full read-setに従う。
5. 発見した問題を1つのタスクとして `core/loop.yaml` のループ(フェーズゲート → S→P→E→V→D)で処理する。問題がなければ「異常なし」として Distill に進む。
6. フレームワーク改善の知見は `core/knowledge.yaml` に学習ノートとして追加する(HH-016。メタ畳み込み)。人間ゲート対象(θ変更・統廃合・憲法変更など)は HH 提案として起票し、適用しない。
7. D7 でカウンタ更新(`bump --task ID --review --review-source cycle` — 先頭 `/` を付けない(AP-024))と `node tools/hyperhelix.mjs validate` を実行する。自己目的化チェックはframework-review R6に従う。
