# HyperHelix — 三重螺旋・自己進化型バイブコーディングフレームワーク

3つの先行フレームワーク(HelixPDCA / Helix_Reflex / MetaHelix)を統合した後継フレームワーク。
本ファイルは人間向けの概要・運用ガイドであり、AIが稼働時に参照する資材ではない。

> **Public release status:** 公開用 clean line(内部開発線から匿名化して再生成)。ライセンスは MIT です。
> 検証記録と公開方針は [PUBLIC_RELEASE.md](PUBLIC_RELEASE.md) を参照。

初めて読む場合は [GETTING_STARTED.md](GETTING_STARTED.md) から始めると、最小の検証手順と読む順序だけを追える。

> **HH-011 は main へ統合済み** — 起動文脈で orchestrator / executor を決める
> 2ロール運用を含む（プラットフォーム名には固定しない）。ロール規約の正本は
> [assets/workflows/agent-roles.md](assets/workflows/agent-roles.md)、ブランチ運用は
> [assets/workflows/git-conventions.md](assets/workflows/git-conventions.md) を参照。

---

## コンセプト: 三重螺旋

3本の螺旋が1本の蒸留パイプラインを共有する。

```
  実行螺旋                知識螺旋                統治螺旋
  (タスクを回す)          (経験を資産化する)      (人間が終端する)
      │                       │                       │
  Search ─→ Plan          学習ノート(台帳)        amendments.md
      │       │            strength で並べる            ↑
  Distill   Execute            │                   高影響変更のみ
      ↑       │                │                   HH提案として起票
  Evaluate ←──┘                │                       │
      │                        │                   人間が裁可
      └── D7でノート更新 ─(重要なら人間が昇華)→ constitution.md / amendments.md
```

- **実行螺旋** — すべてのタスクは Search → Plan → Execute → Evaluate → Distill を通る。
  深度モード(micro / light / standard / full / spike)で工程は縮むが、フェーズは消えない。
- **知識螺旋** — 経験は学習ノートとして台帳化され、`strength` を並び順のヒントにして次タスクへ渡す。
  自動昇格・自動降格は行わず、裁量的なノート操作は1タスクにつき最大1つ(ノート追加または `strength +/-1`)に留める。
  ただし実際に適用したノートの帰属記録(`--use` / `--miss`)は証拠に基づく必須処理で、この枠に数えない(HH-053/077)。
- **統治螺旋** — 影響の大きい変更(ノートのルール昇華、θ変更、ハード削除・大規模統廃合、憲法変更)
  だけが `amendments.md` の単一窓口で人間承認される。それ以外の軽量なノート操作は自動。

フレームワーク自身の改善には独立機構がない。プロセスの教訓は
{project: hyperhelix, genre: framework} を文脈とする通常の学習ノートとして同じパイプラインを流れる(メタ畳み込み)。

## 系譜

| 継承元 | HyperHelix へ引き継いだもの |
|---|---|
| **HelixPDCA** | 深度モード、Execute前の計画最低要件(目的・受入条件・検証計画)、検証ポリシー、ユーザー要求の精緻化原則 |
| **Helix_Reflex** | 2層権威モデル(intent/execution)、amendments 単一人間ゲート、検証ツール、知識コーパス(運用191タスク分)。初期の tier×scope 整数ゲートは HH-016 でノート台帳へ簡素化 |
| **MetaHelix** | 5フェーズの工程定義、フェーズゲートと証跡主義、チェックリスト・タスクブリーフ、例外処理 EX-1〜5、アンチパターン、自己目的化防止 |

統合時の設計判断の全記録は [docs/設計書.md](docs/設計書.md)、創設裁可は [amendments.md](amendments.md) の HH-000 を参照。
継承元の内容は設計書と創設ログに蒸留済みであり、HyperHelix の運用資材はこのリポジトリ直下の構成だけで完結する。

## ファイル構成

```
constitution.md        # 憲法(ユーザー層・日本語・intent の権威)
amendments.md          # 人間承認の単一窓口(ユーザー層・日本語。governance/ から生成される view・HH-067)
governance/
└── amendments/        #   amendments の構造化正本(registry.yaml=lifecycle state + bodies/HH別本文 + view-template)
entrypoint.md          # エントリポイント正本(プラットフォーム中立・HH-059)
AGENTS.md / CLAUDE.md  # プラットフォーム md(entrypoint.md への薄いリダイレクト)
LICENSE                # MIT License
GETTING_STARTED.md     # 初回導入ガイド
PUBLIC_RELEASE.md      # 公開方針・検証記録・更新履歴
SECURITY.md            # 脆弱性報告と秘密情報取り扱い
CONTRIBUTING.md        # コントリビューション手順
CODE_OF_CONDUCT.md     # 行動規範
core/                  # AI層(英語・execution の権威)
├── contracts.json     #   識別子・固定語彙等の機械可読な契約正本(HH-066)
├── loop.yaml          #   タスクループ(5フェーズ・深度モード・例外・メタ畳み込み)
├── gates.yaml         #   検索上限・収束ラチェット・外部価値ゲート(変更は人間ゲート)
├── knowledge.yaml     #   学習ノート台帳とカウンタ(main 台帳)
├── knowledge/         #   project 別 leaf 台帳 + manifest.yaml(台帳一覧と所有権の宣言・SC-05a)
├── dictionary.yaml    #   旧タグ辞書(HH-016以降 deprecated・履歴参照)
└── routing.yaml       #   情報ルーティングと検証ポリシー
assets/
├── checklists/        #   phase-gate / search / plan / execute / evaluate / distill / framework-review
├── workflows/         #   session-bootstrap / git-conventions / agent-roles / concurrency / compaction / exception-handling ほか
└── ai/                #   anti-patterns.md(アンチパターン集)
tasks/                 # HH-081 以前の作業記録の凍結済み目録(INDEX.md)。現行の作業記録はコミット本文の hh-record
tools/hyperhelix.mjs   # 検証・D7カウンタ更新ツール(Node.js + package依存 yaml/Ajv で動作)
tools/lib/             # contracts.json共有parser/formatter + framework evidence classifier
test/                  # Node標準node:testの回帰テストとfixture helper
.claude/commands/      # /helix(タスク実行)・/cycle(自己改善サイクル)・/sync(origin/main 同期)
.claude/settings.json  # Claude の圧縮hook adapter(共有Node runtimeへ接続)
.codex/                # Codex の圧縮hook adapter・compact prompt・config
.github/workflows/     # GitHub Actions で verify(L1-L4)と e2e を実行(main と public/** が対象)
```

## クイックスタート

**タスクを実行する**

```
/helix <タスク内容>
```

または手動で: `entrypoint.md`(正本)の読み込み順序に従って資材を読み、`assets/checklists/phase-gate.md`
からループを開始する。

> 起動コマンドの実体は `.claude/commands/skills/*.md` にあるため、Claude Code の版によっては
> `/skills:helix`・`/skills:cycle` のように名前空間付きで表示される。中身は同じ。

**フレームワークを点検・改善する**

```
/cycle
```

**資材の整合性を検証する**

```powershell
npm ci                                                                    # 初回のみ: 外部dependency導入(yaml + Ajv の2件限定・HH-067。lockfile固定)
node tools/hyperhelix.mjs validate                                       # スキーマ・カウンタ・ノート・task-list・アンカー・旧語 active scan の検証
node tools/hyperhelix.mjs verify --base <ref>                           # L1 Structure→L2 Contract→L3 Behavior→L4 Evidence の総合判定(push 前・CI)
node tools/hyperhelix.mjs contract-doc --check                           # core/contracts.json から生成した契約リファレンスのdrift検査
node tools/hyperhelix.mjs amendments-doc [--check]                       # governance/amendments 正本から amendments.md を生成 / drift検査(SC-04・手編集禁止)
node tools/hyperhelix.mjs migrate-canon (--check | --apply)              # SC-06: domain別 legacy→正本閉鎖レポート(total/converted/equivalent/rejected/legacy-live)。--apply は green 時のみ view 修復 + epoch 前進
node tools/hyperhelix.mjs bump --task ID [--use|--miss NOTE-ID] [--review [--review-source SOURCE]] # D7更新。review source既定は中立な framework review
node tools/hyperhelix.mjs brief --date YYYYMMDD --mode standard           # タスク ID を claim(ファイルは作らない)。hh-record の雛形を出力
node tools/hyperhelix.mjs finish --task ID --commit --message "…"         # 完了処理: L1-L4 verify→秘密scan→冪等bump→再verify→commit(fail-closed)
node tools/hyperhelix.mjs capture-plan --trigger <fixed> --artifact <non-governance|pending-hh> --captured-artifact <path> # HH-068: capture depth/linkageをread-only計画
node tools/hyperhelix.mjs review-snapshot                                # HH-068: review開始baseline JSONをstdoutへ出力(リポジトリ外に保存)
node tools/hyperhelix.mjs review-check --baseline <外部JSON> --journal <外部JSON> [--isolated] # exit 0=review-only / 2=task-required / 3=unverified
node tools/hyperhelix.mjs update-codex-skill [--check]                    # Codex 補完用 hyperhelix-commands スキルを検査/最新化
node tools/hyperhelix.mjs sync [--dry-run]                                # /sync: origin/main ff取り込み→validate→PR(HH-060/069/070。通常はCI後merge、統治pathは人間待ち)
node tools/hyperhelix.mjs reflux [--apply]                                # project/variant→origin/main起点branchへframework-only還元→PR(dry-run既定)
node tools/hyperhelix.mjs adopt-notes                                     # deprecated互換alias。ID/ファイルは書換えず恒久ID移行手順だけを表示
node tools/hyperhelix.mjs wo-watch <出力file> [--stall 180] [--budget 600] # 委任 WO の liveness 監視(HH-063 §9e。停滞=exit2/予算超過=exit3/完了=exit0)
node tools/hyperhelix.mjs bootstrap --project <slug> [--host <dir>]        # 新規プロジェクト導入ワンショット: project/<slug> ブランチ作成/切替→ランチャー反映→ホスト gitignore→validate→読み込み順序ガイド
node tools/hyperhelix.mjs install-commands --to <hostdir> [--nest <rel>]  # .claude/commands(+skills/) をホスト直下へフラット反映(verbatim / 入れ子リダイレクト)
git config core.hooksPath tools/hooks                                     # pre-push 強制(validate + verify --base ブロック / main 未反映 hunk 警告)
node tools/hyperhelix.mjs cost-report [--write-baseline] [--full]          # R7: /cycle delta既定、--full全workflow、基準不能はfull fallback
node tools/hyperhelix.mjs consolidation-report [--write-baseline] [--full] # R8: 既定note5+backlog5、--full全候補。baseline writerは/cycleでcost後に直列実行
node tools/hyperhelix.mjs next-hh-id [--offline]                          # HH起票番号をlocal+origin/main maxで採番。突合失敗はnonzero、offlineは明示fallback
```

`sync` と `reflux --apply` の PR publish には、認証済み GitHub CLI (`gh auth status`) が必要。
両コマンドは `origin/main` へ直接 push せず、branch protectionなしでもPRのCI checksを待つ。
HH-069/070により同一publisherを許可し、統治対象PRはchecks後も自動mergeせず、人間が差分を確認して
merge commit方式で手動mergeする。CODEOWNER Approveは必須にせず、admin bypassも使用しない。
private/free運用ではbranch protectionは任意ハードニングであり、direct-main/force-push/rebase禁止は
GitHubの技術的拒否ではなく、ツールと人間のhonor-based規律である。

`/helix`・`/cycle`・`/sync` などは Claude 側の薄い起動コマンド(`.claude/commands/skills/*.md`)で、
`hyperhelix-commands` は Codex 側の補完/dispatch 用 Skill(`~/.codex/skills/hyperhelix-commands`)である。
圧縮・復旧・Distill Inbox の正本は `assets/workflows/compaction.md`。Claude と Codex の adapter は
同じ `tools/compaction-hooks.mjs` を呼び、hook 非対応エージェントには同文書の手動 fallback を使う。
コマンド仕様や `tools/hyperhelix.mjs` を変えた後は `update-codex-skill --check` でズレを検出し、
必要なら `update-codex-skill` で再生成する。

**人間(あなた)がやること**

1. `amendments.md` の Pending をオンデマンドで裁可する(Approved / Rejected / Deferred)。裁可の記録は `governance/amendments/registry.yaml` の status/attestation 更新 + `amendments-doc` 再生成(SC-04)。
2. axiom を承認したら `constitution.md` の「人間が鋳造した axiom」へ追記する。
3. それ以外は何もしなくてよい。検出は自動、終端だけが人間の仕事。

## 運用の要点

- **証跡主義**: 空のテンプレート・未記入の表は証跡ではない。フェーズゲートはこれを機械的に確認する。
- **失敗帰属は適用単位**: SEARCH で取得しただけのノートは失敗の責任を負わない。具体成果物に効いたノートだけが `strength +/-1` の候補になる。
- **ノート台帳は作業記憶**: `strength` は並び順ヒントであり、確率・スコア・昇格ゲートではない。重要な教訓は人間が constitution / amendments へ昇華する。
- **コスト有界**: タスクごとのノートロードは上位6件まで。台帳は育ってよいが、1タスクのコストは一定。
- **自己目的化防止**: project/variant では、フレームワーク改善のみのサイクルが3回続いたら次は必ず実タスク。
  **`main` はフレームワーク開発ブランチのため R6 は STOPPED**(この強制・警告・連続数記録なし。ROI 判断は人間の運用判断。HH-025)。
  また HyperHelix しか存在しない作業ディレクトリでは調整用セッションとして実タスク必須判定を延期する。
  ライブ状態と連続回数の単一権威は `assets/checklists/framework-review.md` R6。
- **git 運用**: 1タスク=1コミット。作業記録はコミット本文の `hh-record` ブロックが正本で(HH-081)、
  `brief` で ID を claim し、`finish` が L1-L4 verify → 秘密scan → bump → commit を fail-closed で一括実行する。
  main の履歴は監査証跡の一部であり書き換えない。規約は [assets/workflows/git-conventions.md](assets/workflows/git-conventions.md)。
