# Theta Review Workflow — 歴史的参照(DEPRECATED, HH-016)

> このファイルは**実行しない**(履歴のみ)。HH-016 で integer-gate / theta-tuning 機構は撤去され、
> 知識は flat note 台帳(`tuning_signals` なし・batch theta review なし)へ移行した。
> 当時の機構の記録だけを残す。具体手順の詳細は git 履歴を参照。

## かつての機構(撤去済・参考)

`counters.tasks_since_tuning >= gates.tuning.batch_interval_tasks` を満たすと作動し、distill D7 から参照された。
8 つの signal(retrieved_unused / used_not_retrieved / override_rate / false_promotion_rate /
orphan_rate / evaluate_fail_count / execute_returns / external_artifact_tasks)を当時の `tuning-report`
出力で算出し、theta(gates)値の変更が妥当なら amendments へ HH 提案、否なら no-change を記録した。
theta 自体はここでは変えず人間ゲートを通し、判定後に `tasks_since_tuning` と `tuning_signals.*` を 0 に戻した。

## 現在の対応物(これが theta-tuning batch を置換した)

| かつて | 現在 |
|---|---|
| tuning_signals / tasks_since_tuning batch | 学習ノートの strength ±1 + 人手 prune(HH-016) |
| theta レビューでの全体最適化 | R7(コスト)/ R8(冗長・統廃合)レンズ |
| theta 変更提案 | amendments へ直行(人間ゲート) |

<!-- HH:ACTIVE-SCAN-ALLOW reason="historical record of HH-016-removed theta machinery (tuning_signals/tasks_since_tuning); names them as past mechanism, not live use" -->
<!-- /HH:ACTIVE-SCAN-ALLOW -->
