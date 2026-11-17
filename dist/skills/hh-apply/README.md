# hh-apply — HyperHelix を自分のプロジェクトへ導入する Claude Code スキル

`/hh-apply` は、今開いているプロジェクト(ホスト)に HyperHelix をネスト配置で導入し、起動時検証を通し、
公開リポジトリの更新を取り込む **配管専用**のスキルです。ルール本体はフレームワーク資材側にあり、
このスキルは `git clone` → `bootstrap` → フック配線 → 検証 → 更新取り込み、の手順だけを持ちます。

> **1 回だけ導入するなら、このスキルは要りません。** リポジトリ直下の [INSTALL.md](../../../INSTALL.md) 冒頭の 1 行を
> Claude Code に貼れば、同じ手順を AI がその場で実行します。このスキルは複数プロジェクトで繰り返し使う人向けです。

## インストール(利用者側・1 回)

Claude Code のユーザースキルとして `~/.claude/skills/hh-apply/` に置きます。

```bash
git clone --depth 1 https://github.com/COCOQ-gh/HyperHelix-public.git /tmp/hyperhelix-public
mkdir -p ~/.claude/skills
cp -r /tmp/hyperhelix-public/dist/skills/hh-apply ~/.claude/skills/hh-apply
```

PowerShell:

```powershell
git clone --depth 1 https://github.com/COCOQ-gh/HyperHelix-public.git $env:TEMP\hyperhelix-public
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
Copy-Item -Recurse "$env:TEMP\hyperhelix-public\dist\skills\hh-apply" "$HOME\.claude\skills\hh-apply"
```

必要なもの: `git`、Node.js 20 以上、Claude Code。

## 使い方

導入したいプロジェクトのルートで Claude Code を起動し、次のように頼みます。

```
/hh-apply
```

または「このプロジェクトに HyperHelix を入れて」「HyperHelix を最新にして」と言うだけでもこのスキルが選ばれます。
スキルは次の順に進めます(詳細は `SKILL.md`)。

1. `scripts/status.mjs` で現状を測る(読み取りのみ)
2. slug(ノートとブランチ名に使う ID)とネスト先(既定 `doc/HyperHelix/`)を確認
3. `https://github.com/COCOQ-gh/HyperHelix-public.git` を clone し `npm ci`
4. `node tools/hyperhelix.mjs bootstrap --project <slug> --host <ホスト root>` で `project/<slug>` ブランチ・起動コマンド・`.gitignore`・pre-push フックを一括設定
5. `scripts/wire-host-hooks.mjs` でホストの `.claude/settings.json` に compaction フックを配線
6. `validate` と `status.mjs` で検証し、満たせない項目は劣化状態として報告
7. 公開リポジトリの更新があれば `git merge origin/main` で取り込む

導入後のタスクは `/helix <タスク>` で実行します。

## 配布版の方針

- `project/<slug>` ブランチは **利用者のローカル専用**です。公開リポジトリへの push・PR・`reflux` は提案しません。
- フレームワーク自体の改善を還元したい場合は、公開リポジトリの Issue か fork からの PR を手で起こしてください。
- ネスト先は別 git リポジトリとしてホストの `.gitignore` に入ります(submodule にはしません)。

## 構成

| ファイル | 役割 |
|---|---|
| `SKILL.md` | スキル本体(手順・固定値・迷う点の既定) |
| `scripts/status.mjs` | ホストとネストの配線状態を JSON で返す(書き込み・ネットワークなし) |
| `scripts/wire-host-hooks.mjs` | ホスト `.claude/settings.json` へ compaction 3 フックを冪等に追加 |
| `references/host-wiring.md` | CLAUDE.md の案内テンプレート、settings.json の完成形、検証の根拠資材 |
