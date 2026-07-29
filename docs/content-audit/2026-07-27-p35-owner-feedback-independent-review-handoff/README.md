# FlowMe P35 사용자 피드백 독립 검토 Handoff

- 작성일: 2026-07-27
- 검토 대상 branch: `codex/p35-mece-ux-reset`
- 기준 SHA: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- P35 상태: local implementation + automated gate pass
- 실제 관찰 사용자: `0`
- 앱 코드 변경: 이 패키지에서는 없음

## 1. 검토 대상

이번 검토 대상은 현재 production이 아니라 P35 Preview다.

- P35 Preview: <https://flowme2605-n5o0dw81h-flowme.vercel.app>
- Production 비교 기준: <https://flowme2605.vercel.app>
- Preview deployment: `dpl_5LnB4w6kAzTkBuwR48y3qCupVGQS`

Vercel에 접근할 수 없는 검토자는 서버 없이 열리는
[오프라인 Preview](./offline-preview/index.html)를 먼저 사용한다. 이 묶음에는
현재 로컬 브라우저 상태 18개, 각 상태의 accessible action·본문 JSON, P35-01~P35-08
참고 캡처 37개가 들어 있다.

P35는 다음 방향을 구현한 후보안이다.

1. 전역 탐색을 `Flow 찾기 / 캘린더 / 내 Flow` 3개로 단순화
2. public Flow에서 설명보다 실제 결과를 먼저 표시
3. 저장 전에는 한 번에 한 종류의 조정만 열기
4. 내 Flow를 저장 목록과 선택한 한 Flow의 집중 workspace로 분리
5. 캘린더를 날짜가 있는 개인 실행 항목의 lens로 제한
6. 가져가기는 범위, 형식, 개수, 결과 확인 순서로 진행

자동 테스트는 통과했지만 이 방향이 실제 사용자에게 자연스러운지는 아직 검증되지 않았다.
이번 검토는 P35를 승인하기 위한 형식적 확인이 아니라, 잘못된 방향이면 구조를 다시 열기
위한 독립 평가다.

## 2. 이번 검토의 핵심 질문

1. 저장 전 `Flow 조정`에서 항목 제목, 상세 내용, 날짜까지 편집해야 하는가?
2. 저장 완료 뒤 곧바로 오늘 할 일로 보내는 것이 맞는가, 아니면 저장된 전체 결과를 먼저
   확인해야 하는가?
3. 다음 할 일을 한 행만 보여 주는 대신 같은 날짜의 항목을 묶어 보여 줘야 하는가?
4. public preview에서 자연스러운 결과 형태와 외부 가져가기를 함께 제공해야 하는가?
5. 완료 후 항목이 화면에서 사라질 때만 별도 되돌리기가 필요한가?
6. 모바일 workspace의 `다음 행동`은 독립 탭으로 충분히 명확한가?
7. `기록`에는 정확히 무엇이 들어가야 하며 독립 탭이 필요한가?

이 일곱 질문뿐 아니라 P35 전체의 정보 구조, 시각 위계, 반응형 구성, 접근성,
portable execution layer 방향도 함께 평가한다.

## 3. 판단 경계

### 유지해야 할 데이터 계약

- source와 published Flow
- personal overlay와 personal structural overlay
- execution run과 완료/다시 열기
- recurrence series와 occurrence
- whole/selected/current export identity
- 기존 localStorage key와 저장 데이터

UI 대안은 이 계약을 소비해야 하며 별도 임시 identity나 중복 저장 모델을 만들면 안 된다.

### 다시 검토할 UX 가설

- 3개 전역 탭이 충분한가
- public 결과 우선 구성이 실제로 결과를 이해시키는가
- 저장 전 조정의 적정 깊이
- 저장과 외부 가져가기의 위치와 우선순위
- 저장 receipt의 다음 경로
- 내 Flow의 `다음 행동 / 전체 계획 / 기록` 구조
- 날짜별 실행 묶음과 완료 후 되돌리기 규칙

### 검토 범위 밖

- 실제 AI API 또는 crawler
- account, DB, cloud sync
- Google Calendar, Todoist, Notion OAuth
- source 원본을 개인 수정으로 덮어쓰기
- 가짜 사용자 수, 평점, 리뷰를 사실처럼 노출

## 4. 읽기 순서

1. [오프라인 Preview](./offline-preview/index.html)
2. [통합 검토 보드](./review.html)
3. [검토 브리프](./review-brief-ko.md)
4. [평가 매트릭스](./evaluation-matrix.json)
5. [사용자 여정 시나리오](./review-scenarios.json)
6. [레퍼런스 비교 기준](./reference-patterns.md)
7. [응답 형식](./review-response-template-ko.md)
8. [Codex 검토 프롬프트](./codex-review-prompt-ko.txt)
9. [Claude Design 검토 프롬프트](./claude-design-review-prompt-ko.txt)
10. [Codex·Claude 공용 통합 프롬프트](./unified-review-prompt-ko.txt)
11. [현재 상태 캡처 manifest](./offline-preview/preview-manifest.json)
12. [P35 참고 캡처 manifest](./offline-preview/reference-manifest.json)
13. [기존 스크린샷 manifest](./screenshot-manifest.json)
14. [HTML 렌더링 확인](./review-render-check.json)
15. [기존 핵심 스크린샷](./screenshots/)

기존 P35 근거:

- [P35 설계 패키지](../../specs/2026-07-26-flowme-mece-ux-reset/design-package.md)
- [P35 최종 gate](../2026-07-26-p35-08-final-mece-gate/README.md)
- [P35 최종 route evidence](../2026-07-26-p35-08-final-mece-gate/route-evidence.json)
- [기존 사용자 피드백 종합본](../2026-07-26-flowme-user-feedback-product-direction-master-ko.txt)

## 5. Evidence 규칙

모든 주요 판단에 아래 종류를 붙인다.

- `current_preview_interaction`
- `current_source`
- `current_package_screenshot`
- `current_automated_test`
- `production_comparison`
- `reference_pattern`
- `heuristic_simulation`
- `inaccessible`
- `observed_user`

자동화, fixture, screenshot, agent simulation은 실제 사용자 관찰이 아니다.
`observed_user`는 실제 참여자가 수행한 세션에만 사용한다. 현재 값은 `0`이다.

## 6. 기대 결과

두 검토자는 각각 다음을 분명히 답해야 한다.

1. P35 전체 방향: `retain`, `revise`, `structural_reopen`
2. 사용자 피드백 F01~F07별: `supported`, `partly_supported`, `rejected`, `needs_observation`
3. 현재 화면에서 유지할 것과 제거할 것
4. 390px과 1024px의 proposed wireframe
5. 저장 전 조정, 저장/외부 가져가기, receipt, 실행, 기록의 최종 역할
6. 데이터 계약을 바꾸지 않고 가능한 구현 순서
7. 실제 사용자에게만 확인할 수 있는 질문

## 7. 현재 검증 및 배포 상태

- docs check: pass, 14 required files / 3,219 local links
- pretest: 74/74 pass
- unit: 590/590 pass
- P35 E2E: 30/30 pass
- full E2E: 356/356 pass
- build: pass
- P35 screenshots: 9
- 오프라인 current-state captures: 18
- 오프라인 P35 reference captures: 37
- horizontal overflow: 0
- fixed overlap: 0
- unnamed visible interactive: 0
- console/page error: 0
- commit: 없음
- push: 없음
- PR: 없음
- merge: 없음
- Preview: READY
- production deploy: 없음

이 수치는 P35 최종 gate 실행 결과이며 이번 독립 UX 검토의 결론을 미리 정하지 않는다.
