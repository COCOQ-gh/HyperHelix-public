# HyperHelix を自分のプロジェクトへ導入する(最短手順)

HyperHelix を知らない人が、既存のプロジェクトに HyperHelix を入れて最初のタスクを回すまでの手順です。
**人間がやることは 2 つ**: Claude Code でプロジェクトを開く → 下の 1 行を貼る。残りは AI エージェントが実行します。

## 必要なもの

- Claude Code
- `git`
- Node.js 20 以上(`node -v` で確認)

## 人間の手順

1. 導入したいプロジェクトのフォルダ(git リポジトリでなくても可)で Claude Code を開く。
2. 次の 1 行を貼る:

   ```
   https://raw.githubusercontent.com/COCOQ-gh/HyperHelix-public/main/INSTALL.md を読んで、その「エージェントの手順」どおりにこのプロジェクトへ HyperHelix を導入して
   ```

3. 完了報告が出たら、以後のタスクは `/helix <やりたいこと>` と頼む(認識されないときは Claude Code を一度開き直す)。

以上です。以下は AI エージェントが実行する部分で、人間が読む必要はありません。

---

## エージェントの手順(AI が実行する)

あなたは AI エージェントで、今開いている作業ディレクトリ(以下ホスト)に HyperHelix を導入する。
HyperHelix はホスト直下の `doc/HyperHelix/` に **別リポジトリとして clone**(ネスト配置)し、ホスト側には薄い起動コマンドと
フックだけを置く。ルール本体は clone した資材の中にある。ここに書かれた手順以外の判断を加えない。
報告は人間の言語(日本語)で行う。

### 0. 前提確認

```bash
git --version
node -v        # v20 以上
```

- どちらかが無ければ、人間に導入を依頼して止まる。
- ホストの root を決める: `git rev-parse --show-toplevel` が返ればそれ、返らなければ cwd。以下 `<HOST>` はその**絶対パス**。
- `<HOST>/doc/HyperHelix/tools/hyperhelix.mjs` が**既にある**なら、1 を飛ばして 2 から(再実行・更新の場合)。
- cwd 直下に `tools/hyperhelix.mjs` と `entrypoint.md` がある(= ここが HyperHelix 自身)なら、導入は不要。`/helix` をそのまま使うよう案内して終わる。

### 1. 取得

`<HOST>` で:

```bash
git clone https://github.com/COCOQ-gh/HyperHelix-public.git doc/HyperHelix
cd doc/HyperHelix
npm ci
```

(`npm ci` は依存 2 件 `yaml` と `ajv` を lockfile どおりに入れる。遅い環境では待つ。短いタイムアウトで切らない。)

### 2. ブランチ・起動コマンド・pre-push フック(一括)

slug = ホストのフォルダ名を英数字・`-`・`_` だけにしたもの(例: `my-app`)。これが HyperHelix 側のブランチ名 `project/<slug>` と
学習ノートの `project` になる。人間に聞かずに決めてよいが、報告で明示する。

`<HOST>/doc/HyperHelix` で:

```bash
node tools/hyperhelix.mjs bootstrap --project <slug> --host "<HOST>"
```

これが `project/<slug>` ブランチの作成、ホスト `.claude/commands/` への `helix / cycle / sync / compact-prep` の起動コマンド反映、
ホスト `.gitignore` への `doc/HyperHelix/` 追記、pre-push フック(`core.hooksPath`)、`validate` を行う。
この時点の `validate` は `NESTED_HOOKS_MISSING` を 1 件 warn する。次で解消する。

### 3. ホストの compaction フック配線

`<HOST>/doc/HyperHelix` で:

```bash
node dist/skills/hh-apply/scripts/wire-host-hooks.mjs --host "<HOST>" --nest doc/HyperHelix
```

ホスト `.claude/settings.json` に PreCompact / PostCompact / UserPromptSubmit の 3 フックを、既存の設定を保ったまま追加する。
settings.json が壊れた JSON のときは何も書かずに止まるので、人間に報告する。

### 4. 検証

`<HOST>/doc/HyperHelix` で:

```bash
node dist/skills/hh-apply/scripts/status.mjs --host "<HOST>"
node tools/hyperhelix.mjs validate
```

全部満たされていることを確認する。満たされない項目は**劣化状態として報告**し、完了とは言わない。

| 検査 | 期待 |
|---|---|
| `status` → `host.launchersMissing` | `[]` |
| `status` → `host.hooksWired` | `true` |
| `status` → `host.gitignoreCoversNest` | `true`(ホストが git リポジトリのとき) |
| `status` → `nests[0].branch` | `project/<slug>` |
| `status` → `nests[0].hooksPath` | `tools/hooks` |
| `status` → `nests[0].nodeModules` | `true` |
| `validate` | `0 error(s), 0 warning(s).` |

### 5. ホスト CLAUDE.md への案内(任意・推奨)

ホストに `CLAUDE.md` があり `doc/HyperHelix/entrypoint.md` への言及が無ければ、次の節を追記する(追記内容を示してから行う)。
無ければ新規作成してよい。ルール本体は写さない。

```markdown
## 開発プロセス
タスクは HyperHelix(`doc/HyperHelix/` にネスト・別リポジトリ)のタスクループで実行する: `/helix <タスク>`。
フレームワークのエントリは `doc/HyperHelix/entrypoint.md`。作業記録(コミット本文の hh-record)・学習ノートは
HyperHelix の `project/<slug>` ブランチへ、プロダクトのコード・ドキュメントは本リポジトリへコミットする。
```

### 6. 報告

次を簡潔に: ネスト先(`doc/HyperHelix/`)と branch(`project/<slug>`)/ ホスト側で変えたファイル(`.claude/commands/*.md`・
`.claude/settings.json`・`.gitignore`・`CLAUDE.md`)/ 検証表の結果と劣化項目 / 次の一手 = `/helix <タスク>`
(`/helix` が認識されないときは Claude Code を開き直す)。

### やらないこと

- `doc/HyperHelix` から `git push` しない。`project/<slug>` は利用者のローカル専用で、公開リポジトリへは push できない。
- `reflux` や PR 作成を提案しない。フレームワークへの提案は利用者が公開リポジトリの Issue で行う。
- HyperHelix の資材(`constitution.md`・`core/`・`assets/`・`tools/`)を書き換えない。

## 更新したいとき

`<HOST>/doc/HyperHelix` で `git fetch origin && git merge origin/main`。コンフリクトの解き方は
`assets/workflows/sync-conflict-guide.md` B 節。その後 `node tools/hyperhelix.mjs validate` が 0 error であること。

## 何度も導入するなら

同じ手順を自動化した Claude Code スキル `/hh-apply` が `dist/skills/hh-apply/` にある。
`~/.claude/skills/hh-apply/` にコピーしておくと、以後は各プロジェクトで `/hh-apply` と頼むだけでよい(手順は同梱 README)。

---

## English

To add HyperHelix to an existing project: open the project in Claude Code and paste this one line —

```
Read https://raw.githubusercontent.com/COCOQ-gh/HyperHelix-public/main/INSTALL.md and follow its "エージェントの手順" (agent steps) to install HyperHelix into this project.
```

Prerequisites are `git`, Node.js 20+, and Claude Code. The agent clones the public repository into `doc/HyperHelix/`, runs `bootstrap`, wires the host hooks, verifies the layout, and reports. Then run tasks with `/helix <task>`.
