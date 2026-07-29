# Implementation Goal Prompts

이 문서는 승인 후 개발 agent에 하나씩 전달할 `/goal` 프롬프트다. 이 설계 목표에서는
구현하지 않는다. TA-01부터 순서대로 진행하고, 각 slice가 gate를 통과한 뒤 다음
slice를 시작한다.

## 실행 순서

```text
TA-01 deterministic authoring contract
-> TA-02 responsive hybrid shell
-> TA-03 mapping correction and contextual inspector
-> TA-04 artifact eligibility and loss preflight
-> TA-05 ownership, receipt, recovery
-> TA-06 regression and readiness gate
```
TA-01 이후 TA-02와 TA-04의 준비 작업은 병렬 가능하다. TA-03은 TA-01 stable block
identity에 의존하고, TA-05는 TA-03과 TA-04의 결과 계약에 의존한다.

## TA-01 `/goal`

```text
D:\flowme2605\flow-mvp의 최신 clean origin/main worktree에서 FlowMe Text Authoring
TA-01 deterministic authoring contract를 구현해줘.

먼저 읽을 정본:
1. AGENTS.md
2. agent.md
3. docs/specs/2026-07-28-flowme-text-authoring-ux-v1/spec.md
4. docs/specs/2026-07-28-flowme-text-authoring-ux-v1/data-handoff.md
5. docs/specs/2026-07-28-flowme-text-authoring-ux-v1/state-model.md
6. docs/specs/2026-07-28-flowme-text-authoring-ux-v1/text-authoring-contract-v1.json
7. docs/specs/2026-07-28-flowme-text-authoring-ux-v1/case-authoring-matrix-v1.json
8. docs/content-audit/2026-07-28-flowme-text-authoring-ux-design-handoff/
   eight-case-frozen-authoring-fixtures.md

목표:
일반 텍스트 또는 지원된 Markdown을 원문 손실 없이 저장 가능한 authoring block과
canonical mapping proposal로 바꾸는 최소 deterministic 계약을 만든다. 첫 slice는
제주 여행 개인 메모와 이사 Markdown fixture만 지원한다.

범위:
- TextAuthoringDocument, AuthoringBlock, AuthoringParseResult
- BlockToCanonicalMapping, UnresolvedAuthoringIssue, DraftRevision
- raw source fragment와 stable block identity
- 제주 메모 5개 Item deterministic adapter
- 이사 Markdown heading/detail/checklist/relative-date adapter
- split, merge, reorder operation contract와 undo snapshot
- unsupported 문장을 원문과 issue에 보존
- source-derived와 user-authored value ownership
- unit fixture와 serialization test

비범위:
- 실제 AI/provider/crawler/OCR
- app navigation 또는 production authoring UI
- account/DB/cloud sync
- canonical source/published Flow 수정
- execution run, occurrence, export identity schema 변경
- 범용 Markdown parser 약속

데이터 원칙:
- source snapshot, creator draft, personal draft, personal structural overlay,
  execution run, occurrence, export identity를 합치지 않는다.
- 같은 입력, fixture version, parser version은 같은 block/mapping identity를 만든다.
- 알 수 없는 내용은 silent drop하거나 임의 Item으로 만들지 않는다.
- 날짜 없는 Item에 날짜를 만들지 않는다.
- 기존 저장 데이터 migration은 만들지 않는다.

Acceptance:
- 제주 원문 fragment가 5개 Item proposal과 1:1 lineage를 가진다.
- 이사 heading은 Step, checklist row는 Item, indented prose는 detail로 매핑된다.
- relative date는 anchor 없이 source expression으로 유지된다.
- split/merge/reorder 후 source fragment와 undo가 보존된다.
- unsupported 문장은 issue와 raw text에 남는다.
- 같은 fixture를 두 번 parse했을 때 stable ID와 mapping이 같다.
- canonical source/published Flow diff가 없다.

검증:
- 관련 unit tests
- deterministic identity regression
- JSON serialization/round-trip
- npm.cmd run docs:check
- npm test
- npm.cmd run build
- git diff --check

증거:
- 제주 5 Item mapping JSON
- 이사 Step/Item mapping JSON
- unsupported preservation fixture
- stable ID/undo test marker

Rollback:
새 계약과 adapter를 feature entry point 뒤에 격리한다. 기존 Input Composer와 저장
경로를 변경하지 않아 새 모듈과 호출부를 제거하면 baseline으로 복귀해야 한다.

자동화와 fixture를 실제 사용자 검증으로 표현하지 않는다. observed-user count는 0이다.
```

## TA-02 `/goal`

```text
FlowMe Text Authoring TA-02 responsive hybrid shell을 구현해줘.

선행 조건:
- TA-01 deterministic authoring contract가 main 또는 현재 작업 branch에 존재
- TA-01 stable block identity와 parse result가 고정됨

목표:
text composer -> structure review -> result preview의 한 여정을 390, 1024, 1440에 맞는
responsive composition으로 제공한다.

범위:
- 390px 단계형 Input/Structure/Result
- 1024px two-pane과 contextual drawer
- 1440px source/outline/artifact 3-pane
- case fixture 선택과 직접 text 입력
- parse loading, empty, proposal_ready, recovered_unsaved_draft
- keyboard step navigation, focus restoration, accessible names
- local-only unsaved draft recovery

비범위:
- mapping correction 전체
- production save/export 연결
- AI/provider
- 새 전역 navigation 탭

Acceptance:
- 첫 useful preview 전 필수 입력 0~2개
- 화면별 competing primary action 1개 이하
- 390/1024/1440 horizontal overflow 0
- keyboard로 Input -> Structure -> Result 이동
- reload 후 unsaved text와 현재 단계 복구
- fixture simulation임을 명시하고 live AI처럼 표현하지 않음

Screenshot markers:
- ta02-390-input
- ta02-390-structure
- ta02-390-result
- ta02-1024-two-pane
- ta02-1440-three-pane

Rollback:
새 shell route/feature flag를 제거하면 기존 Input Composer가 그대로 동작해야 한다.
```

## TA-03 `/goal`

```text
FlowMe Text Authoring TA-03 mapping correction and contextual inspector를 구현해줘.

목표:
사용자가 full document editor를 배우지 않고 잘못 해석된 block만 고칠 수 있게 한다.

범위:
- merge/split, indent/outdent, reorder
- Item/resource/guide/caution 역할 변경
- include/exclude와 undo
- title/detail/completion criterion
- 펼침형 date/time/place/repeat/condition/duration
- source-derived와 user-authored 값 비교
- unresolved issue 확인

비범위:
- 공개 source 직접 수정
- execution completion/occurrence 편집
- 범용 slash command와 Wiki editor

Acceptance:
- 모든 structural operation에 undo가 있다.
- source fragment와 stable block identity lineage가 사라지지 않는다.
- 한 Item을 고칠 때 다른 Item form을 동시에 펼치지 않는다.
- mobile에서 full editor를 강제하지 않는다.
- source value override는 원본을 보존하고 personal/creator layer에 기록한다.

E2E markers:
- ta03-split-undo
- ta03-merge-lineage
- ta03-reorder-stable-id
- ta03-role-resource
- ta03-personal-override

Rollback:
mapping operation command layer를 비활성화해도 read-only structure/result preview가 유지된다.
```

## TA-04 `/goal`

```text
FlowMe Text Authoring TA-04 artifact eligibility and loss preflight를 구현해줘.

목표:
각 콘텐츠에 primary artifact 1개와 의미 있는 secondary 최대 2개만 보여 주고, 저장 또는
export 전에 실제 수량과 빠지는 정보를 예측할 수 있게 한다.

범위:
- Calendar, Todo, Sheet, Memo eligibility
- whole included content 기준 count
- undated Item의 Calendar 제외
- resource/guide/caution projection 정책
- primary/secondary 추천 이유
- loss preflight
- 여덟 frozen 사례 projection fixture

비범위:
- 외부 OAuth/direct sync
- unsupported artifact 빈 탭
- execution state migration

Acceptance:
- 이사 24/27 version이 혼합되지 않는다.
- 차량 Todo 10개, anchor 후 Calendar 계산이 일관된다.
- K-MOOC 14행과 LibriVox 38장이 유지된다.
- 안전정보 Memo content와 Todo action 수 차이를 사전에 보여 준다.
- date-less Item은 VEVENT가 되지 않는다.
- save/export receipt count가 preflight와 같다.

E2E markers:
- ta04-moving-calendar-count
- ta04-vehicle-undated
- ta04-kmooc-14
- ta04-librivox-38
- ta04-safety-loss-preflight

Rollback:
새 eligibility policy를 제거하면 기존 projection은 유지되며 canonical Item 데이터는
변하지 않아야 한다.
```

## TA-05 `/goal`

```text
FlowMe Text Authoring TA-05 ownership, receipt, and recovery를 구현해줘.

목표:
같은 authoring 결과가 개인 초안, 제작자 초안, correction suggestion 중 어디에 쓰이는지
명확히 분기하고 저장/export 결과와 복구를 제공한다.

범위:
- personal draft save
- creator draft save + rights/safety review gate
- published Flow correction suggestion
- export preflight와 compact receipt
- supported Markdown subset round-trip
- source_updated, conflict_source_vs_user
- retryable/provider error와 unsaved draft recovery

비범위:
- 실제 공개 publish
- moderation/admin UI
- server account sync
- canonical source 자동 overwrite

Acceptance:
- 저장 전에 owner, scope, count, artifact를 예측한다.
- 개인 수정은 published Flow를 변경하지 않는다.
- creator draft의 rights/safety blocker는 이유와 다음 행동을 제공한다.
- correction suggestion과 personal draft가 같은 저장 버튼을 쓰지 않는다.
- reload 후 unsaved draft를 복구하거나 폐기할 수 있다.
- Markdown round-trip 제한을 명시한다.

E2E markers:
- ta05-personal-save-receipt
- ta05-creator-review-gate
- ta05-correction-suggestion
- ta05-source-conflict
- ta05-draft-recovery
- ta05-markdown-roundtrip

Rollback:
write path adapter를 분리하고 기존 published/personal 저장 키를 변경하지 않는다.
```

## TA-06 `/goal`

```text
FlowMe Text Authoring TA-06 regression and observed-user readiness gate를 수행해줘.

목표:
여덟 사례의 fidelity, responsive operability, accessibility, save/export parity를 자동
증거로 닫고 실제 사용자 관찰에 넘길 준비가 됐는지 판정한다.

범위:
- 8-case unit fixtures
- 390/1024/1440 browser journeys
- keyboard-only parse/edit/save/export
- accessible name, focus, dialog/sheet Escape와 focus return
- blocked/error/recovery states
- projection count/loss parity
- stable identity와 source/personal/run/occurrence/export 회귀
- rollback marker와 screenshot package

비범위:
- observed-user research 자체
- AI/provider quality claim
- account/DB/OAuth

Acceptance:
- correctness/accessibility blocker 0
- 여덟 사례 모두 input -> mapping -> artifact -> save/export evidence가 있다.
- 390/1024/1440 overflow와 fixed overlap 0
- console/page error 0
- 자동 QA와 observed-user evidence가 명확히 분리된다.
- observed-user count는 실제 관찰 전까지 0이다.

검증:
- npm.cmd run docs:check
- npm test
- npm.cmd run build
- targeted E2E
- blast radius가 넓으면 full E2E
- git diff --check

최종 판정:
- ready_for_bounded_user_observation
- bounded_fix_required
- structural_reopen
```
