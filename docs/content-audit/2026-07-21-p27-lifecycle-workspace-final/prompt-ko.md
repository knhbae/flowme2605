# P27 독립 재검토 복붙용 프롬프트

FlowMe P27의 현재 production과 GitHub main을 독립적으로 검토해줘. 앱 코드를 먼저 수정하지 말고, 아래 final package와 실제 화면을 대조해 correctness, 라이프사이클 정합성, 정보 위계, 모바일/와이드 품질을 평가해줘.

Production: <https://flowme2605.vercel.app>

GitHub: <https://github.com/knhbae/flowme2605>

검토 패키지: `docs/content-audit/2026-07-21-p27-lifecycle-workspace-final/`

우선 읽기:

1. `README.md`
2. `review.html`
3. `audit.md`
4. `route-evidence.json`
5. `capture-results.json`
6. `docs/specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation/spec.md`

다음 여정을 직접 시뮬레이션해줘.

1. 이사 Flow 전체 미리보기 → 조정 → 항목 고르기 → 날짜 → 제목·메모 → 순서 → 저장 → 같은 전체 Flow 확인
2. 홈트 Flow에서 `미리보기 4주`와 `종료일 없음` 구분 → 저장 → occurrence 완료/재개 → Calendar 확인
3. My Flow 3개 상태에서 특정 Flow 찾기 → 보관 → 즉시 되돌리기 → 다시 보관 → 새로고침 뒤 복구
4. My Flow 12개 상태에서 검색 → 검색 결과 열기 → 해당 전체 Flow workspace 확인
5. source Item 빼기 → reload → 복구 → Calendar/export membership 확인
6. 확인 항목 추가·수정과 영상 resource 확인 → source URL 보존 확인
7. 저장 결과의 전체 Flow → export scope/count/destination/loss notice 확인

모바일 `390x844`, wide `1024x768`에서 확인하고 다음을 기록해줘.

- route, viewport, 재현 단계
- 기대/실제
- severity: Blocking / High / Medium / Low
- evidenceKind: current_production_interaction / current_source / current_package_screenshot / heuristic_simulation / inaccessible
- overflow, fixed overlap, console/page error
- accessible name, keyboard, focus return
- source/personal overlay/run/occurrence/export identity 영향

특히 아래 질문에 답해줘.

- 저장 전 조정이 실제로 한 작업에만 집중되는가?
- `보관`과 Item 제외가 완료·삭제와 구분되는가?
- 반복 preview와 series end를 오해할 여지가 있는가?
- resource와 subcheck가 다른 수준으로 보이는가?
- 작은 My Flow와 큰 My Flow 모두 찾기 쉬운가?
- 저장 직후와 다시 방문한 My Flow가 같은 화면 문법을 쓰는가?
- export가 전체 목록을 다시 반복하지 않고 범위와 결과를 예측하게 하는가?

자동화와 agent simulation을 실제 사용자 검증으로 표현하지 마. 관찰 사용자 수는 현재 `0`이다. 결과는 findings를 먼저 쓰고, 문제가 없다면 검증 공백과 실제 사용자에게 물어야 할 질문을 명시해줘.
