# FlowMe P28 독립 검토 복붙 프롬프트

아래 내용을 Claude Design 또는 Codex의 새 대화에 그대로 붙여넣어 주세요.

```text
FlowMe P28 구현을 독립적으로 검토해줘. 앱 코드를 먼저 수정하지 말고, current production interaction과 current source/evidence를 대조해 UX hierarchy, correctness, cross-surface consistency를 평가해줘.

Production:
https://flowme2605.vercel.app

GitHub:
https://github.com/knhbae/flowme2605

P28 final review package:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-22-p28-final-review-package

먼저 볼 파일:
1. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-p28-final-review-package/README.md
2. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-p28-final-review-package/review.html
3. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-p28-final-review-package/audit.md
4. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-p28-final-review-package/route-evidence.json
5. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-p28-final-review-package/journey-results.json
6. https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-22-p28-final-review-package/screenshots

비교 설계 gate:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-22-p28-01-cross-surface-architecture-gate

P28 spec:
https://github.com/knhbae/flowme2605/tree/main/docs/specs/2026-07-21-p28-experience-reconstruction

검토할 owner feedback:
1. Flow 찾기/저장 전에도 제목, 날짜, 메모, 항목을 자연스럽게 조정할 수 있는가?
2. 홈트가 주 N회, 시간, 종료 조건만 이해하면 될 정도로 단순해졌는가?
3. 홈트의 실행·완료·원문 자료가 My Flow/Calendar의 공통 문법과 같은가?
4. Calendar에 Flow가 많아도 범위 선택이 가로로 늘어나지 않는가?
5. Flow 실행, Calendar, Checklist, Sheet, Memo가 실제 데이터 결과로 보이고 고정 5-tab gallery가 아닌가?
6. My Flow에서 1개와 20개 이상의 저장 Flow를 찾고 여는 구조가 실서비스 수준인가?

직접 시뮬레이션할 route:
- /f/moving-d30-basic
- /f/curated-allblanc-morning-workout
- /my?demo=ux20&view=flows
- /calendar?demo=ux12
- /f/used-car-buying-check
- /f/source-backed-middle-school-math-1
- /f/overseas-safety-register

Viewport:
- 390x844
- 1024x768
- 1440x900

각 route에서 다음을 확인해줘:
- 첫 viewport에서 무엇을 저장/실행할지 예측 가능한가
- 설명을 읽지 않고 주요 다음 행동을 찾을 수 있는가
- whole outline과 actual-data result가 중복되거나 경쟁하지 않는가
- 수정 entry가 보이고 원본과 개인 수정 경계가 맞는가
- 완료 control이 executable item/occurrence에만 있는가
- resource/reference/warning이 완료 항목처럼 보이지 않는가
- Flow가 많을 때 search/picker가 bounded한가
- keyboard focus, accessible name, fixed overlap, horizontal overflow, console/page error

결과 규칙:
- 자동화와 heuristic simulation을 실제 사용자 검증이라고 표현하지 않는다.
- current production interaction > current screenshot > current source > prior artifact 순으로 판단한다.
- findings를 Blocking / High / Medium / Low 순으로 먼저 쓴다.
- 각 finding에 route, viewport, 재현 순서, 기대/실제, 사용자 영향, evidenceKind, 권장 수정, acceptance marker를 포함한다.
- 긴 설명을 추가하는 것으로 hierarchy 문제를 해결하지 않는다.
- source, personal overlay, execution run, routine occurrence, export identity를 다시 합치지 않는다.
- P28의 Hybrid 구조 자체가 틀렸다고 판단하면 부분 patch보다 재설계안을 제안해도 된다.

마지막에 다음 형식으로 답해줘:
1. P28 전체 판정: keep / revise / redesign
2. owner feedback 1~6 각각의 판정
3. 현재 화면에서 유지할 것
4. 반드시 바꿀 것
5. 보류할 것과 이유
6. 화면별 current vs proposed hierarchy
7. P29 Blocking / High / Medium / Low backlog
8. 실제 사용자 관찰 전에 반드시 닫아야 할 항목
9. 자동화로 확인한 것과 사람에게 물어볼 것을 분리

앱 코드는 수정하지 말고 독립 검토 산출물만 작성해줘.
```
