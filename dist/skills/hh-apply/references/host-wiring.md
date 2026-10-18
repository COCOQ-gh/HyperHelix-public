# ホスト側配線の完成形

## CLAUDE.md に追記する節(リダイレクトのみ・ルールは写さない)

`<nest>` と `<slug>` を置換して、ホスト `CLAUDE.md` の冒頭付近(プロジェクト概要の直後)に入れる。

```markdown
## 開発プロセス
タスクは HyperHelix(`<nest>/` にネスト・別リポジトリ)のタスクループで実行する: `/helix <タスク>`。
フレームワークのエントリは `<nest>/entrypoint.md`。作業記録(コミット本文の hh-record)・学習ノートは
HyperHelix の `project/<slug>` ブランチへ、プロダクトのコード・ドキュメントは本リポジトリへコミットする。
```

## ホスト `.claude/settings.json` の完成形(hooks 部分)

`wire-host-hooks.mjs` が生成する形。既存の `permissions` / `env` 等はそのまま残る。

```json
{
  "hooks": {
    "PreCompact": [
      { "hooks": [ { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/<nest>/tools/compaction-hooks.mjs\" precompact" } ] }
    ],
    "PostCompact": [
      { "hooks": [ { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/<nest>/tools/compaction-hooks.mjs\" postcompact" } ] }
    ],
    "UserPromptSubmit": [
      { "hooks": [ { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/<nest>/tools/compaction-hooks.mjs\" prompt" } ] }
    ]
  }
}
```

ネスト内(`<nest>/.claude/settings.json`)の同種のフックは、Claude Code をホスト root で起動している限り
読まれない(不活性)。`validate` の `NESTED_HOOKS_MISSING` はホスト側の settings だけを見る。

## ホスト `.claude/commands/` に置かれる 4 ファイル

`bootstrap`(内部で `install-commands --nest <nest>`)が書く薄いリダイレクト:
`helix.md` `cycle.md` `sync.md` `compact-prep.md`。内容は「`<nest>/entrypoint.md` に従い、
`<nest>/.claude/commands/skills/<name>.md` の手順を `<nest>` をルートとして実行する」の案内のみ。
ホスト固有のコマンド(例: `report.md`)と同居してよい。

## ホスト `.gitignore`

```
# HyperHelix nested framework repo (session-bootstrap step 4)
<nest>/
```

ネスト先は別 git リポジトリ。ホストの index に入れない(submodule にもしない — 現行運用は plain clone)。

## 検証項目と根拠資材(ネスト先)

| 検査 | 根拠 |
|---|---|
| 起動コマンドの到達性(`.claude/commands/*.md` が `<nest>` を前置して解決) | `assets/workflows/session-bootstrap.md` §2 |
| `validate` が走る | 同 §3 |
| compaction hooks がホスト settings に配線されている | 同 §3b(ネスト構成の注記) |
| `core.hooksPath=tools/hooks`(pre-push で validate + verify --base) | 同 §3c |
| ネストリポジトリ境界(`.gitignore`) | 同 §4 |
| ブランチモデル(`project/<slug>` は main から派生、更新は origin/main の merge で受け取る) | `assets/workflows/git-conventions.md` Branch model |
| 同期・競合解決(counters high-water、ノート union) | `assets/workflows/sync-conflict-guide.md` |
| 直接 main push・force-push・rebase の禁止 | `assets/workflows/git-conventions.md` History protection |
