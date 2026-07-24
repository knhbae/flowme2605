# Claude Design 복붙용 프롬프트

```text
FlowMe의 Home, Flow 찾기, URL lookup, public detail, 저장 receipt, My Flow, Calendar가 같은 콘텐츠를 하나의 사용자 Flow로 이어주는지 UX/UI 관점에서 독립 검토해줘.

이번 요청은 앱 구현이 아니다. 코드를 수정하지 말고 production과 GitHub evidence를 확인한 뒤 상세 persona simulation, current/proposed wireframe, reference comparison, A/B/C 대안을 작성한다.

Production:
https://flowme2605.vercel.app

GitHub review branch:
https://github.com/knhbae/flowme2605/tree/cross-entry-review-handoff-20260724

가장 먼저 읽을 package:
https://github.com/knhbae/flowme2605/tree/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-consistency-audit

Visual review:
https://github.com/knhbae/flowme2605/blob/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-consistency-audit/review.html

Detailed audit:
https://github.com/knhbae/flowme2605/blob/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-consistency-audit/audit.md

Review scenarios:
https://github.com/knhbae/flowme2605/blob/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-independent-review-handoff/review-scenarios-ko.md

Output contract:
https://github.com/knhbae/flowme2605/blob/cross-entry-review-handoff-20260724/docs/content-audit/2026-07-24-flowme-cross-entry-canonical-independent-review-handoff/review-output-contract.json

P32 baseline:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-24-p32-final-review-package

Current product decision:
https://github.com/knhbae/flowme2605/blob/main/docs/DECISIONS.md

현재 감사 가설:
1. 같은 AJD moving source가 Home 24-item, Find 5-item, URL lookup 5-item 등 최소 4 route로 갈린다.
2. 두 entry를 저장하면 My Flow에 별도 객체 2개가 생긴다.
3. Find catalog 9개 중 5개는 legacy Flow Map, 4개는 artifact-first다.
4. moving/vehicle의 artifact choice button은 작동하지 않고 wedding/workout에서는 작동한다.
5. Home vehicle의 generic checklist promise와 D-14 Calendar target이 다르다.
6. undated workout의 My Flow에 raw RRULE이 노출된다.

이 가설을 그대로 반복하지 말고 production에서 confirmed/reframed/rejected/inaccessible로 판정한다.

제품 원칙:
- FlowMe는 heavy planner가 아니라 portable execution layer다.
- Home과 Find 역할은 달라도 같은 source/job은 하나의 user-facing Flow object로 이어져야 한다.
- P32 focused My Flow workspace는 유지할 downstream positive control이다.
- public /f shell과 4탭 IA를 근거 없이 전면 변경하지 않는다.
- fake usage/review/rating을 만들지 않는다.
- 긴 설명을 추가해 interaction 문제를 덮지 않는다.
- 자동 simulation은 실제 사용자 검증이 아니다. observed-user count는 0이다.

8 personas x 3 sessions를 실행한다:
1. Home-first moving
2. Find-first moving
3. URL-first moving source
4. existing duplicate returner
5. vehicle checklist expectation
6. recurring workout
7. wedding positive control
8. keyboard/responsive

각 persona는 발견 -> 상세 이해 -> 조정 -> 저장 -> receipt -> My Flow -> Calendar/export -> 재진입의 3-session 흐름을 사용한다. 같은 persona의 상태를 session 사이에 유지한다.

반드시 디자인할 current/proposed 화면:
- 390 Home usage card
- 390 Find card
- 390 canonical moving save-before
- 390 result choice states
- 390 receipt와 My Flow handoff
- 390 duplicate existing Flow reconciliation이 필요할 경우 최소 UI
- 1024 Home/Find/detail
- 1024 My Flow downstream continuity

Home과 Find를 똑같은 페이지로 만들 필요는 없다. 역할별 context는 유지하되 같은 object title/source/count/result/save state로 이어지는 문법을 제안한다.

Reference research:
- Notion template gallery/detail
- Todoist templates
- calendar/task apps
- travel planning apps
- workout/routine apps

각 reference에 대해:
- 확인한 current source/link
- 가져올 pattern
- 가져오지 않을 pattern
- FlowMe에 적용할 이유

FlowMe를 full planner로 확장하지 않는다.

A/B/C 대안:
A. canonical /f route + legacy alias/handoff
B. canonical registry + role-specific shell + one save identity
C. broader discovery/detail consolidation

각 대안을 390/1024 wireframe, journey depth, 장단점, data/migration UI 영향, rollback 관점에서 비교하고 하나를 추천한다.

필수 산출물:
- README.md
- audit.md
- review.html
- current-proposed screenshots/wireframes
- persona-journey-scorecard.json 24 cells
- cross-entry-invariant-matrix.json
- decision-matrix.json
- p33-recommendation.md

Overall verdict:
- audit_not_reproduced
- bounded_cross_entry_alignment
- canonical_flow_contract_reopen
- broader_discovery_experience_reopen

마지막에 실제 사용자에게만 확인할 질문을 분리하고 앱 코드 무변경과 observed-user 0을 명시한다.
```
