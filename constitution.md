# constitution.md — HyperHelix 憲法

HyperHelix の最上位ルール。ユーザー層・intent(意図)の権威を持つ。通信言語(日本語)で記述する。
AIエージェントは稼働時、本ファイルと `amendments.md` を必ず参照する。
本ファイルの変更は `amendments.md` の人間承認を通じてのみ行う。
本文は「現行ルール + 出典 HH ポインタ」のみを記述する。改正の経緯・撤去済み機構の解説は
`governance/amendments/bodies/`(正本)と `amendments.md` の現行ルール digest に委ねる(HH-074)。

---

## 三重螺旋の公理

HyperHelix は3本の螺旋が1本の蒸留パイプラインを共有する構造を持つ。

1. **実行螺旋** — すべてのタスクは5フェーズのループを通る(`core/loop.yaml`)。
2. **知識螺旋** — 経験は学習ノートとして蒸留され蓄積される(`core/knowledge.yaml`、`core/gates.yaml`)。重要なものは人間がルール(本憲法/`amendments.md`)へ昇華する。自動昇格・降格は存在しない(HH-016)。
3. **統治螺旋** — 影響の大きい変更のみ人間が単一窓口で裁可する(`amendments.md`)。

## ループの公理

1. すべてのタスクは Search → Plan → Execute → Evaluate → Distill を通る。
2. 各フェーズは成果物(artifact)を生成し、各成果物は評価される。
3. フェーズの省略は禁止。深度モードは工程を縮小するが、フェーズを削除しない。
4. どのフェーズで発見された改善も捕捉し、蒸留パイプラインを通じた昇格を検討する。捕捉はフェーズ末尾に限らない: 重大発見(固定トリガ該当)は capture transaction として即時に恒久資材へ記録する。トリガ・深度選択・task_index 扱い・review-only との整合の単一権威は `core/routing.yaml` `significant_discovery_parking` と `assets/workflows/review-only.md` §2(HH-030/068)。
5. ミスは実行者ではなくプロセスの問題として扱う。改善対象は常にプロセスである。

## レイヤーの公理

1. ユーザー層資材は `constitution.md` と `amendments.md`(その構造化正本 `governance/` を含む)のみ。intent の権威を持ち、通信言語で記述する。`amendments.md` は `governance/amendments/` registry から生成される view である(HH-067)。
2. それ以外のフレームワーク資材(`core/`、`assets/checklists/` ほか)はすべてAI層資材。execution(実行)の権威を持ち、英語で記述する。
3. タスク記録(`tasks/`)とユーザー向け文書(`README.md`、`docs/`)は運用言語(日本語)で記述する。
4. AIエージェントは稼働時に両層を参照しなければならない。
5. 両層が矛盾するときは intent(ユーザー層)が勝つ。

## 統治の公理

1. 知識の自動昇格・降格は行わない(HH-016)。学習ノートの `strength` は並び順のヒントに過ぎず、確率もスコアも用いない。重要ノートのルール昇華・廃棄は人間が裁可する。
2. 人間承認(`amendments.md`)を要するのは次の高影響変更のみ。それ以外はすべて自動/不要。
   - 学習ノートのルール昇華(重要ノート → 本憲法 / `amendments.md`)
   - θ(`core/gates.yaml`)の変更
   - 学習ノートのハード削除・大規模統廃合
   - 本憲法の変更
   承認の信頼アンカーは**単一の人間操作者**であり、技術的強制ではない。`ratified_by`/`ratified_at` は self-attested approval(裁可の監査証跡)であり、AI が commit 権を持つ限り偽造可能である。フレームワークはガバナンスが **honor-based** であることを正直に認める。validate `AMEND_RATIFIED_BY_EMPTY` は attestation completeness(証跡の記入漏れ)のみを検出し、偽造は検出しない(HH-046)。
   main の統治は private/free 運用を優先し、branch protection は必須でなく任意ハードニングとする。`/sync`・`reflux` は validate 後に PR を作成して Linux/Windows CI checks を待ち、統治・制御面 PR は自動 merge せず単一の人間操作者が内容を確認して手動 merge する。`.github/CODEOWNERS` は所有範囲/review request 先として維持し、同一 publisher を許可、CODEOWNER Approve は要求しない。direct main push・admin bypass・force-push・rebase は禁止する — branch protection 未設定時、この禁止はツール契約と人間規律による **honor-based 禁止**であり、GitHub 側の技術的拒否ではない。外部アクセス制御の設定・変更は将来任意で行う場合もユーザー操作のみとする(HH-070; 手順は `assets/workflows/git-conventions.md`・`assets/workflows/branch-protection-runbook.md`)。
3. ノートの不使用化はアーカイブ(state: archived)であり、ハード削除は人間確定時のみ。
4. 評価は機械シグナル(テスト・実行・lint)と人間の1ビット(accept / reject)に限る。主観項目を機械採点しない。
5. 改善サイクルは成果物を作るために存在する。フレームワークのみを対象とするサイクルが3回続いたら、次は実タスクを優先する。改善活動が自己目的化したら、それ自体を改善対象とする。
   本公理の運用 — branch 別の enforcement 状態(ACTIVE/STOPPED)・連続数の記録・外部価値ゲート — の単一権威は `assets/checklists/framework-review.md`(R6 / R7c / R7d-frame / R7d-ROI / Branch context)と `core/gates.yaml` `external_value_gate` であり、本憲法はライブ状態を断定しない(HH-018/021/025/038/048/052/056)。enforcement による一時停止は、非 HyperHelix 実タスクの完了により自動再開する(再裁可不要、HH-014)。
   session-owned repository write がゼロの「確認・報告のみ」セッションは review-only 記録とし、タスクではないため task_index も R6 連続数も増やさない。単一権威は `assets/workflows/review-only.md`(HH-023/068)。

## 実行原則

- ユーザーの指示はしばしば不完全・曖昧・矛盾・技術的に不正確である。表面的な文言を盲信せず、真の目的・隠れた制約・不足要件・波及影響を推定する。必要なら確認し、それ以外は明示的な前提を置いて進む。曖昧さをユーザーの落ち度として扱わない。
- Execute に入る前に、最低限「目的・受入条件・検証計画」を確定する(深度モードの最小要件)。
- 検証せずに完了を主張しない。スキップした検証は理由と残存リスクを必ず報告する。
- 最小動作実装から始める。動いてから拡張する。(HH-027)
- ツール呼び出しは常に正規書式のみで行う。呼び出しの直前に余計なトークンを出力しない。書式崩れは**致命的失敗**(作業のサイレント停止＋直前編集の未コミット放置＋状態不整合)として最優先で回避し、「malformed」を受けたら即座に正規書式で再送し、実行成立を確認してから次へ進む。(HH-029)

## 環境制約の公理

- `entrypoint.md` がプロジェクト単位の**正本エントリポイントガイド**(プラットフォーム中立)であり、最初に読む資材への案内とロール判定(WO 有無の機能決定)のみを記述する。プラットフォーム md(`CLAUDE.md`・`AGENTS.md` 等)は `entrypoint.md` への**薄いリダイレクト専用**とし、エントリ内容を重複記述しない(HH-059 — 主体 AI 切替時の齟齬防止)。いずれもルール本体を記述しない。
- `.claude/commands/` は薄い起動コマンド専用。手順資材への参照のみを記述し、ルール本体を記述しない(HH-000)。
- AIエージェントは HyperHelix を初回読込みする際、作業ディレクトリ構造がフレームワークのコマンド(`/helix`・`/cycle`・`tools/hyperhelix.mjs`)を実行可能かを検証する。実行不能(エントリポイント不達・コマンドのパス未解決・HyperHelix ルート位置のずれ・ネストリポジトリ境界の不整合等)なら、作業を進める前に是正する。検証・是正の手順は `assets/workflows/session-bootstrap.md`(HH-013)。

## セキュリティの公理(HH-019)

1. **秘密情報を生(plaintext)で残さない。** APIキー・アクセストークン・サービスロールキー・パスワード・接続文字列・署名鍵・OAuth クライアントシークレット等の資格情報は、フレームワーク資材・成果物コード・タスクブリーフ・コミット・ログ・チャットのいずれにも**生の値を記載しない**。参照は環境変数 / Secrets 経由とし、資材・コードには**変数名のみ**(例: `SUPABASE_KEY`)を書く。
2. **出力前にマスクする。** 秘密を含みうる値をログ・エラーメッセージ・デバッグ出力・サンプルへ出す前に伏せる(例: 末尾4文字以外をマスク)。サンプル・ドキュメントには実値でなくプレースホルダ(例: `<your-api-key>`)を使う。
3. **コミット前に秘密スキャンを通す。** すべてのコミット前に、ステージ差分を秘密スキャンにかける(検証ポリシー `core/routing.yaml` `validation.secret_scan`、手順は `assets/checklists/evaluate.md` V1 と `assets/workflows/git-conventions.md` コミットゲート)。検出したらコミットを止めて是正する。秘密は履歴改変だけでは無効化されない前提で、既に露出した秘密は**鍵のローテーション**を伴う。
4. **秘密に触れる作業は security-sensitive とみなす。** 深度モード light を禁止し(`core/loop.yaml` の `forbidden_when` と整合)、評価で秘密スキャンを必須の機械シグナルとする。
5. **対話的に秘密を扱わない(HH-020)。** AI は生の秘密を**聞き出さない・echo しない・実値を含むコマンドを実行しない**(チャット・ログへの露出を防ぐ)。秘密が必要なときは**存在の有無のみ**を確認し(値は出力しない。例: bash `[ -n "${VAR:-}" ] && echo set || echo missing`)、設定は**ユーザーが端末履歴に残さない方法でチャット外で**行うよう案内する(例: bash `read -rs VAR && export VAR`、PowerShell `$env:VAR = Read-Host 'VAR'`、OS キーチェーン/権限制限ファイルからの読込)。ユーザーにキー値をチャットへ貼らせない。

---

## 人間が鋳造した axiom

(現時点では中核公理のみ。今後 `amendments.md` で承認された axiom をここに追記する。)
