---
name: hh-apply
description: HyperHelix フレームワークを今開いているホストプロジェクトへ導入・検証・更新する(公開リポジトリ COCOQ-gh/HyperHelix-public からネスト配置 doc/HyperHelix/ に clone、project/<slug> ブランチ、/helix 等の起動コマンド反映、compaction/pre-push フック配線、公開リポジトリの更新取り込み)。「HyperHelix を入れて」「このプロジェクトに HyperHelix を適用」「/helix が使えない」「HyperHelix を最新にして」「フレームワークのフックが動いていない」「session-bootstrap の検証をして」など、HyperHelix とホストプロジェクトの接続に関する依頼では、明示的に /hh-apply と言われなくてもこのスキルを使う。HyperHelix リポジトリ自体(tools/hyperhelix.mjs が cwd 直下にある)での /helix・/cycle・/sync の実行には使わない。
---

# hh-apply — HyperHelix をホストプロジェクトへ適用する(配布版)

ホストプロジェクト(今の作業ディレクトリ)に HyperHelix を **ネスト配置**で導入し、
起動時検証(`session-bootstrap.md`)を通し、公開リポジトリの更新を取り込む。結果の報告は日本語で行う。

このスキルは **配管**だけを担う。ルール本体はネスト先の資材(`entrypoint.md` → `constitution.md` →
`core/*.yaml` → checklists/workflows)にあり、ここには書かない(HyperHelix 憲法・環境制約の公理:
起動コマンドは薄く、ルールは資材に)。導入が終わったら以後のタスクは `/helix <タスク>` で実行する。

## 前提と固定値

| 項目 | 値 | 理由 |
|---|---|---|
| 本体の取得元 | `https://github.com/COCOQ-gh/HyperHelix-public.git` の `main` | 公開ライン(匿名化済み)の先端。この repo の `main` が利用者にとっての `origin/main` になる |
| 既定のネスト先 | `doc/HyperHelix/`(ホスト root 直下) | `session-bootstrap.md` が前提とする標準配置。**既存のネストがあればそれを尊重し、動かさない** |
| ブランチ | ネスト先で `project/<slug>` を `main` から派生 | git-conventions のブランチモデル。project 資材は main に置かない |
| slug | ホスト dir 名から候補を出し **毎回確認** | ノートの `project` フィールドと branch 名になる恒久 ID |
| フック | ホスト `.claude/settings.json` に compaction 3 イベント、ネスト先 `core.hooksPath=tools/hooks` | Claude Code が読む settings はホスト側のもの(§3b)。ネスト内の settings.json は不活性 |
| 外向き操作 | **なし(ローカル完結)** | 利用者は公開 repo への push 権限を持たない。`project/<slug>` はローカルに留め、push・PR・`reflux` は提案しない |
| 対象 | Claude Code のみ | Codex 側(`.codex/`)は配線しない |

必要なツール: `git`、`node`(20 以上。ネスト先の tools が使う)。`npm ci` は初回のみ(依存は yaml と ajv の 2 件)。

## 手順

### 0. 現状を測る(読み取りのみ)

ホスト root(`git rev-parse --show-toplevel`、repo でなければ cwd)で:

```bash
node ~/.claude/skills/hh-apply/scripts/status.mjs
```

JSON で返る: ホスト側(repo か・settings の配線・起動コマンド 4 件・.gitignore・CLAUDE.md の案内)と、
見つかったネスト(path・branch・origin・`core.hooksPath`・node_modules・origin/main との ahead/behind)。
**この結果で以降の分岐を決める。推測で進めない。**

- `nestCount >= 2` → どれを使うか AskUserQuestion。
- cwd 直下に `tools/hyperhelix.mjs` がある(= HyperHelix リポジトリ自身) → このスキルの対象外。
  `/helix` `/cycle` `/sync` を案内して終わる。
- 既存ネストの `originUrl` が上の取得元と違う → そのネストは別の配布元から入れたもの。取得元を付け替えずに報告し、
  利用者の判断を仰ぐ。

### 1. slug とネスト先を確定する(AskUserQuestion 1 回)

- slug 候補 = `host.suggestedSlug`。既存ネストがあればその branch 名 `project/<slug>` の slug を第一候補にする。
- 同じ質問でネスト先も確認する(既定 `doc/HyperHelix/`。既存ネストがある場合は聞かずそれを使う)。

### 2. 導入(ネストが無いとき。あれば 3 へ)

```bash
git clone https://github.com/COCOQ-gh/HyperHelix-public.git <nest>   # ホスト root で
cd <nest> && npm ci                                                   # yaml + ajv。lockfile 固定
```

- `.gitignore` への追記・起動コマンド反映・ブランチ作成・hooksPath・validate は次の `bootstrap` が一括で行う(冪等)。
- 外付け HDD 上のリポジトリでは `npm ci` が遅い。バックグラウンド実行し、短いタイムアウトで切らない。

### 3. bootstrap(冪等。既存ネストでも毎回走らせてよい)

ネスト先で:

```bash
node tools/hyperhelix.mjs bootstrap --project <slug> --host <ホスト root の絶対パス>
```

やること: `project/<slug>` へ switch/作成(無ければ `main` から派生)→ ホスト `.claude/commands/` へ
`helix / cycle / sync / compact-prep` の **薄いリダイレクト**を反映 → ホスト `.gitignore` に `<nest>/` →
`core.hooksPath=tools/hooks` → `validate`。`--host` を省くと親 dir が host と見なされるので、
`doc/HyperHelix/` のように 2 段ネストでは **必ず `--host` を渡す**。

この時点で validate は `NESTED_HOOKS_MISSING` を warn する。次で解消する。

### 4. ホスト側の配線

```bash
node ~/.claude/skills/hh-apply/scripts/wire-host-hooks.mjs --host <ホスト root> --nest <nest>
```

ホスト `.claude/settings.json` に PreCompact / PostCompact / UserPromptSubmit の 3 フックを
**既存キーを保ったまま**追加する(既に `compaction-hooks.mjs` を呼ぶイベントは触らない)。
settings.json が壊れた JSON なら書かずに止まる — 手で直してから再実行。

ホスト `CLAUDE.md` に HyperHelix への案内が無ければ(`claudeMdMentionsNest: false`)、
`references/host-wiring.md` の節を追記する。案内はリダイレクトのみ(ルールを写さない)。
既存の CLAUDE.md を書き換えるので、追記する内容を示してから行う。

### 5. 検証(session-bootstrap.md §1〜§4 を機械的に)

もう一度 `status.mjs` を走らせ、ネスト先で `node tools/hyperhelix.mjs validate` を実行して、次が全部満たされるか見る:

| 検査 | 期待 | 外れたときの対処 |
|---|---|---|
| `launchersMissing` | `[]` | `bootstrap` を再実行 |
| `hooksWired` | `true` | `wire-host-hooks.mjs` を再実行 |
| nest `hooksPath` | `tools/hooks` | ネスト先で `git config core.hooksPath tools/hooks` |
| `gitignoreCoversNest` | `true`(ホストが repo のとき) | `bootstrap` を再実行 |
| nest `nodeModules` | `true` | ネスト先で `npm ci` |
| `validate` | `0 error`。warning は 1 件ずつ理由を確認 | `HOOKS_PATH` / `NESTED_HOOKS_MISSING` は上の 2 行で解消する |
| nest `branch` | `project/<slug>` | `bootstrap` を再実行 |

満たされない項目は **劣化状態として明示**し、黙って先へ進まない(constitution: 検証せずに完了を主張しない)。

### 6. 更新の取り込み(origin/main → project/<slug>。取り込みのみ)

ネスト先で:

```bash
git fetch origin
git rev-list --left-right --count origin/main...HEAD    # behind ahead
```

- `behind > 0` なら `git merge origin/main`(`sync` コマンドは main 専用で project ブランチでは fail-closed なので使わない。
  手順の権威は `<nest>/assets/workflows/sync-conflict-guide.md` B 節)。
  - コンフリクトが出たら同ガイドの表に従う。`core/knowledge.yaml` の counters は **high-water(max)**、
    baseline 値(`last_always_read_*` / `last_index_read_chars` / `last_backlog_open_count`)は main を採る。
    ノートは両側 union。解消後 `node tools/hyperhelix.mjs validate` が 0 error であること。
  - merge コミットは `SYNC-YYYYMMDD: origin/main から N コミットを取り込み` の件名(SYNC- クラス。hh-record 不要)。
- **外向き操作はしない。** `project/<slug>` は利用者のローカル専用で、公開 repo へは push できない。
  `git push` / `reflux --apply` / PR 作成を提案しない。フレームワーク自体の改善を還元したい場合は、
  公開 repo の Issue、または fork からの PR を利用者が手で起こすよう案内するに留める。
  - ネスト先の pre-push フック(`tools/hooks/pre-push`)は push 時にだけ動く。ローカル完結の運用では発火しない。

### 7. 報告

次を日本語で簡潔に: ネスト先と branch / 導入・配線で変えたファイル(ホスト側: `.claude/settings.json`、
`.claude/commands/*.md`、`.gitignore`、`CLAUDE.md`)/ 検証表の結果と劣化項目 / 取り込んだコミット数と
コンフリクト解決の要点 / 次の一手 = `/helix <タスク>`。

## 判断に迷う点の既定

- 既存ネストが `doc/HyperHelix/` 以外にある → そのまま使う。移設はユーザーが明示したときだけ(gitignore・settings・
  launchers・CLAUDE.md の 4 か所が path を持つので、移設は全部まとめて同一作業で行う)。
- ネスト先の作業ツリーが dirty → 触らずに報告。merge も bootstrap の branch 切替も dirty を持ち越す。
- ホストが git repo でない → `.gitignore` 整備だけがスキップされる。他は同じ。
- `npm ci` が失敗(ネットワーク) → ローカルに別の HyperHelix checkout があればその `node_modules` を複製してよい
  (純 JS の 2 パッケージ)。junction ではなくコピー。
- 起動コマンドが `/skills:helix` のように名前空間付きで表示される → ネスト先の `.claude/commands/skills/` 配下の
  実体を直接見ている状態。ホスト側に `bootstrap` が置く薄いリダイレクト(`.claude/commands/helix.md`)があれば
  `/helix` で呼べる。無ければ `bootstrap` を再実行する。

## 参照

- `references/host-wiring.md` — CLAUDE.md の案内テンプレート、settings.json の完成形、検証の根拠資材一覧。
- ネスト先 `assets/workflows/session-bootstrap.md`(検証の権威)/ `assets/workflows/sync-conflict-guide.md`(同期・競合)/
  `assets/workflows/git-conventions.md`(ブランチモデル・履歴保護・SYNC- 規約)。
