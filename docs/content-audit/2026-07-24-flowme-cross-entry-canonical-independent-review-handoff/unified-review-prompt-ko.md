# Claude Design / Codex 통합 복붙용 프롬프트

아래 코드 블록 하나를 그대로 전달한다.

```text
FlowMe의 Home, Flow 찾기, URL lookup, public detail, 저장 receipt, My Flow, Calendar가 같은 콘텐츠를 하나의 사용자 Flow로 이어주는지 독립적으로 상세 검토해줘.

이번 요청은 구현이 아니다. 앱 코드를 수정하지 말고 current production과 current source를 다시 확인한 뒤, 기존 감사 finding을 확인·재해석·반박하고 다음 설계/개발 순서를 제안한다.

검토 역할:
- 시각 위계, interaction, wireframe, reference 비교 중심이면 reviewerRole=claude_design
- production 재현, source/storage/test/data-risk 중심이면 reviewerRole=codex_independent

두 역할 모두 동일한 8 personas x 3 sessions = 24 journey cells와 cross-entry invariant matrix를 사용한다.

======================================================================
1. 현재 서비스와 검토 패키지
======================================================================

Production:
https://flowme2605.vercel.app

GitHub:
https://github.com/knhbae/flowme2605

검토 branch:
cross-entry-review-handoff-20260724

검토 기준 origin/main:
e491d99ca61ecae4fd0dd009f785e737b6a59516

현재 production app release:
30281a7a8ea9bea1194b4104b5a49b6211c07e3b

Cross-entry audit package:
https://github.com/knhbae/flowme2605/tree/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-consistency-audit

Visual review:
https://github.com/knhbae/flowme2605/blob/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-consistency-audit/review.html

Audit README:
https://github.com/knhbae/flowme2605/blob/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-consistency-audit/README.md

Detailed audit:
https://github.com/knhbae/flowme2605/blob/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-consistency-audit/audit.md

Structured route evidence:
https://github.com/knhbae/flowme2605/blob/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-consistency-audit/route-evidence.json

Provisional next program:
https://github.com/knhbae/flowme2605/blob/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-consistency-audit/next-program.md

Review handoff:
https://github.com/knhbae/flowme2605/tree/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-independent-review-handoff

Scenario guide:
https://github.com/knhbae/flowme2605/blob/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-independent-review-handoff/review-scenarios-ko.md

Checklist:
https://github.com/knhbae/flowme2605/blob/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-independent-review-handoff/review-checklist-ko.md

Output contract:
https://github.com/knhbae/flowme2605/blob/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-independent-review-handoff/review-output-contract.json

P32 final baseline:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-24-p32-final-review-package

Current status and product decisions:
https://github.com/knhbae/flowme2605/blob/main/docs/STATUS.md
https://github.com/knhbae/flowme2605/blob/main/docs/ROADMAP.md
https://github.com/knhbae/flowme2605/blob/main/docs/DECISIONS.md

일부 branch 링크가 열리지 않아도 중단하지 말고 production, GitHub main, 접근 가능한 자료로 계속한다. 확인하지 못한 자료만 evidenceKind=inaccessible로 기록한다.

판단 우선순위:
1. current production interaction
2. current source
3. current package screenshot
4. structured evidence
5. prior release evidence
6. prior design artifact
7. external reference pattern

======================================================================
2. 검토할 기존 감사 가설
======================================================================

아래는 정답이 아니라 검증할 가설이다.

H1. 같은 AJD 이사 원문이 최소 4개 사용자 route로 갈린다.
- Home: /f/moving-d30-basic, 24 items
- Find: /flow-maps/moving-d30, 5 items
- URL lookup: /f/curated-ajd-moving-d30, 5 items
- public alias: /f/source-backed-moving-d30, 5 items

H2. Home과 Find entry를 모두 저장하면 My Flow에 24-item과 5-item Flow가 별도 객체로 생긴다.

H3. /flows 9개 catalog 중 first 5는 legacy /flow-maps hybrid이고 last 4는 current /f artifact-first다.

H4. moving과 vehicle의 visible Checklist result button은 눌러도 selected projection이 바뀌지 않지만 wedding/workout에서는 작동한다.

H5. Home vehicle card는 `필요할 때 쓰는 체크리스트`를 약속하지만 target은 검사일 기준 D-14 Calendar다.

H6. Home vehicle example은 hydrated Find catalog에서 검색되지 않는다.

H7. undated workout을 저장하면 My Flow에 raw RRULE `FREQ=WEEKLY;BYDAY=MO,WE,FR`가 노출된다.

각 가설을 다음 중 하나로 판정한다.
- confirmed
- reframed
- rejected
- inaccessible

route, viewport, 재현 단계, 기대/실제, 사용자 영향, evidenceKind를 반드시 붙인다.

======================================================================
3. 유지할 제품·데이터 기준
======================================================================

- FlowMe는 heavy planner가 아니라 content/memo를 실행 가능한 artifact로 바꾸고 기존 Calendar/Todo/Sheet/Memo로 이어주는 portable execution layer다.
- Home과 Find는 역할이 달라도 같은 source/job은 하나의 user-facing Flow object로 이어져야 한다.
- Flow Map은 내부 source bundle 또는 aggregate 개념이며 별도 사용자 저장 grammar가 되어서는 안 된다는 현재 결정을 우선 검토한다.
- source, personal overlay, execution run, recurrence occurrence, export identity를 섞지 않는다.
- P32 focused My Flow workspace는 downstream positive control이다. upstream duplicate identity와 구분한다.
- public /f shell과 4탭 IA를 current evidence 없이 전면 변경하지 않는다.
- fake usage count, fake rating, fake review를 만들지 않는다.
- 긴 설명을 추가해 interaction 문제를 덮지 않는다.
- 자동화, screenshot, agent simulation은 실제 사용자 관찰이 아니다.
- observed-user count는 0이다.

======================================================================
4. 상세 simulation: 8 personas x 3 sessions
======================================================================

공통 원칙:
1. 각 persona는 clean browser state에서 시작한다.
2. 같은 persona의 Session 1 결과를 Session 2와 Session 3으로 이어간다.
3. reload, back, revisit, repeated save를 포함한다.
4. destructive action은 disposable profile에서만 수행한다.
5. 화면 pass와 end-to-end identity pass를 별도로 판정한다.
6. fixture가 필요하면 fixture_only로 표시한다.

P1 Home-first moving
- S1: / -> /f/moving-d30-basic, source/title/count/artifact/adjust/save receipt
- S2: My Flow -> Calendar, complete/reopen/export parity
- S3: Home/Find/URL lookup 재진입 후 하나의 saved object인지

P2 Find-first moving
- S1: /flows -> /flow-maps/moving-d30, card/detail/adjust/save grammar
- S2: save handoff, My Flow object, Calendar/export
- S3: Home entry도 저장한 뒤 duplicate count와 recovery

P3 URL-first moving source
- S1: AJD source URL lookup result의 route/title/count
- S2: save -> My Flow -> Calendar identity
- S3: 4개 alias의 saved state, personal date/memo/completion continuity

P4 Existing duplicate returner
- S1: 24-item/5-item 두 Flow 저장 후 중복 인지 가능성
- S2: 한쪽 complete/date/memo 수정 후 다른 쪽과 Calendar/export 비교
- S3: archive/restore/reconciliation 대안과 data preservation

P5 Vehicle checklist expectation
- S1: Home promise와 /f/vehicle-inspection-prep target 비교
- S2: Calendar/Checklist choice, example/custom/undated save
- S3: /flows에서 차량/차량 점검/자동차검사 rediscovery

P6 Recurring workout
- S1: Home/Find entry, artifact choice, weekday/time/duration/end
- S2: dated/undated save, My Flow copy, Calendar occurrence, done/reopen
- S3: ICS/list export와 re-entry continuity

P7 Wedding positive control
- S1: two independent cards와 content-shape 차이
- S2: artifact choice, receipt, My Flow/Calendar/export
- S3: moving/vehicle에 재사용할 수 있는 successful grammar 추출

P8 Keyboard and responsive
- S1: 390x844 Home/Find flows keyboard-only
- S2: 1024x768와 1440x900 hierarchy
- S3: invalid input, repeated save, back/reload, focus/recovery

각 journey cell에 기록:
- personaId, sessionId, userGoal
- route, viewport, startingState
- steps, interactionDepth
- expectedMentalModel, actualFeedback, nextAction
- flowIdentityObserved, itemCountObserved, artifactObserved, saveObjectObserved
- reloadPersistence
- My Flow/Calendar/export parity
- recovery와 data preservation
- supported/hidden/partial/missing/blocked
- severity, evidenceKinds
- observedUserQuestion

======================================================================
5. Cross-entry invariant matrix
======================================================================

Home, Find catalog, URL lookup, direct public share, Flow Map, receipt, My Flow, Calendar, export에 대해 아래를 한 표로 작성한다.

- sourceUrl
- canonicalFlowId
- route
- displayTitle
- itemCount
- primaryArtifact
- secondaryArtifacts
- adjustCapabilities
- saveObjectId
- storageKeys
- receiptBehavior
- postSaveDestination
- myFlowObjectCount
- calendarProjectionCount
- exportProjectionCount

같은 source에서 어떤 필드가 달라져도 `의도된 content variant`, `route alias bug`, `legacy rollout gap`, `data migration risk` 중 무엇인지 분류한다.

======================================================================
6. Reviewer role별 추가 요구
======================================================================

reviewerRole=claude_design:
- 앱 코드를 수정하지 않는다.
- current 390/1024 화면과 proposed 390/1024 화면을 나란히 비교한다.
- Home과 Find 역할은 유지하면서 같은 canonical object로 이어지는 hierarchy를 설계한다.
- moving Home/Find/URL entry의 unified detail/save-before를 wireframe으로 제안한다.
- artifact result 선택 control의 selected/unselected/unsupported state를 설계한다.
- existing duplicate saved Flow를 사용자에게 보여줄 필요가 있는지 판단하고 필요한 경우 최소 reconciliation UX를 제안한다.
- Notion template gallery, Todoist templates, Calendar/task apps, travel/workout apps의 current reference를 비교하되 FlowMe를 full planner로 만들지 않는다.
- reference마다 가져올 pattern, 가져오지 않을 pattern, FlowMe 적용 근거를 기록한다.
- A/B/C 대안을 제시하고 하나를 추천한다.
- 긴 설명문 대신 hierarchy, progressive disclosure, direct manipulation으로 해결한다.

reviewerRole=codex_independent:
- git fetch 후 clean origin/main worktree를 사용한다.
- current production을 직접 조작하고 이전 audit 수치를 복사하지 않는다.
- current source에서 source URL -> Flow Map ID -> public slug -> URL lookup result -> saved slug -> storage key alias graph를 만든다.
- localStorage ownership과 duplicate save behavior를 확인한다.
- controlled artifact shape와 category-gated handler를 독립 확인한다.
- current E2E가 cross-entry invariant를 놓친 이유를 확인한다.
- legacy saved data를 파괴하지 않는 reconciliation A/B/C를 설계한다.
- migration 필요 여부, backup, rollback, data-loss risk를 기록한다.
- 검토 중 app code를 수정하지 않는다.
- 현재 기준으로 docs:check, unit, build, relevant targeted E2E를 실행하고 실행하지 못한 항목은 이유를 기록한다.
- 390/1024/1440 overflow, focus, accessible name, console/page error를 확인한다.

======================================================================
7. A/B/C 의사결정 요구
======================================================================

최소 세 대안을 비교한다.

A. canonical public /f + legacy route alias/handoff
B. canonical registry + role-specific shell, one save identity
C. broader discovery/detail consolidation

각 대안에 기록:
- user journey
- affected routes/components
- source/personal/run/occurrence/export 영향
- existing saved data 처리
- migration과 rollback
- accessibility/responsive 영향
- 장점, 단점, 위험
- acceptance screenshots와 test marker

감사 결론을 따라 A를 자동 선택하지 말고 current evidence로 추천한다.

======================================================================
8. 필수 산출물
======================================================================

- README.md: overall verdict와 핵심 단절
- audit.md: severity findings
- review.html: current/proposed, journey, A/B/C
- cross-entry-invariant-matrix.json
- persona-journey-scorecard.json: 24 cells
- alias-storage-impact.json
- decision-matrix.json
- p33-recommendation.md
- screenshots/

Overall verdict:
- audit_not_reproduced
- bounded_cross_entry_alignment
- canonical_flow_contract_reopen
- broader_discovery_experience_reopen

P33 후보에는 반드시 포함:
- problem
- current evidence
- dependency
- scope
- non-goals
- data impact
- migration
- rollback
- acceptance screenshot
- test marker

마지막 보고:
1. 확인한 SHA와 production 접근
2. 기존 감사 finding의 confirmed/reframed/rejected/inaccessible
3. 가장 심각한 cross-entry 단절
4. 24-cell scorecard 요약
5. A/B/C와 추천안
6. 유지할 P32 계약
7. P33 실행 순서
8. 실제 사용자에게만 확인할 질문
9. 검증 결과
10. app code, commit, push, PR, merge, deploy 상태

concrete current evidence가 없으면 P33을 만들지 않는다. 자동화 결과를 실제 사용자 검증으로 표현하지 않는다.
```
