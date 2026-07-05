HyperHelix のタスクループで次のタスクを実行する: $ARGUMENTS

このコマンドは薄い起動コマンドである(憲法・環境制約の公理)。ルール本体は資材側にある。
ユーザーへの応答・タスクサマリ・所見報告は通信言語(日本語)で行う(憲法・レイヤーの公理)。AI層資材が英語でも、ユーザー向け出力の言語は変わらない。

1. `CLAUDE.md` / `AGENTS.md` の読み込み順序(HH-024)に従い資材を読む: **常時必読**=`constitution.md` + `core/loop.yaml` + `core/routing.yaml` + `core/gates.yaml` を全文 / **索引読み**=`amendments.md` は冒頭索引のみ(関係する HH の本文へドリルダウン) / `core/knowledge.yaml` ノートは S2 でタグ検索。`core/dictionary.yaml` は deprecated(読み込み順から除外)。
2. `assets/checklists/phase-gate.md` でフェーズゲートを実施し、タスクブリーフを作成または特定する(`assets/templates/task-brief.md` → `tasks/`)。
3. `core/loop.yaml` の定義に従い、深度モードを判定したうえで5フェーズを実行する。各フェーズで対応チェックリスト(`assets/checklists/`)を使う。
4. Distill とタスク終了処理は `assets/checklists/distill.md` と `assets/workflows/git-conventions.md` に従う。
5. 人間ゲート対象は `amendments.md` の提案フォーマットに従う。
6. `core/loop.yaml` の `task_summary` に従いタスクサマリを出力する。
