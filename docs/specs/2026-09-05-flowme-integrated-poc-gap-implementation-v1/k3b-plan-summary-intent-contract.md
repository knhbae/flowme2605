# B3-A2 — 기존 개인 text intent 보존

2026-09-06. B3-A의 요약 수정 뒤 확인한 React planner 차이를 좁게 보완한다. main이 구현을 승인한 범위이며, 새 제품 정책·저장 schema·source writer를 추가하지 않는다.

## 근거와 선행 결과

[요약·영수증 설계](./k3b-plan-summary-receipt-design.md)의 “저장된 개인 A가 이후 source와 같아져도 무수정 intent 유지, 명시 inherit만 제거”를 적용한다. [독립 RED](../../../lib/flow/personal-workspace-poc-plan-persisted-title-intent.red.test.ts)는 원문 A에서 개인 B overlay를 실제 preflight로 만들고 원문도 B가 된 뒤 새 guard로 연다. 무수정과 다른 memo 변경에서 Flow/Item title이 제거되어 2 RED, 명시 inherit는 1 PASS였다. 저장 API는 0이며 실제 browser 검증은 아니다.

앞선 A1은 최종 96 검사 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-summary-react-final96-20260906-01.log`) PASS였다. 기존 82 + 원래 RED 8 + 추가 보강 6이다. 이 결과가 위 planner 2 RED를 해결했다는 뜻은 아니다. A1 summary는 당시 실제 제거를 숨기지 않았다.

## 최소 변경 계약

1. `normalizePersonalWorkspacePocPlanOverlay`가 `validateGuardIntegrity`를 유지한다. 실제 `openedStateRaw`가 있으면 이를 파싱하고, live preflight는 이미 whole-validated인 `currentState`를 additive optional `capturedState`로 전달한다. 기존 state validator, `openedStateCanonicalBytes`와의 canonical exact 비교, opened revision, `openedStateRaw` 일치, 현재 전달 source의 canonical 일치를 확인한다. 손상·대상 혼합은 실패한다. public summary 입력으로 이 guard를 만들지 않는다.
2. 그 열린 state의 해당 Flow `personalPlanOverlays`만 기준으로 사용한다. Flow title, exact Item ref의 title/memo, 실제 편집 가능한 section id의 title을 각각 읽는다. 다른 필드의 값이 같다는 이유로 소유권을 옮기지 않는다.
3. 작은 공통 pure text-intent helper가 다음 순서를 공유한다. `inherit → absent`; `override 값 === 실제 열린 같은 필드의 override → 그대로 보존`; 그 밖에는 현행 `override 값 === source 또는 기존 개인 memo baseline → absent`; 나머지는 override다. 부재와 `''`, CRLF/공백은 exact 구분한다.
4. planner는 검증된 열린 overlay 값을, summary는 자신에게 전달된 captured baseline intent 값을 helper에 준다. helper/summary는 표시·값 계산일 뿐 저장 권한이나 freshness 증명이 아니다. 저장은 기존 전체 guard·current state/raw/source·identity preflight와 저장 handler만 실행한다.
5. schedule의 inherit/fixed/unscheduled, 같은 날짜 fixed pin, 원본 membership/Plan 순서와 section capability는 그대로 둔다. source 업데이트 정책, 날짜 anchor, 반복, 실행 완료·배치, 운영 schema를 바꾸지 않는다.

canonical bytes는 원본 DTO가 아닌 비교 키다. 처음 구현에서 이를 재파싱해 authored validator에 주자 정렬된 property 순서 때문에 정상 authored 회귀 6개가 실패했다. 원본 validator를 완화하지 않고 위의 실제 raw/검증된 state 경로로 수정했다. 기존 직접 normalizer 호출은 열린 raw로 동작한다. 원래 raw가 없는 authored state의 직접 pure normalizer 호출은 lossless `capturedState`를 함께 제공해야 한다. 실제 preflight/handler 진입은 이를 항상 전달하며 신규 보강 검사에 포함했다. 이 additive 값은 guard를 우회하는 authority가 아니다.

## 예상 의미

| 열린 개인 override | draft | 현재 baseline | 결과 |
| --- | --- | --- | --- |
| 없음 | 새 override B | source B | 없음: 기존 동값 no-op |
| B | 무수정 override B | source B로 바뀜 | B 보존 |
| B | 무수정 override B + 다른 memo 변경 | source B로 바뀜 | B 보존, memo만 변경 |
| B | 명시 inherit | source B | B 제거 |
| B | 새 override C | source C | B 제거 후 baseline C 사용: 새 입력의 기존 동값 규칙 |
| memo `''` | 무수정 override `''` | imported memo도 `''` | 빈 override 존재 보존 |
| memo 없음 | 새 override `''` | imported memo 없음 | 새 빈 개인 memo 존재 |
| memo 없음 | 새 override `''` | imported memo `''` | 동값 no-op |

## 검증과 동결 경계

- 기존 RED3의 보존/제거 기대를 유지해 GREEN으로 바꾼다. A1 원래8 + 보강6, 기존 summary·planner·memo-owner·receipt 검사를 다시 실행한다.
- 보강은 실제 preflight/handler, 재로드, 기존 Undo, source/memo/section exact 값, 다른 필드 변경, 새 동값 입력, guard/raw/source tamper를 포함한다. 정상 저장의 target/support 호출 수와 no-op 0쓰기를 구분한다.
- A1 summary snapshot은 `ED7F4F7C343EBDF317C7397F433604B87901A15024ED9AFB6900518D7F3C2EB1`, planner는 `64FFBC4D91469586B7ECFA4253C3AE5A29F64BA6454728E446FA5463841317C5`다. 정확 backup은 `output/poc-gap-implementation/k3b/before-plan-summary-intent-20260906-01/`에 있다. source 관련 파일은 경계 비교용으로만 복사했다.
- app/Surface/P/C/E2/생성 HTML/운영 writer는 이 하위 작업에서 수정하지 않는다. 브라우저·전체 npm·build는 root가 통합 코드 기준으로 실행한다.
