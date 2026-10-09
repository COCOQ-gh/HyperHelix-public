# /sync 手動フローとコンフリクト解決ガイド

`node tools/hyperhelix.mjs sync`(quick path・HH-034)が**分岐・コンフリクト・validate error で停止した場合のみ**
本ガイドを使う。clean な同期でこのファイルを読む必要はない(TASK-20260708-003: スキル本文から分離)。
運用言語(日本語)。SYNC- コミット規約は `assets/workflows/git-conventions.md`。

## ヒューリスティック — フレームワークコミットの識別

変更ファイルがすべて以下のパスに収まるコミットをフレームワーク専用候補とみなす:

```
core/**  assets/**  .github/**  CLAUDE.md  AGENTS.md  entrypoint.md  constitution.md  amendments.md
.claude/commands/**  .claude/settings.json  .codex/**  tools/**  README.md  docs/**
governance/**  test/**
```

`test/**` はこのリポジトリではフレームワーク資材である(ホストのゲームコードは別リポジトリ)。除外すると
「検出器を変えたら陽性テストを書く」(evaluate.md V1)を満たしたコミットほど還元されなくなる(2026-10-02 /cycle で追加)。

それ以外のファイル(プロジェクトコード等)を1つでも含むコミットはプロジェクトコミットとして除外する。
**`tasks/` は還元しない(HH-081 段階3 D8)**: 作業記録はコミット本文の hh-record で運ばれるため、`tasks/` の
ファイルは分類上「中立」— 他のファイルがすべてフレームワーク資材なら候補に残し、`reflux --apply` が
cherry-pick 後に `tasks/` の変更を origin/main の状態へ戻すコミットを足して除外する。`tasks/` だけのコミットは候補にならない。

同期のハブはリモートの `origin/main`。取り込み元は `origin/main`、還元先は専用branch経由のPRである。

## A. 現在のブランチ → main PR(還元・手動フロー)

> main ブランチ上ではローカル main の ahead を専用branchへpublishする(スキップしない)。
> project/variant からの還元は `node tools/hyperhelix.mjs reflux` が本フローを自動化する
> (dry-run → `--apply`。counter-only 衝突は HH-057 で自動解決)。

1. `git fetch origin` で `origin/main` を最新化する。
2. `git log origin/main..HEAD --oneline` でブランチ固有コミットを列挙する。
3. 各コミットに `git show --stat <hash>` を適用し、ヒューリスティックでフレームワーク候補を抽出する。
4. 候補リストをユーザーに提示し、PRへ反映する対象を確認する(人間ゲート)。
5. project/variant では `git switch -c hyperhelix/reflux-manual-<slug> origin/main` →
   `git cherry-pick <hashes>`。main の ahead は現在の HEAD をそのまま publish 対象にする。
   origin/mainとの分岐を解消できなければ停止し、手動 reconcile をユーザーに促す。
6. knowledge.yaml カウンタは HH-057 で high-water(max)。コンフリクト時は下記①で解決。
7. PR-branch push 時は pre-push フック(`tools/hooks/pre-push`、`core.hooksPath` 経由)が `validate` と `verify --base <merge-base>`(CI 相当の L1-L4)を自動強制する。フック未導入時の fallback として手動の `node tools/hyperhelix.mjs validate` + `verify --base origin/main` を残す。
8. 新規コミットが生じた場合のみ `SYNC-YYYYMMDD: <一行要約>` 形式でコミットする。
9. `git push -u origin HEAD:refs/heads/hyperhelix/<sync|reflux>-manual-<slug>` →
   `gh pr create --base main --head <branch>`。`origin/main` へ直接pushしない。
10. CI checks を待つ。統治pathはCODEOWNER Approveを要求せず、人間が差分を確認してmerge commit方式で手動mergeする。その他は自己merge可。元のブランチに戻る。branch protectionは必須でなく、詳細は `branch-protection-runbook.md`。

## B. origin main → 現在のブランチ(差分取り込み・手動フロー)

1. `git fetch origin` で `origin/main` を最新化する。
2. `git log HEAD..origin/main --oneline` で未取り込みコミットを列挙する。
3. ヒューリスティックでフレームワーク専用候補を表示し、ユーザーに確認する(人間ゲート)。
4. 単一なら `git cherry-pick`、連続範囲なら `git merge origin/main`(main 上は `--ff-only` 推奨)。
   コンフリクトは下記ガイドで解消してからステージする。
5. validate パス確認 → `SYNC-YYYYMMDD: origin/main から <N> コミットを取り込み` でコミットする。

## コンフリクト解決ガイド

`git diff --name-only --diff-filter=U` でコンフリクトファイルを列挙し、以下の方針で解消する。

### ファイル種別ごとの優先ルール

| ファイル | 優先側 | 理由 |
|---------|--------|------|
| `tasks/*.md`(プロジェクトブランチ) | **ours** | ブランチ固有の作業記録を保持する |
| `tasks/*.md`(HyperHelix-only 作業ディレクトリ) | **theirs** | HH フレームワークタスクが権威 |
| `README.md` | **theirs** | main が最新の人間向け文書 |
| `amendments.md` | **手動マージ** | 下記参照 |
| `core/knowledge.yaml` | **手動マージ** | 下記参照 |
| `.claude/settings.json` | **手動マージ** | hooks ブロックは main 権威(theirs)、permissions/env 等の local 設定は保持(ours)。HH-055 |
| `.codex/hooks.json` / `.codex/config.toml` / `.codex/compact-prompt.md` | **手動マージ** | compaction 配線・prompt は main 権威。ローカル固有設定が併存する場合は非hook部分を保持する。HH-055 |
| その他フレームワーク資材 | **theirs** | main が権威 |

```bash
git checkout --ours  tasks/TASK-*.md      # 自ブランチの作業記録を保持
git checkout --theirs README.md            # main の最新版を採用
```

### amendments.md のコンフリクト解決

主に「承認済みログ」セクションで生じる(ours は空・theirs に新規 HH エントリ)。

- `<<<<<<< HEAD` から `=======` の間(ours 側が空なら)を削除
- `=======` から `>>>>>>> <hash>` を削除(theirs の内容を残す)
- 確認: `Select-String -Pattern "^(<<<<<<<|=======|>>>>>>>)" *.md` でマーカーゼロ

### core/knowledge.yaml のコンフリクト解決

**① カウンタ — HH-057: すべて high-water(max)**

`reflux` は counters-only の衝突を自動解決する(`resolveKnowledgeCounterConflict`)。手動時は max:

```yaml
task_index: <max(HEAD値, main値)>                     # high-water
last_framework_review: <max(HEAD値, main値)>          # high-water
# next_note_id は保存しない。新規IDは`hyperhelix.mjs next-id`の恒久branch/date ID
```

**② strength/state コンフリクト**

- state が一方に `archived` → **theirs(main)採用**(意図的アーカイブを尊重)
- 両方 `active` で strength が異なる → **大きい方を採用**(imperfection 容認・HH-015)

**③ ノート ID の重複(ブランチ固有ノートと main ノートの衝突)**

**HH-064/FI-02 の正規手順**: 恒久 ID は生成時に確定するため、notesは両側unionのみ。
還元時の採番・参照置換は行わない。deprecated provisional IDはmainの`validate`が停止させるため、
生成元branchで`next-id`を使って恒久IDへ直してから再還元する。`adopt-notes`はno-op互換aliasである。

恒久ID同士が衝突した場合はencoder/generator契約違反なので、その場で連番へ改番して隠さない。
生成元を修正し、全参照を同一taskで更新して回帰fixtureを追加する。プロジェクト固有ノートには
`project:`フィールドを設定する(HH-032)。

**④ 検証**

```powershell
node tools/hyperhelix.mjs validate  # legacy N-NNN / 恒久 ID の両形式をまたぐ重複 ID も検査
```

## 両方向を一度に実行する場合

B → A の順で実行する(先に origin/main を取り込んでから還元 PR を作り、古いbaseを避ける)。
