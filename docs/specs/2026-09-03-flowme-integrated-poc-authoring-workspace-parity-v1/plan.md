# FlowMe 통합 PoC 작성→개인공간 일치 v1 Plan

- 현재 상태: `AUTHORING_TO_WORKSPACE_P0_CLOSED_PRODUCT_UX_PASS_SUPERSEDES`
- 2026-09-03 자동 검증 근거: React focused/full PoC model·component `23/23`,
  `256/256`; React Stage 2 Chromium `11/11`; standalone node `39/39`;
  최종 product browser `37/37`; production build `18/18`
- 최종 마감: docs check `4,588/4,588`, diff check `PASS`

## 2026-09-03 정합화

이 계획은 작성→개인공간 parity P0를 닫은 기록이다. 최종 HTML의 “통합 PoC 통과”는
세 결과물 전체 통합 완료가 아니라 이 제한된 자동 시나리오 통과로 해석한다. 네 origin의
공통 Plan→Item UI와 제품형 UX는
[후속 제품형 UX 패스](../2026-09-03-flowme-integrated-poc-product-ux-pass-v1/plan.md)에서 이어 간다.

## 단계 0 — 기준선과 소유권

- 세션 시작, 최신 main, 격리 worktree, dirty 원본 저장소의 읽기 전용 경계를 확인한다.
- v4.1, 개발 1, 개발 2, A0 통합 결정을 requirement ID와 연결한다.
- 시간 의존 콘텐츠 신선도 실패를 별도 기준선으로 재현한다.

Exit: 이번 변경 파일과 미소유 파일, 구현할 gap과 검증 한계가 분리된다.

## 단계 1 — UX·데이터 계약

- 한 editor, compact 2-state, 선택형 review, example/ghost 계약을 문서화한다.
- React와 standalone의 scaffold, identity, transaction, receipt 차이를 제거할 방법을
  테스트 가능한 문장으로 고정한다.
- source/personal/execution owner와 no-write 조건을 고정한다.

Exit: 정책을 새로 만들지 않고 기존 결정만으로 구현 범위를 설명할 수 있다.

## 단계 2 — 실패·회귀 테스트

- 여섯 template의 scaffold/example byte parity를 추가한다.
- 전체 blank ghost와 toggle 무영향을 순수 모델·component·browser에서 확인한다.
- standalone의 stable retry, late failure rollback, draft cleanup recovery를 추가한다.
- compact geometry에서 editor/CTA overlap, authoring state 전환, 예시 접근을 측정한다.

Exit: 현재 결함이 테스트에서 먼저 실패하고 의도한 계약이 수치로 표현된다.

## 단계 3 — React 정본 보완

- picker에 example label을 표시한다.
- Flow 표현에서 인식된 모든 빈칸 ghost를 보여 주되 active caret은 그대로 둔다.
- `순수 텍스트` / `Flow 편집` / `입력 예시`와 결과 전환 카피를 기존 결정에 맞춘다.
- compact editor와 sticky CTA의 공간을 분리하고 틀 삽입 뒤 scroll/focus를 안정화한다.

Exit: source/history/storage를 바꾸지 않고 사용자가 틀의 채우는 방법을 즉시 볼 수 있다.

## 단계 4 — 독립 HTML parity

- canonical template catalog를 React bytes와 맞춘다.
- 강제 3단계와 일반 source 확인 checkbox를 제거하고 compact 2-state를 적용한다.
- 전체 빈칸 예시 toggle과 선택형 review를 source 밖 presentation으로 연결한다.
- source fingerprint identity, state+draft recovery transaction, idempotent retry를 적용한다.
- 단일 HTML 두 파일을 source assets에서 다시 생성한다.

Exit: 독립 HTML은 fixture-only 차이를 제외하면 React와 같은 핵심 여정을 제공한다.

## 단계 5 — 기능·브라우저 검증

- 순수 모델, component, standalone node, React/standalone browser 시나리오를 실행한다.
- 작성→저장→상세→개인 편집→기간 보기→reload를 양쪽에서 검증한다.
- no-op/cancel/IME/stale/error의 mutation 0, 허용 prefix 밖 write 0, 운영 bytes 동일을
  검증한다.
- 여섯 viewport와 200% 등가 reflow를 캡처하고 accepted 화면과 비교한다.

Exit: 실행 수, 실패와 재시도, 화면별 수치와 한계가 남는다.

## 단계 6 — 추적표·리포트·closeout

- 요구 추적 JSON에서 실제로 닫힌 항목만 재판정한다.
- 조작형 HTML의 사용 안내와 통합 검증 보고서를 갱신한다.
- 전체 `npm test`, production build, docs check, diff check, work-closeout을 실행한다.
- 실제 기기, 관찰 사용자, commit/push/PR/Preview/Production 상태를 별도로 보고한다.

Exit: 요구→구현→테스트→화면 증거가 한 링크 체인으로 이어진다.

## 단계별 현재 판정

| 단계 | 상태 | 근거·남은 일 |
| --- | --- | --- |
| 0 기준선 | 완료 | 최신 main·격리 worktree·기존 freshness 실패를 분리했다. |
| 1 UX·데이터 계약 | 완료 | 한 editor·2-state·선택형 review·source 밖 example/ghost·PoC 저장 경계를 고정했다. |
| 2 실패·회귀 테스트 | 완료 | React 신규 계약 테스트와 standalone catalog·identity·rollback 테스트가 통과했다. |
| 3 React 정본 보완 | 완료 | picker 예시, 전체 blank ghost, compact CTA geometry를 반영했다. |
| 4 독립 HTML parity | 완료 | 여섯 template/example, 2-state, 선택형 review, 전체 blank ghost/toggle, browser-native Undo, stable identity, state+draft rollback을 반영하고 단일 파일 둘을 재생성했다. |
| 5 기능·브라우저 검증 | 완료 | 최종 product browser 37/37과 build 18/18이 통과했다. 전체 npm은 1520/1521에서 기존 freshness 1건으로 실패·중단된 상태를 그대로 기록했다. |
| 6 추적표·리포트·closeout | 완료 | 추적 JSON과 HTML·trace browser 2/2, docs 4,588/4,588, diff check를 마감했다. 의미 정합화와 다음 구현 범위는 후속 제품형 UX 패스로 넘겼다. |
