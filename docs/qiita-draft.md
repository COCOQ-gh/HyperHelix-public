# HyperHelix — AI エージェントに「開発プロセス」を内側から適用したフレームワーク

<!-- Qiita タグ候補: AI, LLM, Claude, エージェント, プロンプトエンジニアリング, フレームワーク設計, ClaudeCode -->
<!-- 冒頭140字案: AI エージェント用プロンプトを、憲法・変更管理・lint・レビュー対象として育てる。HyperHelix は、プロセス改善そのものを CI/CD するための実験的フレームワークです。 -->

---

## はじめに

AI エージェントに仕事を頼むとき、ほとんどのフレームワークは「いいプロンプトを書いて AI をブラックボックスとして使い回す」設計です。

**HyperHelix** は逆の発想を取ります。

> AI が使うフレームワーク自体を、ソフトウェアエンジニアリングの開発プロセス（PR・ゲート・lint・変更管理）で管理する。

フレームワークが CI/CD の対象になる、という少し変わったアーキテクチャです。

---

## 全体像：三重螺旋

名前の由来でもある「3本の螺旋が1本のパイプラインを共有する」構造が核心です。

```
実行螺旋  ────────────────────────────┐
                                      ├── 蒸留パイプライン ──→ フレームワーク改善
知識螺旋  ──[ノート蓄積]──────────────┤
                                      │
統治螺旋  ──[人間承認 amendments.md]──┘
```

| 螺旋 | 役割 | 権威ファイル |
|------|------|------------|
| 実行 | 全タスクを 5 フェーズで実行 | `core/loop.yaml` |
| 知識 | 経験をノートとして蒸留・蓄積 | `core/knowledge.yaml` |
| 統治 | 高影響変更だけ人間が単一窓口で裁可 | `amendments.md` |

```mermaid
flowchart LR
  A["実行螺旋<br/>Search / Plan / Execute / Evaluate / Distill"] --> D["蒸留パイプライン"]
  B["知識螺旋<br/>core/knowledge.yaml"] --> D
  C["統治螺旋<br/>amendments.md"] --> D
  D --> E["次タスクの手順・検証・ルールへ反映"]
```

---

## 5 フェーズループ

すべてのタスクは例外なく次の 5 フェーズを通ります（深度モードで工程は縮小するが、フェーズは削除しない）。

```
Search → Plan → Execute → Evaluate → Distill
  S1-S4    P1-P6    E1-E4     V1-V3      D1-D7
```

フェーズごとに **成果物(artifact)** を定義し、次フェーズへの入力とする設計は、ソフトウェアの CI パイプラインそのものです。

---

## ユニークな設計判断 6 選

### 1. 「ミスはプロセスの問題」を憲法に刻む

```markdown
# constitution.md（抜粋）
ミスは実行者ではなくプロセスの問題として扱う。改善対象は常にプロセスである。
```

失敗のたびに AI のキャラクターを調整するのではなく、**手続き（プロセス）を改訂する**方向に向かいます。これが「螺旋が回る」ことの意味です。

---

### 2. amendments.md — 憲法改正プロセスの単一窓口

高影響変更（新しいルールの追加・ゲートパラメータ変更・大規模統廃合）だけを `amendments.md` に集約し、必ず人間承認を経由します。

承認の証跡には `ratified_by` / `ratified_at` フィールドを付与します（HH-042、HH-046 で再定義）。現在は各提案の状態を構造化正本 `governance/amendments/registry.yaml` に持ち、`amendments.md` はそこから生成される閲覧用の view です（HH-067。手編集すると validate が drift として落とします）。

```yaml
# governance/amendments/registry.yaml（抜粋）
- id: HH-042
  title: "承認ゲートの技術的可視化: 人間承認証跡フィールドの追加"
  type: 運用規約・統治変更(提案フォーマット + validate)
  status: Approved
  ratified_by: COCOQ-gh
  ratified_at: 2026-06-24
  supersedes: []
  body: bodies/HH-042.md
```

validate コマンドが **`AMEND_RATIFIED_BY_EMPTY` チェック**を自動実行し、`ratified_by` / `ratified_at` が空の Approved エントリを警告します。逆に Pending なのに承認証跡を持つエントリはエラーです。

この設計の動機は、「AI に絶対に自己承認させない技術的な鍵」を作れたからではありません。むしろ逆で、AI がリポジトリに書き込める限り、承認フィールドは技術的には偽造可能です。だから HyperHelix はこれを **self-attested approval** と呼び、強制ではなく監査可能性を上げる仕組みとして扱います。脆弱性を隠さず、可視化できるところから機械チェックへ寄せていく、という方針です。

---

### 3. AP-003「宣言↔消費」クロスリファレンス公理

HyperHelix で最も繰り返し問題になったのが「新機能を追加したが、それを参照する側（checklist / template / schema）を更新し忘れる」という漏れです。

これを **AP-003 anti-pattern** として定義し、3 層で防止しています：

```
L1: machine validators（validate コマンドに自動検出ロジックを追加）
L2: Plan フェーズの P6 ゲート（能力追加時は同一変更リストで消費側を必須配線）
L3: post-merge Codex 敵対的監査（機械が捕えない意味的漏れを人間+AI で発見）
```

たとえば、ツールに新しいサブコマンドを追加しても、README や評価チェックリストや補完用 Skill に反映されなければ、実際の運用者はその機能に気づけません。HyperHelix では、そうした「宣言したが消費者がいない」状態を AP-003 として扱います。

たとえば `update-codex-skill --check` を追加したときは、ツールだけでなく、README と evaluate checklist も同じ変更で更新しました。機能を足した瞬間に、その機能を呼ぶ人間・AI・検証器の経路まで同時に配線する、という考え方です。

```mermaid
flowchart LR
  A["宣言<br/>tools / schema / command"] --> B["消費者<br/>README / checklist / Skill"]
  B --> C["機械検証<br/>validate / --check"]
  C --> D["敵対監査<br/>意味的な漏れを見る"]
  D --> A
```

---

### 4. cost-report + R7 ／ consolidation-report + R8 の対称設計と収束指標

フレームワーク自身の「コスト」と「冗長性」を定期測定するための 2 本の計測ツールを持ちます。

```
node tools/hyperhelix.mjs cost-report          # 起動時に読む資材の文字数・ツール面の規模を測定
node tools/hyperhelix.mjs consolidation-report # 冗長クラスタ・lifecycle drift・backlog 件数を測定
```

さらに、**収束指標**として前回 `/cycle` 比のトレンド差分を記録します（ベースラインを書き込むのは `/cycle` 時の `--write-baseline` だけ）。

```
R7a: 起動時の実読コスト 59,691 文字 = 常時必読 34,031 + 索引読み冒頭 25,660  ← cost-report
R8c: process-backlog open 14 件(うちこのブランチで焼却可能 12 件)           ← consolidation-report
```

当初は行数で測っていましたが、1行の長さで実コストがぶれるため文字数へ切り替え（HH-073）、さらに「冒頭だけ読む索引」も計測対象に入れました（HH-082）。

`▲` が続くなら肥大化シグナル、`▼` が続くなら焼却進行中という判断ができます。測るだけでは終わらせず、**同じ指標が 3 回連続で増えたら、次の `/cycle` は新規追加より先に削減を行うことを義務化**しています（収束ラチェット、HH-050）。**改善行為そのものが肥大化する問題を、フレームワーク内部のレンズで収束値として捕捉し、行動まで強制する**構造です。

---

### 5. 自己目的化の公理と R6 enforcement

```markdown
# constitution.md（抜粋）
改善サイクルは成果物を作るために存在する。
フレームワークのみを対象とするサイクルが 3 回続いたら、次は実タスクを優先する。
改善活動が自己目的化したら、それ自体を改善対象とする。
```

AI エージェントが自分のプロンプト最適化に閉じることへの **制度的ブレーキ**です。

さらにブランチ意味論と組み合わせています：

| ブランチ | R6 enforcement | 意味 |
|---------|---------------|------|
| `main` | STOPPED | フレームワーク開発が本来の目的。人間が判断 |
| `project/*` | ACTIVE | 実プロジェクト作業が期待されるため監視する |

ただし、ここで一度設計ミスが起きました。R7d という「敵対的類推」レンズは、本来は「この設計を却下する競合フレームは何か」を問うためのものでした。ところが運用中に、実プロジェクト未適用・ROI 未実証を指摘するレンズとしても使われ、2つの役割が混ざりました。

その結果、ROI 側の誤検知を避けるために R7d 全体を `main` で停止したところ、同時に「より単純な設計はないか」と問うフレーム却下機能まで止まってしまいました。HH-056（承認済み）はこの混線を分割し、ROI は外部価値ゲートへ委譲しつつ、フレーム却下レンズだけを `main` で復活させました。このレンズは自己参照の盲点を避けるため、別モデルへ委託して回すことを推奨しています。HyperHelix では、こうした「よいチェックを束ねすぎて片方の問題で全体が死ぬ」失敗も、プロセスの改善対象になります。

---

### 6. AI エージェントリスクへの設計的対応

「賢い AI に頼む」だけでは解決できない問題があります。HyperHelix のセキュリティ評価で特定したリスクと、フレームワークの対応状況を整理します。

| リスク | 対策 | 対策の強さ |
|--------|------|-----------|
| 認証情報の漏洩 | HH-019/020：コミット前の secret scan 必須、AI は生値を扱わない | **強** |
| 破壊的操作 | git 可逆性 + 人間ゲート | **中** |
| 自己承認（AI がルール変更を自己裁可） | registry の `ratified_by` 証跡 + validate 警告 + 統治 PR は CI 後に人間が手動 merge | **中**（可視化止まり） |
| プロンプトインジェクション | search.md S4 に警戒ライン追加（外部ファイル読取時の指示様テキスト検出） | **中** |
| シェルインジェクション | コミット構築は引用符付きヒアドキュメント必須・未信頼内容は埋め込まない（HH-051） | **中**（規律ベース） |
| 自律暴走（自己目的化） | R6 + 憲法 axiom-5（honour-based） | **中** |
| 監査可能性 | git 履歴 + コミット本文の `hh-record`（作業記録をコミットと一体化、HH-081） | **強** |

重要なのは「最大のガバナンス脆弱性が honor-based（AI の遵守が前提）である」という現実を正直に認識していることです。一度は branch protection と CODEOWNERS で人間ゲートを技術的に強制する案（HH-060）も採りましたが、private/free 運用では branch protection が使えないことが実測で分かり、HH-070 で「PR + CI + 人間の手動 merge」という honor-based 運用へ戻しました。強制できないものを強制できると書かない、という判断です。技術的強制より「可視性の向上」を優先し、後続の validate ルールで徐々に機械的な防衛線を追加していく設計思想です。

---

## 知識管理の設計思想

`core/knowledge.yaml`（と project 別の `core/knowledge/` 台帳）にフラットなノート台帳を持ちます。

```yaml
- id: N-041
  text: "Framework AP-003 (a declaration shipped without its consumer ...) is the MOST-recurring framework miss; ..."
  tags: [framework, ap-003, declare-consume, detection, validator]
  project: shared
  strength: 8
  last_used: 518
  state: active
```

ポイントは **自動昇格・降格を廃止**（HH-016）したこと。`strength` は並び順のヒントに過ぎず、ルールへの昇華は人間が手動で判断します。「AI が自分でルールを書き換える」というリスクを意図的に排除しています。

検索は `node tools/hyperhelix.mjs notes --tags ...` で行い、現在のプロジェクトと共有（`shared`）のノートだけを、最後に使われた順（`last_used`）に上位 6 件まで返します（HH-032/045）。台帳が育っても 1 タスクあたりの読み込みコストは一定です。ノート ID は新規分から `N-<ブランチ>-<日付><英字>` 形式（例: `N-Project008-20261002c`）の恒久 ID になり、ブランチをまたいでも衝突しません（HH-064。上の `N-041` は移行前の旧形式）。

---

## 機械バリデーターの実装例

```javascript
// tools/lib/governance.mjs（抜粋・簡略化）
// registry の lifecycle state と承認証跡の整合を検査する（HH-046/067）
for (const entry of registry.entries) {
  if (entry.status === "Pending" && (entry.ratified_by !== null || entry.ratified_at !== null)) {
    errors.push(`${entry.id} is Pending but carries ratification attestation`);
  }
  if (entry.status === "Approved" && (!entry.ratified_by || !entry.ratified_at)) {
    warnings.push(`${entry.id} is Approved but ratified_by/ratified_at is empty`); // → AMEND_RATIFIED_BY_EMPTY
  }
}

// tools/lib/edge-model.mjs（抜粋・簡略化）
// validate の各チェックコードが framework-review R1 に列挙されているか
{
  code: "CHECK_DOC_CONSISTENCY",
  edge: "validate.guard-code --listed-by--> framework-review R1 enumeration",
  check(root, ctx) {
    const review = ctx.read("assets/checklists/framework-review.md");
    for (const c of codes.filter((c) => !BASIC.has(c))) {
      if (!review.includes(c)) issues.push(wrn("CHECK_DOC_CONSISTENCY", `validate guard '${c}' is not listed in ... R1`));
    }
  },
}
```

「フレームワークの記述とコードの実装が乖離する」という AP-003 型の漏れを、ツールが自動検出します。さらに validate 自身の健全性（チェックコードの列挙漏れ）も validate が検出するというメタ構造を持っています。

こうした「資材 A が資材 B を参照しているはず」という検査は、当初は個別の関数として増えていきましたが、HH-075 で「型付きの辺（edge）の登録表 + 汎用チェッカー」に統合しました。上の `edge:` 行がその辺の宣言です。チェックを足すたびに検査器そのものが肥大化する、という問題への対処でもあります。

さらに `finish` コマンドが、タスク完了時に L1 構造 → L2 契約 → L3 挙動（テスト）→ L4 証跡（コミット本文の作業記録）の 4 層検証・秘密スキャン・カウンタ更新・コミットを fail-closed で一括実行します。push 前の Git フックと CI も同じ 4 層検証（`verify --base`）を走らせます。

---

## 実際の改善サイクル（/cycle）の流れ

```
/cycle を実行
  → R1: 資材整合チェック（validate 0 error 確認）
  → R2: スキーマ整合
  → R3: 機械バリデーター実行
  → R4: 使いやすさ評価
  → R5: AI 資材のフィット確認
  → R6: 自己目的化チェック（main は STOPPED）
  → R7: cost-report でコスト測定（前回比トレンド差分を自動記録）
  → R8: consolidation-report で冗長測定（backlog 焼却トレンドを自動記録）
  → 発見 → process-backlog へ class タグ付きで起票
  → 次の /cycle で焼却（burn-down）
```

---

## まとめ：何が新しいか

| 一般的な AI フレームワーク | HyperHelix |
|--------------------------|-----------|
| AI をブラックボックスとして使う | フレームワーク自体を CI/CD 対象にする |
| エラー → 再試行 | エラー → プロセス改訂 |
| プロンプトが権威 | 憲法 + amendments.md が権威 |
| 知識は文脈に埋め込む | 知識はフラット台帳で蓄積・人間が昇華 |
| 改善は無制限 | 自己目的化を公理で制度的に防止 |
| コスト無計測 | cost-report + consolidation-report で収束トレンドを定量化 |
| セキュリティは AI 任せ | ratified_by 証跡 + secret scan + プロンプトインジェクション警戒 |

---

## 自分のプロジェクトで使うなら

HyperHelix 全体を最初から持ち込む必要はありません。最小構成なら、次の4つだけでかなり効きます。

1. `AGENTS.md` / `CLAUDE.md` に入口を書く  
   AI が最初に読む順序と、編集してよい範囲を固定します。

2. `validate` に相当する機械チェックを置く  
   ルール・テンプレート・コマンド・ドキュメントの食い違いを、完了前に落とします。

3. 作業記録を1件だけ残す<br>
   目的、受入条件、変更リスト、検証結果、学びを短く記録します。長い日報ではなく、次の AI が使うための証跡です。HyperHelix 自身は当初これを `tasks/` 配下のブリーフファイルにしていましたが、現在はコミット本文の `hh-record` ブロックに書き、変更と記録を1つのコミットにまとめています（HH-081）。

4. D7 的な最後の処理を固定する  
   「検証した」「学びを残した」「コミットした」を、毎回同じ順で閉じます。

```mermaid
flowchart TD
  A["AGENTS / CLAUDE<br/>入口と権限"] --> B["作業記録<br/>目的・計画・検証"]
  B --> C["validate<br/>機械チェック"]
  C --> D["D7<br/>学び・カウンタ・commit"]
  D --> B
```

この最小版でも、AI への依頼は「チャットの流れ」から「レビュー可能な変更」に変わります。最初の狙いは、完璧な自動統治ではなく、次の失敗を少し見つけやすくすることです。

---

## おわりに

HyperHelix は「AI が賢くなれば解決する」方向ではなく、「プロセスを正しく設計すれば AI の限界を補える」方向に賭けています。

ソフトウェアエンジニアリングで 50 年かけて培ってきた開発プロセスの知恵（ゲート・変更管理・CI・lint・コードレビュー）を、AI エージェントの内側にそのまま持ち込む試みです。

そして見えてきた現実は「**プロセスの強度は技術的強制ではなく、今もなお honor-based の部分が大きい**」ということ。それ自体をフレームワークが正直に認識し、validate ルールで一つずつ機械的な防衛線に変えていく――その継続的な努力こそが HyperHelix の本質かもしれません。

---

<!-- 編集メモ / 残りタスク -->
<!--
[DRAFT NOTE - 2026-10-16 更新]
現状: HyperHelix の概要記事として本文骨格 + 具体例 + 最小導入ガイドまで成立。公開直前に可変数値だけ再確認する。

## 残りタスク
- [x] 冒頭 140 文字を作る。
- [x] AP-003 の具体例を1つ足す。
- [x] R7d / HH-056 の具体例を1つ足す。
- [x] ratified_by 導入の動機を補う。
- [x] 「自分のプロジェクトでどう使うか」セクションを追加。
- [x] 図解を追加: 三重螺旋、宣言↔消費の3層防御、最小導入ループ。
- [x] 数値を再確認: task_index / HH 件数 / process-backlog / 常時必読コスト / validate 結果(2026-10-16。公開直前にもう一度確認する)。
- [x] 古い内部語や固有セッション依存表現を削る。
- [x] タグ・タイトル・サムネイル案を決める。

## 公開メタ案
- タイトル案: 「AI エージェント用プロンプトを CI/CD する: HyperHelix という実験」
- サブタイトル案: 「憲法、変更管理、lint、レビューで AI の開発プロセスを内側から育てる」
- タグ案: AI, LLM, エージェント, ClaudeCode, プロンプトエンジニアリング
- サムネイル案: 三重螺旋 + validate gate + human approval の3要素を1枚にまとめる。

## 文字数・構成メモ
- 現状: 骨格 + 主要論点 + 具体例 + 最小導入（約 5,000 字級）
- 目安: Qiita で読まれる技術記事は 3,000〜6,000 字
- セクション 6（セキュリティ）は新規追加。ユニークな切り口になる可能性が高い
- 「honor-based のガバナンスを自認しつつ機械化を積み上げる」という誠実さが差別化ポイント

## 最新の状態（2026-10-16 時点・公開 clean line)
- task_index: 1138 / HH 総数: 083 件(HH-000〜HH-082、すべて Approved・Pending なし)
- process-backlog open: 14 件(うち dest:main 2 件)
- 起動時の実読コスト: 59,691 文字(常時必読 34,031 文字 / 464 行 + 索引読み冒頭 25,660 文字)
- validate: 0 error / 0 warning
- 直近の主要追加: HH-067 amendments の構造化正本(registry)化、HH-070 private/free の honor-based 統治、HH-075 edge registry 統合、HH-079 圧縮契約の state file 一本化、HH-081 作業記録のコミット本文化、HH-082 索引読みコストのラチェット対象化
-->
