# P32 독립 검토 복붙용 프롬프트

```text
D:\flowme2605\flow-mvp의 최신 origin/main과 production을 기준으로 FlowMe P32를 독립 검토해줘.

Production:
https://flowme2605.vercel.app

먼저 읽을 자료:
1. AGENTS.md
2. agent.md
3. docs/STATUS.md
4. docs/ROADMAP.md
5. docs/DECISIONS.md
6. docs/specs/2026-07-24-p32-my-flow-focused-workspace/README.md
7. docs/content-audit/2026-07-24-p32-final-review-package/README.md
8. docs/content-audit/2026-07-24-p32-final-review-package/audit.md
9. docs/content-audit/2026-07-24-p32-final-review-package/review.html
10. route-evidence.json, journey-results.json, screenshot-manifest.json

검토 목적:
- P32가 My Flow를 실제로 더 단순하고 예측 가능하게 만들었는지 평가한다.
- 새 기능을 먼저 제안하지 말고 현재 interaction의 correctness, hierarchy, continuity를 확인한다.
- 자동화나 agent simulation을 실제 사용자 검증으로 표현하지 않는다.

반드시 확인할 사용자 여정:
1. 20개 이상 Flow에서 검색 -> 열기 -> 이전 검색으로 돌아가기
2. 이사 Flow 열기 -> 다음 행동 -> 전체 계획 -> Item 제목·날짜·메모 수정
3. 이사일 변경 -> 개인 고정 날짜와 메모 유지 -> Calendar/export 비교
4. whole/selected/current export scope와 count 확인
5. active Flow 보관 -> reload -> archived filter -> 복구
6. routine Flow에서 series, occurrence, 완료/다시 열기 구분
7. 날짜 없는 checklist에서 실행과 선택적 날짜 배치
8. personal draft에서 quick value edit와 structural edit 의미 구분

대표 shape:
- moving-d30-basic
- travel-packing-list
- washer-tub-clean-monthly
- wedding-d180-basic
- used-car-buying-check
- weekly-meal-plan

Route 주의:
- /f/real-mofa-overseas-travel-prep는 의도적으로 닫혀 있다.
- public mixed-shape 사용성은 성공으로 간주하지 말고 blocked로 기록한다.
- fixture-only overseas-travel-d14와 실제 public route evidence를 섞지 않는다.

Viewport:
- 390x844
- 1024x768
- 1440x900

평가 질문:
- library의 지금/Flow 목록/완료와 focused workspace의 다음 행동/전체 계획/기록 역할이 구분되는가?
- 한 Flow를 열었을 때 global/local navigation이 경쟁하지 않는가?
- 다음 행동이 command와 export보다 먼저 읽히는가?
- quick edit가 완료, 제외, 삭제와 다른 의미로 보이는가?
- anchor 변경 결과와 개인 override 보존을 예측할 수 있는가?
- export scope/count와 lifecycle 결과를 실행 전에 이해할 수 있는가?
- mobile back과 wide 전체 보기가 query/filter/scroll 맥락을 보존하는가?
- six content shapes가 같은 object grammar를 쓰면서 각 body 의미를 잃지 않는가?
- 설명 copy 없이 사용할 수 있는가?

검증:
- npm.cmd ci
- npm.cmd run docs:check
- npm.cmd test
- npm.cmd run build
- targeted P32 E2E
- 가능하면 full E2E
- production browser interaction과 screenshot
- overflow, fixed overlap, console/page error, accessible name, keyboard focus

결과 형식:
1. findings를 severity 순으로 제시
2. route, viewport, 재현, 기대/실제, 사용자 영향, evidenceKind
3. P32 acceptance marker별 pass/partial/fail
4. B1 유지/수정/재검토 판단
5. 실제 사용자에게 확인해야 할 질문
6. 다음 P33 후보를 Blocking/High/Medium/Low로 제안

앱 코드를 검토 중 수정하지 않는다. observed-user count를 별도로 기록한다.
```
