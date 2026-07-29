# Flow Content UI Full-Corpus Lab v1 — 5분 결정 요약

- 상태: `DRAFT_PENDING_USER_REVIEW`
- 브라우저 QA: `PASS`
- 실제 사용자 검토: `NOT_REVIEWED_BY_USER` / observed-user validation `NOT_RUN`
- 외부 Calendar/VTODO 왕복: `NOT_RUN`
- production app/runtime/DB/API 변경: 없음

## 지금 무엇이 만들어졌나

- Gallery 전체 156개
- 정상·구조 검토 110개
  - 기존·계승 corpus 91개
  - 이번에 직접 확인해 별도 user job으로 추가한 정상 콘텐츠 19개
- 신규 실제 URL 직접 확인 24개
- 신규 원문 중 정상 자격 22개
  - 그중 기존 user job 재확인·중복 병합 3개
- canonical Item 893개
- SourceRow 1172개
- Calendar·Checklist·Todo·Sheet·Memo 비교 550칸

Boundary 1개와 Historical 45개는 정상 수치에 포함하지 않는다.

## 원문 의미 보존 수동 판정

- trace-only queue 141개를 26개 콘텐츠에서 전수 판정했다.
- `verified_equivalent` 37개
- `bounded_normalization` 87개
- `needs_modify` 17개
- `unknown` 0개
- 수정 대상은 11개 콘텐츠의 17개 필드다.
- 반복 유형: `critical_source_row_hidden` 3개, `mixed_action_label_misleading` 2개, `unsupported_action_or_scope` 2개, `unsupported_future_timeframe` 2개, `projection_rationale_replaces_detail` 2개, `source_route_narrowed` 2개, `unsupported_user_overlay_in_source_item` 1개, `unsupported_packaging_constraint` 1개, `conditional_branch_hidden` 1개, `safety_instruction_hidden` 1개

- `canonical:base-moving-d30`: 5개 필드
- `canonical:base-opic-plan`: 2개 필드
- `canonical:base-new-car-comparison`: 1개 필드
- `canonical:oq-oq-c08-ac-decision`: 1개 필드
- `canonical:oq-oq-b03-remodel`: 2개 필드
- `canonical:oq-oq-p03-vehicle`: 1개 필드
- `legacy:preapp:interview-d1-check`: 1개 필드
- `legacy:preapp:license-class1-medical-check`: 1개 필드
- `legacy:preapp:license-class2-renewal`: 1개 필드
- `legacy:round2:personal-business-registration-flow`: 1개 필드
- `generalization:GB-03`: 1개 필드

이 판정은 141개 queue를 닫았다는 뜻이지 전체 corpus의 발명 0을 증명한 것이 아니다.
completion 412개와 schedule 124개의 owner·derivation 공백은 그대로 남아 있으며, zero-invention 상태는 `NOT_PROVEN`이다.

## 현재 유지하는 데이터 문법

`SourceRow → Item → Step → Flow → Bundle / Flow Map → Projection`

- Item은 독립적으로 완료·결정·기록 상태를 가질 가치가 있는 최소 단위다.
- Calendar·Checklist·Todo·Sheet·Memo는 같은 Item을 목적지에 맞게 보여주는 projection이다.
- 이 구조는 이번 UI 검토의 baseline이지, 사용자가 최종 승인한 제품 계약은 아니다.

## 다섯 projection을 한 줄로 구분하면

- Checklist: 끝이 정해진 한 상황의 누락 방지 묶음
- Todo: 독립적으로 재정렬·연기할 수 있는 다음 행동 queue
- Calendar: 실제 실행 시간·참석·원문 날짜 또는 사용자가 확인한 개인 일정
- Sheet: ID·상태·필드를 안정적인 행과 열로 보존
- Memo: 사람이 읽고 복사하는 문서; canonical raw JSON은 아님

모든 콘텐츠를 다섯 포맷으로 기술적으로 시도할 수는 있지만, 생성 가능성과 자연스러움은 다르다. 각 칸은 추천도·현재 가능 여부·손실·fallback을 따로 가진다.

## 날짜 없는 콘텐츠와 행사는

- 날짜 없는 콘텐츠는 우선 Checklist·Todo·Sheet로 시작한다.
- 하루 N개·주 N개 배치는 원문 사실이 아니라 UserFlowCopy의 `user_overlay`다.
- preview 뒤 사용자가 확인한 미래 미완료 Item에만 적용한다.
- 공연·축제·시험은 Series → Edition → Occurrence/Window/Milestone을 먼저 보존하고, 사용자의 저장·예약·참석 의도 뒤 Item과 VEVENT/VTODO 후보를 만든다.
- 매년 날짜가 다시 발표되는 행사는 거짓 yearly RRULE을 만들지 않는다.

## 내부 검토가 말해주는 것과 말해주지 않는 것

두 내부 agent의 6축 적합성 verdict와 Primary·Checklist/Todo 선택까지 모두 같은 결과는 6/110이다.
Primary projection 선택 일치율은 86%, Checklist/Todo 일치율은 52%다.

이는 규칙이 어디서 흔들리는지 찾는 내부 증거다. 실제 사용자가 저장·실행·재방문할지는 아직 검증하지 않았다.

A2/B2가 직접 본 Gallery SHA는 `9be4105dcf5a…`이다.
현재 Gallery SHA는 `021667d19d04…`이다. 합성 뒤 source 값 재입력 제거,
partial-source tier 조정, 행사 date-window 보강이 추가되었으므로
byte-identical 독립 검토라고 표현하지 않는다. 대신 최종 화면에서 상세
156개, projection 550개, pacing 53개, 행사 14개, 검토 156개, lineage
156개를 다시 열었고 실패 0으로 확인했다.

## 기획에서 확인할 순서

1. Item 최소 단위와 Step grouping
2. Checklist/Todo tie-breaker
3. primary와 secondary projection 노출
4. 날짜 없는 콘텐츠의 pacing 기본값
5. due와 Calendar time의 분리
6. Calendar per-item/session bundle 기본값
7. Event Series·Edition·Occurrence와 사용자 intent
8. source/user/system provenance 표시
9. backend DTO 필수 필드

현재 16개 결정 후보는 모두 `DRAFT_PENDING_USER_REVIEW`다.

## 바로 열어볼 파일

- 전체 Gallery: `docs/content-audit/2026-07-29-flow-content-ui-full-corpus-gallery-v1-ko.html`
- 요약·기획 보고서: `docs/content-audit/2026-07-29-flow-content-ui-full-corpus-validation-review-v1-ko.html`
- 결정 원본: `planning-decision-handoff-v1.json`
- 반복 문제: `content-and-logic-gap-register-v1.json`
