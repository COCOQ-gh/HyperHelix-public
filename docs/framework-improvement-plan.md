# HyperHelix 改善計画

> 対象: 2026-07-18 全体レビュー follow-up  
> 正本区分: 実行 blueprint（進捗台帳ではない）  
> 作成タスク: `TASK-main-20260718-008`  

## 1. 位置づけ

この文書は、全体レビューで確認した所見を、実行可能な work package、依存関係、人間ゲート、受入条件へ変換するための計画書である。候補を蓄積する歴史的記録は [改善アイデア.md](改善アイデア.md)、未完了作業の単一追跡先は [process-backlog.md](process-backlog.md) と各 task record のままとする。

したがって、この文書を第二の backlog にしない。進捗だけを理由に本書のチェック欄や状態を更新せず、所見の範囲、採用した設計判断、実施順、受入条件が変わった場合だけ改訂する。

## 2. 目的・スコープ

目的は次の3点である。

1. P1 の意味論衝突を、人間が判断できる最小の変更提案へ分解する。
2. P2/P3 の事実ドリフトと観測不足を、独立して検証・rollback できる単位で解消する。
3. 外部設定へ依存する統治案を実環境で検証し、採用・リスク受容の境界を明示する。

スコープは、レビューで確認した6所見（IMP-01〜06）と既知の外部統治リスク1件（GOV-01）。機能追加、リポジトリ全体の文体統一、過去 task の書換え、ブランチ保護の直接変更はスコープ外とする。

## 3. 基準線（2026-07-18 snapshot）

この表は比較用の日時付き snapshot であり、恒久的な current 値ではない。後続 task は実行開始時に再計測する。

| 項目 | snapshot | 計画上の意味 |
|---|---:|---|
| `validate` | errors 0 / warnings 0 | 現行 schema・参照整合性は出発点で green |
| `npm test` | 99 / 99 pass | 現行回帰を壊さない |
| canon migration | task 12/12、governance 68/68、knowledge 87/87、rejected 0 | structured canon 移行自体は完了済み |
| always-read | 461 lines（baseline 456、+5） | startup cost と cycle cost を分離して再観測する |
| live briefs | 30、平均 246 lines | brief 量は参考値。削減目標を本書で固定しない |
| open backlog | 24 | stale/closed 表示の是正前 snapshot（baseline 値。実測は打消し行・closed 節の計上規則に依存し直近実測は 27 — 計上規則の明文化自体が IMP-04 の対象） |
| `tools/hyperhelix.mjs` | 3,278 lines / top-level function 92 | tooling surface が既存 cost report の死角 |

## 4. 実施原則

- 意図と実行を分離する。HH 対象は提案を裁可するまで実装しない。
- 正本は一つにする。本書は設計・順序・受入条件、backlog/task record は進捗を担当する。
- 1 task を、独立して検証・rollback できる最小の意味単位にする。
- positive test と negative test を対で持ち、報告系コマンドは既定で read-only にする。
- 基準値の更新や生成物の再生成で、意味論上の不整合を隠さない。
- ブランチ保護、権限、外部サービス設定は人間のみが変更する。

## 5. 所見トレーサビリティ

| ID | 優先度 | 所見 | 目標状態 | 判断ゲート | 推奨 Wave |
|---|---|---|---|---|---|
| IMP-01 | P1 | significant discovery の capture が `micro` の禁止条件と衝突 | 発見の記録 transaction と変更深度を分離し、重大所見を standard/full で安全に parking できる | HH 裁可必須 | B→C |
| IMP-02 | P1 | review-only の全体 clean 要求が同時実行規約と衝突 | session baseline と自分の write-set で clean を判定し、他 session の変更を誤検知しない | HH 裁可必須 | B→C |
| IMP-03 | P1 | governance digest が structured canon 完了後も「実装前」を表示 | canon epoch と一致する事実表示にし、生成 check が stale template の複製で終わらない | **人間確認必須**（view-template は governance/ = user-layer 資材。表示修正でも実施時に1ビット確認、epoch 導出契約の新設は full + 明示確認） | A |
| IMP-04 | P2 | process backlog に解消済み不具合と完了行が open として残る | open セクションが未完了 work のみを示し、source task へ追跡可能 | 通常 task | A |
| IMP-05 | P2 | `/cycle` 必読量と CLI 表面積が cost report に入らない | startup / cycle mandatory / tooling surface を別指標で再現可能に測る | 通常 task。閾値契約追加時は HH | D |
| IMP-06 | P3 | entrypoint/README の説明が gates と依存実態から drift | 公開説明が実装・package manifest と一致 | 通常 task | A |
| GOV-01 | 外部 | private/freeではHH-060のbranch protectionが利用不能 | HH-070でserver enforcement喪失を受容し、branch protectionを任意hardeningへ降格 | HH-070裁可済み | E（完了） |

## 6. 実施 Wave

### Wave A — 事実整流

IMP-03、IMP-04、IMP-06 を別 task で実施する。いずれも現行事実に表示・説明を合わせる変更で、意味論を新設しない。IMP-03 は view-template（governance/ = user-layer 資材）を触るため、**表示のみの修正でも実施時に人間の1ビット確認を取り**、epoch から状態を導出する契約を新設する場合は full depth + 明示確認へ切り替える。

完了条件は、旧表現の exact search が history allowlist を除いて0件、生成物 check が green、backlog の open 件数が実内容と一致すること（計上器は consolidation-report R8c — 打消し行・closed 節の扱いを計上規則として明文化してから照合する）。

### Wave B — 意味論の裁可

IMP-01 と IMP-02 は「review/capture transaction semantics」として一つの HH decision package にまとめる。両者は、発見時点の dirty state、記録対象、depth 決定、commit 境界を共有するためである。提案は少なくとも次を決める。

- capture transaction が変更深度から独立してよいか。
- pre-existing dirty state と task-owned write-set の識別方法。
- 同一 worktree と isolated worktree の保証差。
- review-only 終了時に許される未commit変更。

裁可前は現行 rule を変更しない。

### Wave C — 裁可済み意味論の実装

Wave B で Approved になった範囲だけ実装する。`routing.yaml`、`loop.yaml`、review-only/concurrency workflow、CLI consumer、回帰 test を同じ contract inventory で追跡する。提案が Reject なら実装せず、reject 理由を decision record と backlog に反映して閉じる。

### Wave D — 観測可能性

IMP-05 を実施する。cost report の出力を次の3面へ分ける。

1. `startup_cost`: entrypoint が常時読む資材。
2. `cycle_mandatory_cost`: `/cycle` が無条件に要求する checklist/workflow/anti-pattern 資材。
3. `tooling_surface`: CLI の行数・command 数・top-level function 数などの保守面積。

既定実行はファイルや baseline を変更しない。明示した update 操作だけが基準値を変更できるようにする。

### Wave E — 外部統治リスクの受容（完了）

GOV-01 は `TASK-main-20260718-020` の外部blocker capture、HH-069のpublisher解消を経て、HH-070でprivate/freeを維持しbranch protectionを必須化しない方針に確定した。`/sync`・refluxは保護なしでもPRを作成してCI checksを待ち、統治pathは自動mergeせず人間が手動mergeする。direct-main/force-push等の禁止はtool+human honor-basedであり、GitHub側の拒否ではない。branch protectionは将来の任意hardeningで、AIは設定変更を代行しない。

## 7. Work Package

### IMP-01 — significant discovery capture と depth の分離

**対象:** `core/routing.yaml`、`core/loop.yaml`、該当 workflow、CLI/test consumer。

**設計判断:** 発見の durable capture を小さな transaction として扱い、その後の是正 task の depth は所見の影響から standard/full に決める。`micro` 禁止条件に該当する所見を、記録の都合だけで `micro` に分類しない。

**受入条件:** 

- rule/axiom/theta、material contradiction、gate touch の各 fixture が禁止されずに parking される。
- parking task と是正 task の ID、深度、commit 境界が追跡できる。
- trivial な fixed-term capture の既存経路が退行しない。
- 未裁可状態では implementation path が有効にならない negative test がある。

**rollback:** 裁可済み amendment と implementation commit を分け、実装だけを revert して旧 routing に戻せること。

### IMP-02 — review-only clean 判定の concurrency 対応

**対象:** `assets/workflows/review-only.md`、`assets/workflows/concurrency.md`、review 起動/終了 consumer と test。

**設計判断:** review 開始時の baseline、task-owned path/write-set、終了時差分を区別する。全 worktree の絶対 clean は isolated worktree でのみ強制し、共有 worktree では他 session の既存差分を failure にしない。

**受入条件:** 

- clean worktree、開始前から他者差分あり、自 task が書込み、終了時に他者差分増加、isolated worktree の5ケースを test する。
- 自 task の write は必ず検知し、他 session の差分だけでは fail しない。
- baseline 採取不能時は明示的に fail closed し、無根拠に clean と判定しない。

**rollback:** workflow と検出器を同一 task で戻し、現行の global-clean rule に復帰できること。

### IMP-03 — governance digest の現在化

**対象:** `governance/amendments/view-template.md`、生成された amendments view、structured canon epoch の参照 consumer。

**設計判断:** 「裁可済み・実装前」という固定文を、task/governance/knowledge epoch が示す実装状態と整合する表示へ置換する。状態を動的に示す場合は **canon epoch から導出した生成値を placeholder 経由で view に注入**し、生成 check は従来どおり **byte drift（全文一致）のみ**で判定する。view の散文を機械解析して意味を検査する検出器は追加しない（HH-067: 文章は intent/理由/生成 view であり、機械の入力にしない — SC-04 の設計不変条件）。

**受入条件:** 

- SC-00〜08 完了、task/governance semantic parity、knowledge legacy adapter removal の snapshot と表示が矛盾しない。
- `amendments-doc --check` と canon migration check が pass する（drift 判定は byte 比較のみ・散文パーサの新設 0）。
- 過去の「実装前」表現は履歴文脈だけ allowlist され、live view には残らない。
- user-layer 資材（governance/）編集につき、実施時の人間1ビット確認が task record に記録される。

**rollback:** template と生成物を一組で revert する。epoch 導出を追加した場合は consumer も同じ commit で戻す。

### IMP-04 — process backlog の truth repair

**対象:** `docs/process-backlog.md` と、根拠となる `tools/compaction-hooks.mjs` / `test/compaction-state.test.mjs`（略称「RT-13」は SC-RT-13 = architecture gate と衝突するため本書では使わず、test ファイル名で特定する）。

**設計判断:** PostCompact baseline 所見を実装・test 根拠付きで closed/history へ移す。open-only セクションから打消し済み完了行を除き、履歴は source task/commit への pointer で保つ。

**受入条件:** 

- PostCompact 所見の状態が実装と `test/compaction-state.test.mjs` の結果に一致する。
- open セクションに完了行がなく、機械集計値と見出しの意味が一致する。
- 未完了24件という本書 snapshot は上書きせず、後続 task の再計測値を task record に記録する。

**rollback:** 削除ではなく履歴/pointer へ移す。誤判定なら source ID を保ったまま open に戻せる。

### IMP-05 — cycle cost と tooling surface の可視化

**対象:** cost-report command、`/cycle` launcher、report test/fixture、基準値 consumer。

**設計判断:** startup と cycle mandatory を混ぜず、CLI 自体も tooling surface として数える。snapshot 更新は明示 operation に限定する。

**受入条件:** 

- 3指標が同じ checkout で再現可能で、各 file inclusion/exclusion 理由を出力できる。
- `/cycle` の必読集合を1ファイル増減した positive fixture が差分へ反映される。
- 除外 path、壊れた参照、二重計上を negative test で検出する。
- report-only 実行前後で tracked file の hash が不変である。

**rollback:** 新指標を additive field として導入し、consumer 移行前は旧出力も保持する。安定後の旧 field 削除は別 task にする。

### IMP-06 — 公開説明の drift 修正

**対象:** `entrypoint.md` と `README.md`。

**設計判断:** gates の説明から削除済みのノート初期値を外し、CLI の依存説明を `package.json` と一致させる。

**受入条件:** 

- live docs に「gates がノート初期値を持つ」という表現がない。
- CLI の依存説明が YAML/Ajv の実態を否定しない。
- entrypoint の読み込み順・authority は変更しない。

**rollback:** 文書のみの独立 commit とし、旧説明へ単純 revert できる。

### GOV-01 — private/free honor-based main運用（HH-070で完了）

**対象:** `/sync`・reflux PR flow、CODEOWNERS、CI checks、任意のホスティング側 branch protection。

**受入条件:** 

- branch protectionなしのfixtureでPR作成→CI checks→人間handoff/通常mergeがpassする。
- server enforcementを失う範囲と、direct-main/force-push/admin-bypassをhonor-basedで禁じる手順が記録される。
- private/freeを有効状態とし、branch protectionは将来の任意hardeningとして分離される。
- GOV-01 open blockerをresolved履歴へ移し、当時の403証跡は保持する。

**rollback:** HH-070 implementationをrevertし、新HHでbranch protection必須を復活させる。外部設定を再採用する場合は人間が実行し、AI taskは変更しない。

## 8. 推奨 task slicing

| 順序 | task slice | 推奨深度 | 依存 | 人間ゲート |
|---:|---|---|---|---|
| 1 | IMP-04 backlog truth repair | standard | なし | なし |
| 2 | IMP-06 public docs drift | standard | なし | なし |
| 3 | IMP-03 governance digest currentization | standard（epoch 契約追加なら full） | canon snapshot 再確認 | 必須（user-layer 資材 — 表示修正でも1ビット確認） |
| 4 | IMP-01/02 HH decision package | full | 1〜3 の事実整流 | 裁可必須 |
| 5 | IMP-01/02 implementation | full | 4 Approved | 裁可済み範囲のみ |
| 6 | IMP-05 cost observability | standard（閾値契約追加なら full） | cycle/read-set inventory | 閾値追加時のみ |
| 7 | GOV-01 HH-070 private/free implementation | full | HH-070 Approved | 裁可済み範囲のみ |

順序1〜3は相互に実装依存しないため並行可能だが、1 task 1 commit を維持する。4と5は同一 task に畳み込まない。

## 9. 全体完了条件

- IMP-01〜06 の各受入条件が source task の test/evidence で Pass。
- HH 対象は amendments lifecycle と実装 commit が分離され、Approved 範囲を越えない。
- live docs、generated view、structured canon の間に既知の矛盾がない。
- `validate`、該当 generator check、canon migration、全 test、L1〜L4 verify が green。
- report-only command に tracked-file side effect がない。
- GOV-01 はHH-070のリスク受容とconsumer実装まで完了し、外部ゲート待ちを残さない。

## 10. 検証・rollback 共通契約

各 task は変更面に応じて最小でも次を実行する。

```powershell
node tools/hyperhelix.mjs validate
node tools/hyperhelix.mjs contract-doc --check
node tools/hyperhelix.mjs amendments-doc --check
node tools/hyperhelix.mjs migrate-canon --check
npm test
node tools/hyperhelix.mjs verify --staged --task <TASK-ID>
```

コマンド契約の注記（実装と一致させる — `--all` / `--level` というフラグは存在しない）: `migrate-canon` は既定で全 domain を検査し、絞り込みは `--domain task,governance,knowledge` で行う。`verify --staged` は L1 Structure → L2 Contract → L3 Behavior → L4 Evidence を**常に一括実行**し、層別の部分実行フラグを持たない。

旧表現や ID の exact search は全 hit を `update / history-allow / unrelated` に分類する。rollback は task 単位の revert を基本とし、canon/template/generated view のような不可分 consumer は一組で戻す。

## 11. 進捗記録契約

- 未着手/進行中/完了/blocked の live 状態は [process-backlog.md](process-backlog.md) または当該 task record にだけ記録する。
- 本書には日々の status、担当者、完了チェックを追加しない。
- 本書を改訂する条件は、所見の追加・棄却、設計判断、依存順、人間ゲート、受入条件の変更に限る。
- 後続 task は IMP/GOV ID を brief と commit message に含め、本書へは source task/commit の索引を追記しない。追跡は repository search で行う。
