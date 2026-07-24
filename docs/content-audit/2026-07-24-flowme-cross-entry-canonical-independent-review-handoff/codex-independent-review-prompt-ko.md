# Codex 독립 검토 복붙용 프롬프트

```text
D:\flowme2605\flow-mvp와 current production을 기준으로 FlowMe cross-entry canonical Flow 정합성을 독립 검토해줘.

이번 요청은 구현이 아니다. 앱 코드를 수정하지 말고 current production 재현, current source alias/storage graph, test gap, backward compatibility, migration·rollback 위험과 다음 bounded slices를 작성한다.

Production:
https://flowme2605.vercel.app

GitHub:
https://github.com/knhbae/flowme2605

Review branch:
cross-entry-review-handoff-20260724

먼저 읽을 local package:
D:\flowme2605\flow-mvp\docs\content-audit\2026-07-24-flowme-cross-entry-canonical-consistency-audit

Review handoff:
D:\flowme2605\flow-mvp\docs\content-audit\2026-07-24-flowme-cross-entry-canonical-independent-review-handoff

branch package가 현재 checkout에 없으면 git fetch 후 review branch 또는 GitHub package를 읽는다. 기존 dirty worktree를 변경하지 말고 latest origin/main에서 clean worktree를 만든다.

GitHub package:
https://github.com/knhbae/flowme2605/tree/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-consistency-audit

P32 baseline:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-24-p32-final-review-package

검토 기준 origin/main:
e491d99ca61ecae4fd0dd009f785e737b6a59516

현재 production app release:
30281a7a8ea9bea1194b4104b5a49b6211c07e3b

작업 시작:
1. AGENTS.md, agent.md, docs/harness/README.md를 읽는다.
2. git fetch 후 actual origin/main SHA를 기록한다.
3. clean worktree를 사용한다.
4. package-lock.json을 그대로 사용한다.
5. prior audit 결과를 current result로 복사하지 않는다.
6. 검토 중 app code, dependency, status docs를 수정하지 않는다.

재검증할 가설:
- same AJD source has at least four user-facing routes
- Home /f/moving-d30-basic has 24 items
- Find /flow-maps/moving-d30 has 5 items
- URL lookup resolves to another 5-item public route
- saving Home and Find aliases produces two My Flow objects
- first five Find cards use legacy hybrid and last four use artifact-first
- moving/vehicle visible artifact choice does not change projection
- wedding/workout choice works
- Home vehicle is not rediscoverable in hydrated Find catalog
- undated workout leaks raw RRULE in My Flow

각 가설을 confirmed/reframed/rejected/inaccessible로 판정하고 route, viewport, steps, expected/actual, impact, evidenceKind를 기록한다.

Current source에서 반드시 조사:
- app/flows/page.tsx
- components/flow/AppClient.tsx
- components/flow/FlowArtifactDataPreview.tsx
- components/flow/FlowSaveBeforeFrame.tsx
- components/flow/SourceBackedFlowMapSaveButton.tsx
- lib/flow/storage.ts
- lib/flow/url-first-lookup.ts
- lib/flow/source-backed-my-flow.ts
- tests/e2e/flow-mvp.spec.ts
- tests/e2e/p26-discovery-save-before.spec.ts
- tests/e2e/p30-evidence-gap-closure.spec.ts
- tests/e2e/p32-focused-workspace.spec.ts

다음 alias graph를 작성:
source URL
-> Flow Map ID
-> recommended child Flow
-> public slug
-> URL lookup result
-> save object ID
-> localStorage keys
-> My Flow identity
-> Calendar/export identity

같은 source의 route별로 기록:
- title
- item count
- primary/secondary artifact
- adjust capabilities
- save action
- receipt
- post-save href
- saved record key
- personal/run state ownership

8 personas x 3 sessions:
1. Home-first moving
2. Find-first moving
3. URL-first moving source
4. existing duplicate returner
5. vehicle checklist expectation
6. recurring workout
7. wedding positive control
8. keyboard/responsive

상세 단계:
docs/content-audit/2026-07-24-flowme-cross-entry-canonical-independent-review-handoff/review-scenarios-ko.md

Cross-entry invariant:
- same source -> one canonical user-facing Flow ID
- Home/Find/URL alias -> same title/count/artifact eligibility
- repeated alias save -> one My Flow object
- one personal/run state
- one Calendar/export projection
- every visible artifact choice changes selected projection
- Home examples are rediscoverable in Find
- server fallback and hydrated catalog inventory agree

Legacy reconciliation A/B/C를 비교:
A. canonical route alias only
B. additive canonical registry + read-time reconciliation
C. explicit one-time user merge

각 대안:
- existing saved data preservation
- personal title/date/memo
- completion/run history
- recurrence occurrence
- archive state
- export receipt/history
- backup
- rollback
- source-backed re-save
- data-loss risk

P32 focused My Flow workspace, source/personal/run/occurrence/export contract, public /f shell, 4-tab IA는 근거 없이 다시 쓰지 않는다.

Browser verification:
- 390x844
- 1024x768
- 1440x900
- horizontal overflow
- fixed/sticky overlap
- accessible names
- keyboard focus
- console/page errors

Current commands:
- npm.cmd ci
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- relevant targeted Playwright
- 필요하면 full E2E, 실행하지 않으면 이유
- git diff --check

이전 command 수치를 이번 실행 결과처럼 표현하지 않는다.

필수 산출물:
- README.md
- audit.md
- review.html
- cross-entry-invariant-matrix.json
- persona-journey-scorecard.json 24 cells
- alias-storage-impact.json
- decision-matrix.json
- p33-recommendation.md
- screenshots/

Overall verdict:
- audit_not_reproduced
- bounded_cross_entry_alignment
- canonical_flow_contract_reopen
- broader_discovery_experience_reopen

P33 후보는 최대 6개로 제한하고 problem, evidence, dependency, scope, non-goal, data impact, migration, rollback, screenshot, test marker를 포함한다.

마지막에 current SHA, production 접근, findings, 검증 결과, 실제 사용자에게 확인할 질문, app code 무변경, commit/push/PR/merge/deploy 상태, observed-user 0을 요약한다.
```
