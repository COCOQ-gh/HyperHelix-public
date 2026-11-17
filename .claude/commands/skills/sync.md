HyperHelix ブランチ間のフレームワーク改善を同期する。ループ外の運用コマンド。

このコマンドは薄い起動コマンドである(憲法・環境制約の公理)。ルール本体は資材側にある。
ユーザーへの応答は通信言語(日本語)で行う(憲法・レイヤーの公理)。
生成されるコミットは SYNC- クラス(`assets/workflows/git-conventions.md`)であり、タスクループを経ない。

0. **どのブランチに居るかで使うコマンドが違う**:
   - `main` 上 → **1.** の `sync`(local↔origin の同期)。
   - `project/*` `variant/*` 上 → **2.** の `reflux`(framework-only へ絞って main へ還元)。
     `sync` の branch guard は project/variant で fail-closed。分類を迂回しない。
1. **Quick path(推奨・HH-034)**: **main 上でのみ** `node tools/hyperhelix.mjs sync` を実行する。
   fetch → behind なら ff-only 取り込み → validate → ahead を専用 branch へ push → PR を行う(HH-060/069/070)。
   非統治 PR は CI checks 後に自己merge、統治対象は同じchecks後にURLを返して人間の手動merge待ち。
   同一publisherを許可し、CODEOWNER Approveは要求しない。統治PRは自動mergeせず、`--admin` bypassも使わない。
   HH-070によりbranch protectionは必須でなく、これらはprivate/free上のtool+human honor-based規律として運用する。
   実行前に `--dry-run` で対象とmerge種別を確認する。コマンド実行は PR branch push/PR作成/非統治mergeの standing 指示だが、統治PRの手動mergeや外部設定変更は含まない。
2. **project/variant ブランチから main への還元は `node tools/hyperhelix.mjs reflux`**
   (dry-run で候補確認 → `--apply`。`origin/main` 起点の専用 branch に framework-only commit を cherry-pickしてPR化。knowledge.yaml の counter-only 衝突は HH-057 で自動解決)。
   reflux が候補を出せない場合(main 側が同一ファイルを書き換え cherry-pick 不成立等)は
   **内容差分方式**へ切り替える: `git diff origin/main HEAD -- core assets tools .claude .codex docs *.md`
   で main に無い hunk を特定し、ローカル main 上で framework 資材のみ checkout してコミットする
   (実績 SYNC-20260715 / backlog work-list (2))。
3. ツールが**分岐・コンフリクト・validate error で停止した場合のみ**、
   `assets/workflows/sync-conflict-guide.md` を Read し、手動フローとコンフリクト解決ガイドに従う。
4. 結果(取り込み/候補コミット数・validate・PR URL・checks・merged/人間待ち)をユーザーに報告する。private/free運用・任意branch protection・緊急復旧は `assets/workflows/branch-protection-runbook.md`。
