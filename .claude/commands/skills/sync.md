HyperHelix ブランチ間のフレームワーク改善を同期する。ループ外の運用コマンド。

このコマンドは薄い起動コマンドである(憲法・環境制約の公理)。
ユーザーへの応答は通信言語(日本語)で行う(憲法・レイヤーの公理)。
生成されるコミットは SYNC- クラス(git-conventions.md)であり、タスクループを経ない。

## ヒューリスティック — フレームワークコミットの識別

変更ファイルがすべて以下のパスに収まるコミットをフレームワーク専用候補とみなす:

```
core/**  assets/**  CLAUDE.md  AGENTS.md  constitution.md  amendments.md
.claude/commands/**  .claude/settings.json  tools/**  tasks/**  README.md  docs/**
```

それ以外のファイル(プロジェクトコード等)を1つでも含むコミットはプロジェクトコミットとして除外する。
`tasks/` 内のブリーフは追加判定する。ブリーフ本文の `プロジェクト / ジャンル` が
`hyperhelix / framework` のものだけフレームワーク専用として扱う。`Project001 / game` や
`Project004 / data-pipeline` など project != hyperhelix のブリーフは、プロジェクトコードを
伴わない調査・計画だけのコミットでも除外する。

同期のハブはリモートの `origin/main`。プッシュ先・プル元はともに `origin main` である。

**Quick path（推奨・HH-034）**: `node tools/hyperhelix.mjs sync` が B→A を完全自動で実行する
（fetch → behind なら ff 取り込み → validate → ahead なら push）。push は validate パス + ff-only を
前提に**自動**（ツール実行が standing 指示）。**分岐・コンフリクト・validate error を検知したら停止**するので、
その時だけ下記の手動手順と「コンフリクト解決ガイド」を使う。以下は手動フロー（分岐時の fallback）。

**project→main の還元（A）は `node tools/hyperhelix.mjs reflux`**: project/variant ブランチで作った
framework 改善を main へ還元するとき、reflux が下記 A フロー（framework-only コミットの抽出 → ローカル main へ
staged cherry-pick → validate → push）を自動化する（dry-run で候補確認 → `--apply` で実行）。
counter conflict は本「コンフリクト解決ガイド」へ安全 abort。`sync` は main 上の local↔origin、`reflux` は project→main。

## A. 現在のブランチ → origin main（還元プッシュ）

> main ブランチ上では「ローカル main → origin/main」の push として機能する（スキップしない）。

1. `git fetch origin` で `origin/main` を最新化する。
2. `git log origin/main..HEAD --oneline` でブランチ固有コミットを列挙する。
   （現ブランチが main の場合、これは `origin/main` より先行するローカル main のコミット = push 候補。）
3. 各コミットに `git show --stat <hash>` を適用し、ヒューリスティックでフレームワーク候補を抽出する。
4. 候補リストをユーザーに提示し、origin main へ反映する対象を確認する（人間ゲート）。
5. `git checkout main`（既に main ならスキップ）→ `git merge --ff-only origin/main` でローカル main を
   `origin/main` に揃える → `git cherry-pick <hashes>` で承認コミットを取り込む
   （現ブランチが main の場合、ローカル main の先行コミットがそのまま対象のため cherry-pick 不要）。
   ff-only が失敗（ローカル main と origin/main が分岐）したら停止し、手動 reconcile をユーザーに促す。
6. knowledge.yaml カウンタを concurrency.md §3 に従って照合・修正する（**task_index は累積=base+Σδ（max ではない）**、next_note_id と last_framework_review は high-water=max）。
7. `node tools/hyperhelix.mjs validate` がパスすることを確認する。
8. cherry-pick 等で新規コミットが生じた場合のみ `SYNC-YYYYMMDD: <一行要約>` 形式でコミットする
   （cherry-pick が clean ならメッセージをそのまま使ってよい）。
9. `git push origin main`。**HH-034: /sync 経由の push は自動可**（/sync 起動が standing 指示。
   validate パス + ff を前提に push。`hyperhelix.mjs sync` はこれを自動で行う）。non-fast-forward で
   拒否されたら停止し、B（取り込み）→再 push する。
10. 元のブランチに戻る（現ブランチが main だった場合は不要）。

## B. origin main → 現在のブランチ（差分取り込み）

> main ブランチ上では「origin/main → ローカル main」の pull として機能する（スキップしない）。

1. `git fetch origin` で `origin/main` を最新化する。
2. `git log HEAD..origin/main --oneline` で未取り込みの origin/main コミットを列挙する。
3. ヒューリスティックを適用し、フレームワーク専用コミット候補を表示する。
4. ユーザーに取り込み対象を確認する（人間ゲート）。
5. 単一コミットなら `git cherry-pick`、連続範囲なら `git merge origin/main`
   （現ブランチが main の場合は `git merge --ff-only origin/main` を推奨）を使う。
   **コンフリクトが発生したら下記「コンフリクト解決ガイド」に従い解消してからステージする。**
6. knowledge.yaml カウンタを concurrency.md §3 に従って照合・修正する。
7. `node tools/hyperhelix.mjs validate` がパスすることを確認する。
8. `SYNC-YYYYMMDD: origin/main から <N> コミットを取り込み` 形式でコミットする。

## コンフリクト解決ガイド（B 方向でマージ競合が生じた場合）

`git diff --name-only --diff-filter=U` でコンフリクトファイルを列挙し、以下の方針で解消する。

### ファイル種別ごとの優先ルール

| ファイル | 優先側 | 理由 |
|---------|--------|------|
| `tasks/*.md`（プロジェクトブランチ） | **ours** | ブランチ固有の作業記録を保持する |
| `tasks/*.md`（HyperHelix-only 作業ディレクトリ） | **theirs** | HH フレームワークタスクが権威 |
| `README.md` | **theirs** | main が最新の人間向け文書 |
| `amendments.md` | **手動マージ** | 下記参照 |
| `core/knowledge.yaml` | **手動マージ** | 下記参照 |
| `.claude/settings.json` | **手動マージ** | hooks ブロックは main 権威(theirs)、permissions/env 等の local 設定は保持(ours)。HH-055 |
| その他フレームワーク資材 | **theirs** | main が権威 |

```bash
# プロジェクトブランチでの典型的な解決手順例
git checkout --ours  tasks/TASK-*.md      # 自ブランチの作業記録を保持
git checkout --theirs README.md            # main の最新版を採用
```

### amendments.md のコンフリクト解決

HEAD と main の間でコンフリクトが生じるのは「承認済みログ」セクションが
主となる（ours は空・theirs に新規 HH エントリ）。

解決方針:
- `<<<<<<< HEAD` から `=======` の間（ours 側が空なら）を削除
- `=======` から `>>>>>>> <hash>` を削除（theirs の内容を残す）
- 結果: main の HH エントリ（HH-XXX〜YYY）が挿入される

確認: `Select-String -Pattern "^(<<<<<<<|=======|>>>>>>>)" *.md` でマーカーゼロを確認。

### core/knowledge.yaml のコンフリクト解決

**① カウンタ（counters セクション）**

concurrency.md §3 のフィールド種別に従って解決する（task_index は**累積**、他は**high-water**）:

```yaml
# task_index は accumulator: max ではなく base+Σδ。base=分岐元(merge-base)の値。
task_index: <base + (HEAD値 - base) + (main値 - base)>
last_framework_review: <max(HEAD値, main値)>          # high-water
next_note_id: <max(main値, HEAD値) = main値 + ブランチ追加ノート数>  # high-water。③参照
```

**② N-001 / N-002 等の strength/state コンフリクト**

- state が一方に `archived` → **theirs(main)採用**（意図的アーカイブを尊重）
- 両方 `active` で strength が異なる → **大きい方を採用**（imperfection 容認・HH-015）

**③ ノート ID の重複（プロジェクトブランチ固有ノートと main ノートの ID 衝突）**

プロジェクトブランチが追加したノート（例: Project004 固有の N-016〜027）が
main の同 ID ノート（Project001 固有等）と衝突する場合:

1. main のノート一覧の末尾 ID（`next_note_id - 1`）を確認する
2. プロジェクトブランチ固有ノートを `next_note_id` 番から採番し直す
3. ノート内の `[[N-XXX]]` 参照も合わせて更新する（正規化は次 /cycle まで猶予可）
4. `next_note_id` を `main値 + 追加ノート数` に設定する
5. プロジェクト固有ノートには `project:` フィールド(例 `project: Project004`)を設定して識別しやすくする(HH-032)

```yaml
# 例: main の next_note_id=41 に対し Project004 ノート 12件追加 → 41〜52, next_note_id=53
```

**④ 検証**

```powershell
node tools/hyperhelix.mjs validate  # 0 error(s) を確認
Select-String -Path "core/knowledge.yaml" -Pattern "^  - id: N-" |
  Group-Object { ($_.Line -match 'N-(\d+)' && $Matches[1]) } |
  Where-Object Count -gt 1  # 重複 ID がゼロであること
```

## 両方向を一度に実行する場合

B → A の順で実行する（先に origin/main を取り込んでローカルを最新化してから還元 push し、
non-fast-forward push を避ける）。
