# HyperHelix — 三重螺旋・自己進化型バイブコーディングフレームワーク

3つの先行フレームワーク(HelixPDCA / Helix_Reflex / MetaHelix)を統合した後継フレームワーク。
本ファイルは人間向けの概要・運用ガイドであり、AIが稼働時に参照する資材ではない。

> **Public release status:** 初回公開準備済み。ライセンスは MIT です。
> 検証記録と公開方針は [PUBLIC_RELEASE.md](PUBLIC_RELEASE.md) を参照。

初めて読む場合は [GETTING_STARTED.md](GETTING_STARTED.md) から始めると、最小の検証手順と読む順序だけを追える。

> **HH-011 は main へ統合済み** — Claude がオーケストレータ、Codex 等が
> 実行エージェントとなる2ロール運用を含む。ロール規約は
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
      │       │            last_used で引く             ↑
  Distill   Execute            │                   高影響変更のみ
      ↑       │                │                   HH提案として起票
  Evaluate ←──┘                │                       │
      │                        │                   人間が裁可
      └── D7でノート更新 ─(重要なら人間が昇華)→ constitution.md / amendments.md
```

- **実行螺旋** — すべてのタスクは Search → Plan → Execute → Evaluate → Distill を通る。
  深度モード(micro / light / standard / full / spike)で工程は縮むが、フェーズは消えない。
- **知識螺旋** — 経験は学習ノートとして台帳化され、`last_used` を主な検索順の事実値、`strength` を副次ヒントとして次タスクへ渡す。
  自動昇格・自動降格は行わず、1タスクにつき最大1つのノート追加または `strength +/-1` / `last_used` 更新に留める。
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
amendments.md          # 人間承認の単一窓口(ユーザー層・日本語)
AGENTS.md / CLAUDE.md  # エントリポイントガイド(ポインタ専用)
LICENSE                # MIT License
GETTING_STARTED.md     # 初回導入ガイド
PUBLIC_RELEASE.md      # 一般公開前チェックリスト
SECURITY.md            # 脆弱性報告と秘密情報取り扱い
CONTRIBUTING.md        # コントリビューション手順
CODE_OF_CONDUCT.md     # 行動規範
core/                  # AI層(英語・execution の権威)
├── loop.yaml          #   タスクループ(5フェーズ・深度モード・例外・メタ畳み込み)
├── gates.yaml         #   検索上限・収束/外部価値ゲート(変更は人間ゲート)
├── knowledge.yaml     #   学習ノート台帳とカウンタ
├── dictionary.yaml    #   旧タグ辞書(HH-016以降 deprecated・履歴参照)
└── routing.yaml       #   情報ルーティングと検証ポリシー
assets/
├── checklists/        #   phase-gate / search / plan / execute / evaluate / distill / framework-review
├── templates/         #   task-brief.md(タスクブリーフのひな形)
├── workflows/         #   exception-handling / git-conventions / task-list-schema / concurrency
└── ai/                #   anti-patterns.md(アンチパターン集)
tasks/                 # タスクブリーフ(実行中・完了済み)
tools/hyperhelix.mjs   # 検証・D7カウンタ更新ツール(標準Nodeのみで動作)
.claude/commands/      # /helix(タスク実行)・/cycle(自己改善サイクル)・/sync(origin/main 同期)
.github/workflows/     # GitHub Actions で validate を実行
```

## クイックスタート

**タスクを実行する**

```
/helix <タスク内容>
```

または手動で: `AGENTS.md` の読み込み順序に従って資材を読み、`assets/checklists/phase-gate.md`
からループを開始する。

**フレームワークを点検・改善する**

```
/cycle
```

**資材の整合性を検証する**

```powershell
node tools/hyperhelix.mjs validate                                       # スキーマ・カウンタ・ノート・task-list・アンカー・旧語 active scan の検証
node tools/hyperhelix.mjs bump --task ID [--use|--miss N-NNN] [--review]  # D7: カウンタ/ノート更新(冪等)。--update-brief で HH:D7 アンカーも更新
node tools/hyperhelix.mjs brief --date YYYYMMDD --mode standard --title … # アンカー付きブリーフを生成(次NNNを claim・上書き拒否)
node tools/hyperhelix.mjs finish --task ID --commit --message "…"         # 完了処理: preflight検証→秘密スキャン→冪等bump→final検証→commit(fail-closed)
node tools/hyperhelix.mjs cost-report                                     # R7(HH-026): 起動固定費・無索引バルク・大型資材・ブリーフ overhead(前回比トレンド差分を自動記録)
node tools/hyperhelix.mjs update-codex-skill [--check]                    # Codex 補完用 hyperhelix-commands スキルを検査/最新化
node tools/hyperhelix.mjs sync [--dry-run]                                # /sync: origin/main と同期(B 取り込み→validate→A push。HH-034)
node tools/hyperhelix.mjs reflux [--apply]                                # project/variant→main の framework-only 還元(dry-run 既定)
node tools/hyperhelix.mjs archive-briefs [--keep N] [--dry-run]           # 完了ブリーフを tasks/INDEX.md へ退避(HH-031 Phase2)
node tools/hyperhelix.mjs install-commands --to <hostdir> [--nest <rel>]  # .claude/commands をホスト直下へ反映(verbatim / 入れ子リダイレクト)
node tools/hyperhelix.mjs consolidation-report                            # R8(HH-040): 冗長/統廃合/陳腐化の候補を提案(情報のみ・人間ゲート。backlog net change 自動記録)
```

`/helix`・`/cycle`・`/sync` などは Claude 側の薄い起動コマンド(`.claude/commands/skills/*.md`)で、
`hyperhelix-commands` は Codex 側の補完/dispatch 用 Skill(`~/.codex/skills/hyperhelix-commands`)である。
コマンド仕様や `tools/hyperhelix.mjs` を変えた後は `update-codex-skill --check` でズレを検出し、
必要なら `update-codex-skill` で再生成する。

**人間(あなた)がやること**

1. `amendments.md` の Pending をオンデマンドで裁可する(Approved / Rejected / Deferred)。
2. axiom を承認したら `constitution.md` の「人間が鋳造した axiom」へ追記する。
3. それ以外は何もしなくてよい。検出は自動、終端だけが人間の仕事。

## 運用の要点

- **証跡主義**: 空のテンプレート・未記入の表は証跡ではない。フェーズゲートはこれを機械的に確認する。
- **失敗帰属は適用単位**: SEARCH で取得しただけのノートは失敗の責任を負わない。具体成果物に効いたノートだけが `strength +/-1` の候補になる。
- **ノート台帳は作業記憶**: `last_used` は検索順の主キー、`strength` は副次ヒントであり、確率・スコア・昇格ゲートではない。重要な教訓は人間が constitution / amendments へ昇華する。
- **コスト有界**: タスクごとのノートロードは上位6件まで。台帳は育ってよいが、1タスクのコストは一定。
- **自己目的化防止**: project/variant では、フレームワーク改善のみのサイクルが3回続いたら次は必ず実タスク。
  **`main` はフレームワーク開発ブランチのため R6 は STOPPED**(この強制・警告・連続数記録なし。ROI 判断は人間の運用判断。HH-025)。
  また HyperHelix しか存在しない作業ディレクトリでは調整用セッションとして実タスク必須判定を延期する。
  ライブ状態と連続回数の単一権威は `assets/checklists/framework-review.md` R6。
- **git 運用**: 1タスク=1コミット(validate パス後・サマリ前)。main の履歴は監査証跡の一部であり書き換えない。
  規約は [assets/workflows/git-conventions.md](assets/workflows/git-conventions.md)。
