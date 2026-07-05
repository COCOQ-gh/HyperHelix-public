HyperHelix フレームワーク自身を対象に自己改善サイクルを実行する。

このコマンドは薄い起動コマンドである(憲法・環境制約の公理)。ルール本体は資材側にある。

1. `AGENTS.md` の読み込み順序に従い全コア資材を読み込み、さらに `assets/checklists/` と `assets/workflows/` と `assets/ai/anti-patterns.md` を読む。
2. `assets/checklists/framework-review.md` の R1〜R8 を実施し、問題を重大度付きで一覧化する(R7=systemic レンズ HH-026: 先に `node tools/hyperhelix.mjs cost-report`、R8=consolidation レンズ HH-040: 先に `node tools/hyperhelix.mjs consolidation-report` を実行し出力をブリーフに記録)。
3. 発見した問題を1つのタスクとして `core/loop.yaml` のループ(フェーズゲート → S→P→E→V→D)で処理する。問題がなければ「異常なし」として Distill に進む。
4. フレームワーク改善の知見は `core/knowledge.yaml` に学習ノートとして追加する(HH-016。メタ畳み込み)。
5. 人間ゲート対象(θ変更・統廃合・憲法変更など)は `amendments.md` に HH 提案として起票し、適用しない。
6. D7 でカウンタ更新(`bump --task ID [--review]`)と `node tools/hyperhelix.mjs validate` を実行する。
7. 自己目的化チェック: `assets/checklists/framework-review.md` の R6 に従う(停止・再開の状態は R6 側に記載)。
