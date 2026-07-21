# FlowMe P28-00 Claude Design / Codex 공통 검토 프롬프트

아래 본문을 Claude Design과 Codex에 동일하게 전달한다.

---

FlowMe P28-00 약속 대비 구현 정합성 및 저장 전 UX 통합 재검토를 진행해줘.

이번 요청은 앱 구현이 아니다. 현재 production, GitHub main, P27 산출물, 이전 UX 제안과 사용자 피드백을 대조하고 다음 구현 프로그램을 확정하는 독립 검토 작업이다.

Claude Design과 Codex 모두 같은 범위로 검토하되 다음 역할 차이를 둔다.

- Claude Design: 사용자 여정, 화면 위계, interaction, 모바일·와이드 wireframe과 시각적 대안을 중심으로 검토
- Codex: current source, 데이터 계약, 기존 구현 범위, 기술적 실현 가능성, 회귀 위험과 단계별 구현 순서를 중심으로 검토

자동화, heuristic simulation, 에이전트 검토를 실제 사용자 관찰이라고 표현하지 않는다.

## 1. 먼저 확인할 현재 서비스와 자료

Production:
https://flowme2605.vercel.app

GitHub:
https://github.com/knhbae/flowme2605

현재 상태:
https://github.com/knhbae/flowme2605/blob/main/docs/STATUS.md

로드맵:
https://github.com/knhbae/flowme2605/blob/main/docs/ROADMAP.md

제품 결정:
https://github.com/knhbae/flowme2605/blob/main/docs/DECISIONS.md

P27 final package:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-21-p27-lifecycle-workspace-final

P27 production closeout:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-21-p27-production-closeout

P27 사용자 피드백 종합:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-21-p27-user-feedback-synthesis

P27 reconciliation spec:
https://github.com/knhbae/flowme2605/tree/main/docs/specs/2026-07-21-p27-flow-lifecycle-workspace-reconciliation

핵심 UI:
https://github.com/knhbae/flowme2605/blob/main/components/flow/AppClient.tsx

Artifact workbench:
https://github.com/knhbae/flowme2605/blob/main/components/flow/ArtifactWorkbench.tsx

P27 E2E:
https://github.com/knhbae/flowme2605/blob/main/tests/e2e/p27-foundation.spec.ts

P28 handoff package:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-21-p28-00-promise-delivery-reconciliation

이전 콘텐츠 사용 프로토타입:
https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-21-p28-00-promise-delivery-reconciliation/prior-artifacts/flow-content-usage-preview-ko.html

프로토타입 약속 요약:
https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-21-p28-00-promise-delivery-reconciliation/artifact-summary.md

Claude Design 이전 검토:
https://github.com/knhbae/flowme2605/blob/main/claude_work/FlowMe%20UXUI%20%EC%A0%84%EC%B2%B4%20%EA%B2%80%ED%86%A0%20(10).zip

`flow-content-usage-preview-ko.html`은 current implementation이 아니라 `prior_design_artifact`다. 하지만 다음 약속을 포함하므로 반드시 current production과 비교한다.

- 콘텐츠 유형별 최소 입력
- 저장 전에 보는 전체 Flow
- Calendar, Checklist, Sheet, Memo 형태의 결과 미리보기
- 콘텐츠별 primary destination
- 필요한 secondary destination
- source와 권리·위험 상태
- 저장 또는 외부 이동 전 예상 결과

일부 GitHub 링크가 열리지 않으면 production과 접근 가능한 GitHub source로 계속 검토하고, 확인하지 못한 자료만 `evidenceKind: inaccessible`로 표시한다.

## 2. 제품 방향

FlowMe는 무거운 planner가 아니라 portable execution layer다.

원문·URL·메모
→ 실행 가능한 전체 Flow
→ 최소 개인화
→ 결과 형태 미리보기
→ My Flow에서 실행하거나 기존 도구로 이동
→ 완료·수정·회고·재사용

유지할 원칙:

- 먼저 쓸 만한 전체 결과를 보여준다.
- 필요한 사용자 값만 점진적으로 입력받는다.
- 원문에서 확보한 값을 다시 입력시키지 않는다.
- 모든 콘텐츠에 Calendar, Checklist, Sheet, Memo를 강제로 제공하지 않는다.
- 콘텐츠에 가장 자연스러운 primary artifact를 먼저 제안한다.
- 가치가 있는 secondary artifact만 제한적으로 보여준다.
- source, personal overlay, execution run, recurrence occurrence, export identity를 분리한다.
- 긴 설명문으로 UI 문제를 덮지 않는다.
- 실제 기능이 없는 상태를 AI가 처리하는 것처럼 과장하지 않는다.

## 3. 이번 검토의 핵심 질문

P27에서 구현했다고 선언한 것과 실제 production에서 사용자가 경험하는 것을 분리해 평가한다.

각 약속을 다음 중 하나로 분류한다.

- complete_verified
- partial
- missing
- deferred_with_reason
- superseded
- inaccessible

특히 다음 항목을 확인한다.

1. 저장 전 전체 Flow가 충분히 보이는가?
2. 사용자는 저장 전에 무엇이 저장되는지 알 수 있는가?
3. 저장 전에 제목, 항목, 날짜, 순서, 포함 여부를 필요한 만큼 조정할 수 있는가?
4. 콘텐츠에 맞는 결과 형태가 먼저 제안되는가?
5. Calendar, Checklist, Sheet, Memo 결과를 실제 데이터로 비교할 수 있는가?
6. 의미 없는 결과 형태는 숨겨지는가?
7. 저장 결과 화면과 일반 My Flow가 같은 화면 문법을 사용하는가?
8. My Flow에서 저장한 Flow를 찾고 전체 구조를 이해하기 쉬운가?
9. 반복 Flow의 기간, series, occurrence가 명확한가?
10. Flow와 Item을 삭제·복구할 수 있는가?
11. 확인 항목, 실행 항목, URL·영상 resource가 역할에 맞게 구분되는가?
12. Calendar에서 특정 Flow만 볼 수 있는가?
13. 같은 날짜 항목이 My Flow에서 자연스럽게 묶이는가?
14. 전체·선택·개별 export 범위가 직관적인가?
15. 저장 전 조정 UX가 기존 Calendar·Todo·Notion 수준과 비교해 충분한가?

## 4. 다섯 가지 콘텐츠 시뮬레이션

아래 다섯 사례를 각각 독립적인 사용자 여정으로 시뮬레이션한다.

1. 이사 준비
   - 기준일 역산형
   - primary: Calendar
   - secondary: Checklist 또는 Memo
2. K-MOOC 강의 계획
   - 주차·순서·진도형
   - primary: Sheet 또는 Checklist
   - secondary: Calendar
3. 농작업 폭염 대응
   - 조건·안전형
   - primary: Checklist 또는 safety guidance
   - 날짜를 억지로 만들지 않음
4. 인테리어·리모델링 계약 검토
   - 비교·기록형
   - primary: Sheet 또는 Memo
   - 실행 항목과 참고자료를 분리
5. 부모님 여행 동선
   - 일정·장소·메모 혼합형
   - primary: Calendar
   - secondary: Checklist 또는 Memo

각 사례에서 다음 순서를 재현한다.

원문·URL·메모 입력
→ 기존 Flow 발견 또는 source 상태 확인
→ 최소 입력
→ 저장될 전체 Flow 확인
→ primary 결과 형태 미리보기
→ secondary 결과 형태 확인
→ 제목·항목·날짜·순서·포함 여부 조정
→ My Flow 저장 또는 외부 export
→ 결과 receipt
→ My Flow 또는 Calendar에서 다시 열기
→ 완료·수정·삭제·복구·재사용

각 단계에서 다음을 기록한다.

- 사용자가 보는 정보
- 사용자가 내려야 하는 결정
- primary action
- 불필요하거나 중복된 설명
- 도달 단계 수
- 막히는 지점
- current production의 지원 여부
- 필요한 설계 또는 구현 변경

## 5. 저장 전 UX 대안 비교

다음 세 대안을 비교한다.

A. 전역 5개 사례 Gallery
- `/flows`에서 콘텐츠 사례와 결과 형태를 먼저 보여주는 방식

B. Flow별 Artifact-first
- Flow를 찾은 뒤 해당 Flow에 가장 자연스러운 결과 형태를 먼저 보여주는 방식

C. Hybrid
- 처음에는 대표 사례를 보여주되, 실제 Flow 진입 후에는 콘텐츠별 primary artifact 중심으로 전환하는 방식

평가 기준:

- 처음 온 사용자의 이해
- 콘텐츠 확장성
- 모바일 밀도
- 저장 전 조정 가능성
- destination 오해 가능성
- source 신뢰
- 구현 복잡도
- 기존 P27 구조와의 호환성
- 장기 유지 비용

하나를 권장안으로 선정하고 이유를 설명한다.

단순히 5개 카드를 홈에 나열하는 것이 답이라고 가정하지 않는다. 다섯 사례는 기능 요구와 UX 계약을 검증하는 대표군으로 사용한다.

## 6. Claude Design 결과 요구

Claude Design은 앱 코드를 수정하지 않는다.

다음 화면의 current와 proposed를 나란히 비교한다.

- `/`
- `/flows` empty/input/result
- 이사 Flow 저장 전
- 반복 운동 Flow 저장 전
- 저장 직후 receipt
- 일반 My Flow
- My Flow 전체 Flow 보기
- Calendar Flow filter와 undated 상태
- export scope 선택

필수 wireframe:

- 모바일 390×844
- 와이드 1024×768 또는 1440×900
- 저장 전 전체 Flow
- 최소 조정 mode
- Calendar/Checklist/Sheet/Memo 결과 예시
- My Flow 검색·목록·상세
- 반복 Flow hierarchy
- 삭제·복구
- resource와 확인 항목 구분

wireframe에는 긴 설명을 넣지 말고 실제 사용자 action과 데이터로 문제를 해결한다.

## 7. Codex 결과 요구

Codex는 이번 검토에서 앱 코드를 수정하지 않는다.

다음을 current source 기준으로 평가한다.

- 5개 사례를 표현할 현재 데이터 계약
- primary/secondary artifact eligibility
- 저장 전 전체 Flow projection
- 저장 전 edit와 저장 후 personal overlay의 재사용 가능성
- source/personal/run/occurrence/export 경계
- Flow와 Item archive/restore
- resource와 subcheck 데이터 구조
- series와 occurrence
- Flow filter
- export scope
- 기존 P27 컴포넌트 재사용 가능 범위
- 새 migration 필요 여부
- 예상 회귀 위험

Claude Design 제안을 구현 가능한 slice로 변환하되 이번에는 구현하지 않는다.

## 8. Evidence 규칙

모든 주요 판단에 다음 중 하나 이상을 붙인다.

- current_production_interaction
- current_package_screenshot
- current_source
- prior_design_artifact
- reference_pattern
- heuristic_simulation
- inaccessible

자동화와 simulation은 실제 사용자 검증이 아니다.

production, source, prior artifact가 충돌하면 다음 우선순위를 사용한다.

1. current production interaction
2. current production screenshot
3. current source
4. current structured evidence
5. prior design artifact
6. reference pattern

## 9. 이번 검토에서 하지 않을 것

- 앱 코드 수정
- migration 실행
- AI API 연결
- crawler 구현
- 계정·DB·cloud sync
- Google Calendar·Todoist·Notion OAuth
- 4탭 IA 변경
- Studio를 5번째 탭으로 승격
- 모든 외부 도구를 대체하는 planner 설계
- 검토 없이 P27 완료 선언을 그대로 인용

## 10. 최종 산출물

결과를 다음 순서로 작성한다.

1. 전체 판정
2. 사용자 약속 대비 실제 구현 matrix
3. P27에서 실제 완료된 범위
4. partial 또는 누락된 범위
5. 다섯 콘텐츠 사례별 journey 결과
6. A/B/C 저장 전 UX 비교
7. 권장 UX 구조
8. mobile/wide wireframe
9. 데이터·migration·회귀 위험
10. P28 실행 백로그
11. 실제 사용자 관찰 전 필요한 gate
12. 실제 사용자에게 확인할 질문

P28 백로그는 최소 다음 구조로 만든다.

- P28-01: 저장 전 전체 Flow와 artifact preview shell
- P28-02: 콘텐츠별 primary/secondary destination 정책
- P28-03: 저장 전 contextual adjustment workspace
- P28-04: My Flow 탐색·전체 Flow·삭제·복구 hierarchy
- P28-05: Calendar filter, 반복 hierarchy, export scope 통합
- P28 regression/final gate

각 항목에 다음을 포함한다.

- 사용자 문제
- 적용 route
- 구현 범위
- 비범위
- 데이터 영향
- dependency
- 모바일·와이드 acceptance
- 접근성 acceptance
- unit/E2E 요구
- screenshot marker
- 완료 기준

현재 P27 결과를 전부 폐기하거나 유지한다고 먼저 결론 내리지 않는다. 검증된 계약은 보존하고, 부족한 저장 전 UX와 My Flow 구조만 근거에 따라 재설계한다.

최종적으로 “다음에 무엇을 구현할 것인가”보다 먼저 “사용자에게 어떤 전체 경험을 약속하고 있는가”와 “현재 production이 그 약속을 어디까지 지키는가”를 명확하게 보여줘.
