# FlowMe P29 독립 검토 복붙용 프롬프트

아래 내용을 Claude Design 또는 Codex에 그대로 전달한다.

```text
FlowMe P29 production UX/UI와 구현 계약을 독립적으로 검토해줘.

중요:
- 앱 코드를 먼저 수정하지 않는다.
- production interaction, current screenshot, current source, prior artifact를 구분한다.
- 자동화와 agent simulation을 실제 사용자 관찰로 표현하지 않는다.
- 긴 설명을 추가하는 방식으로 hierarchy 문제를 덮지 않는다.
- FlowMe를 무거운 planner로 확장하지 않는다.

Production:
https://flowme2605.vercel.app

GitHub:
https://github.com/knhbae/flowme2605

P29 final package:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-22-p29-final-review-package

먼저 읽을 파일:
1. docs/content-audit/2026-07-22-p29-final-review-package/README.md
2. docs/content-audit/2026-07-22-p29-final-review-package/review.html
3. docs/content-audit/2026-07-22-p29-final-review-package/audit.md
4. docs/content-audit/2026-07-22-p29-final-review-package/route-evidence.json
5. docs/content-audit/2026-07-22-p29-final-review-package/journey-results.json
6. docs/content-audit/2026-07-22-p29-final-review-package/marker-reconciliation.json
7. docs/content-audit/2026-07-22-p29-final-review-package/legacy-e2e-migration.json
8. docs/content-audit/2026-07-22-p29-final-review-package/screenshots/
9. docs/specs/2026-07-22-p29-coordinated-surface-reset/plan.md
10. docs/STATUS.md
11. docs/ROADMAP.md

전략적 기준:
- FlowMe는 원문·URL·메모를 실행 가능한 Flow로 바꾸는 portable execution layer다.
- 한 원문은 우선 한 사용자 job과 한 natural primary artifact로 읽혀야 한다.
- source, personal overlay, execution run, recurrence occurrence, export identity를 분리한다.
- save-before, saved receipt, returning execution은 서로 다른 frame이다.
- 콘텐츠마다 primary 1개와 실제 가치가 있는 secondary 최대 2개만 제안한다.
- 날짜 없는 할 일은 오류가 아니라 실행 항목이며, Calendar에서는 명시적 배치 queue로 다룬다.
- 완료는 되돌릴 수 있어야 하며 selection, deletion, exclusion과 다른 의미다.
- export는 format보다 whole/selected/current scope와 실제 count를 먼저 보여준다.
- 4탭 IA, public /f shell, source fidelity는 유지한다.

직접 재현할 사용자 여정:

1. 이사 Flow
   /f/moving-d30-basic
   -> 실제 Calendar 결과 확인
   -> 조정 mode
   -> 저장
   -> 별도 receipt
   -> My Flow 시작
   -> Calendar 보기
   -> Flow 전체 export

2. 반복 운동 Flow
   /f/curated-allblanc-morning-workout
   -> 반복 summary 이해
   -> 다음 3회 확인
   -> 조정 열기
   -> 요일/시간/예상 시간/종료 이해
   -> 저장 후 한 occurrence 완료와 다시 열기

3. 많은 My Flow
   /my?demo=ux20&view=flows
   -> 27개 목록 scan
   -> 검색
   -> 한 Flow 열기
   -> 다음 행동 확인
   -> 전체 계획 확인
   -> 완료/다시 열기
   -> 가져가기

4. 많은 Calendar
   /calendar?demo=ux20
   -> 닫힌 Flow 범위 이해
   -> 검색하고 2개 선택
   -> selected-day agenda 확인
   -> 날짜 없는 할 일 sheet 열기
   -> 여러 항목 날짜 배치
   -> undo

5. 결과 선택과 export
   /f/moving-d30-basic
   -> primary/secondary 결과 이유와 count 확인
   -> Flow 전체 export
   -> My Flow에서 선택 항목 export
   -> 현재 항목 export
   -> receipt의 scope/count/identity 확인

각 여정은 390x844, 1024x768에서 확인하고 핵심 화면은 1440x900도 비교한다.

필수 검토 질문:
- 첫 viewport에서 실제 결과, 조정, 저장 순서가 설명 없이 읽히는가?
- 저장 전 화면과 저장 완료 receipt가 명확히 다른가?
- 같은 Flow가 public, receipt, My Flow, Calendar에서 같은 object처럼 보이는가?
- routine이 다른 Flow와 같은 실행 문법을 쓰는가?
- My Flow 20개 이상에서 next action 중심으로 찾고 열 수 있는가?
- Calendar scope와 날짜 없는 queue가 한 workspace로 이해되는가?
- 1024 Calendar의 compact label이 과도하게 잘리거나 의미를 잃지 않는가?
- primary/secondary artifact와 whole/selected/current export scope가 구분되는가?
- 고정 command, bottom nav, sheet가 content나 focus를 가리지 않는가?
- 설명 문구를 줄여도 hierarchy와 direct manipulation만으로 과업이 가능한가?

Evidence 표기:
- current_production_interaction
- current_package_screenshot
- current_source
- prior_design_artifact
- reference_pattern
- heuristic_simulation
- inaccessible

결과 형식:
1. 전체 verdict: keep / revise / redesign
2. Blocking / High / Medium / Low findings
3. finding별 route, viewport, 재현 단계, 기대/실제, 사용자 영향, evidenceKind
4. P29에서 실제로 개선된 점
5. 아직 설명·밀도·발견성으로 남은 점
6. source/personal/run/occurrence/export 계약 회귀 여부
7. 390/1024/1440 visual hierarchy와 접근성 판정
8. P30이 필요하다면 문제 중심 backlog와 dependency 순서
9. 실제 사용자에게만 확인할 질문

P30을 제안할 때는 새 기능 목록을 만들지 말고, P29에서 남은 evidence gap만 다룬다. 구현 가능한 slice와 실제 사용자 관찰 질문을 분리한다.
```
