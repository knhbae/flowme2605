# P24 Feedback Reconciliation Audit

## Overall Judgment

가장 큰 위험은 기능 부족 하나가 아니라 **같은 개인 실행 상태가 화면마다 다르게 계산되거나, 같은 행동이 여러 위치에 중복되거나, 범위가 드러나지 않는 것**이다. UI 설명을 줄이려면 카피를 지우는 것만으로는 부족하다. effective Item/date/occurrence를 먼저 하나로 만들고 상태를 checkbox, badge, tray, selection count, preview로 보여줘야 한다.

## User Feedback Mapping

| # | User feedback | Product interpretation | Planned response |
| --- | --- | --- | --- |
| 1 | 사전 등록되지 않은 URL을 테스트하지 못함 | arbitrary URL production conversion은 아직 No-Go이고 miss/draft만 존재 | miss 경로를 정직하게 유지하고 production URL backend는 별도 gate로 보류 |
| 2 | 설명 글이 너무 많음 | state와 hierarchy를 카피로 보상하는 중 | correctness 뒤 progressive disclosure, badge, inline feedback로 치환 |
| 3 | 메모 수정이 Calendar/checklist보다 복잡함 | 모든 Item에 범용 field를 일괄 노출 | 기본 field 축소, intent-aware advanced fields |
| 4 | 완료 취소가 어렵고 Today/All이 의문 | 완료 후 row가 사라지고 관리 view까지 이동 필요 | Today/All 역할 유지, inline undo와 완료 section 제공 |
| 5 | 전체/선택 날짜 이동이 필요 | anchor, fixed override, selection, recurrence scope가 섞임 | pure date-move contract 후 preview 기반 UI |
| 6 | 날짜 없는 할 일은 추가되지만 Calendar에서 찾기 어려움 | unscheduled가 My Flow에만 존재하고 Calendar에서는 비가시 | Calendar 안 `날짜 없음` tray와 schedule entry |
| 7 | 항목 1개 export는 의미가 약하고 범위가 불명확 | scope와 format이 섞이고 label이 Flow 전체처럼 보임 | 전체/선택/현재 scope를 먼저 고르고 destination 선택 |
| 8 | 회고를 끝에서만 하지 않고 싶음 | 실행 중 insight와 최종 reflection이 분리됨 | optional inline note를 모아 최종 회고에 재사용 |

## Evidence Reconciliation

### Confirmed on clean tracked baseline

- KST 오전에 default date가 전날이 되는 UTC/local date 오류
- 반복 Flow에서 같은 실행 항목의 Today 표현 중복
- 제목과 결과가 빈 miss draft 생성
- Vercel preview 익명 접근 시 SSO redirect
- dependency audit high 4 / moderate 3
- 완료 취소, 기준일 수정, 항목 날짜 수정의 깊은 경로

### Confirmed only in dirty dev environment so far

- Next 15.5.20 환경 build 실패와 장시간 dev 500
- 반복 preview 12회 대비 My Flow/Calendar/ICS 1회
- memo split 3개 중 `todo` 2개 UI/export 은닉
- Today summary가 date override를 무시
- reuse의 `keep_fixed_dates` 선택이 실제 새 run에 반영되지 않음
- `/flows` hard navigation 무한 fallback
- 저장 직후 `/my` 간헐적 빈 상태

이 finding들은 영향이 커서 우선 재현하지만, clean build에서 재현하기 전 production-confirmed로 부르지 않는다.

### Design proposal, not yet validated

- 편집 form progressive disclosure
- 완료 row 유지와 3~5초 undo
- Calendar `날짜 없음` tray
- Flow header의 export scope sheet
- linked/fixed date badge와 move preview
- Today action row 하나와 control 없는 next preview
- item inline note와 final reflection aggregation

## Cross-source Agreements

네 source가 모두 동의하는 항목은 우선순위가 높다.

1. **정확성 우선:** 날짜와 반복 projection이 틀리면 UI 개선의 신뢰 기반이 없다.
2. **완료는 되돌릴 수 있어야 함:** 완료가 즉시 사라지지 않거나 짧은 undo가 필요하다.
3. **한 행동 한 표현:** Today/next/detail의 completion control 중복을 없앤다.
4. **편집 필드 축소:** 모든 Item에 모든 field를 보여주지 않는다.
5. **범위 명시:** 날짜 이동과 export는 적용 대상을 먼저 보여준다.
6. **unscheduled discoverability:** 날짜 없음은 Calendar에서도 찾을 수 있어야 한다.

## Today and All Decision

현재 결론은 탭 제거가 아니다.

- Todoist와 Apple Reminders도 Today와 All/Scheduled/Completed를 다른 목적의 view로 둔다.
- 문제는 view 수보다 완료 취소를 위해 view를 바꾸고 Flow를 펼치고 detail을 여는 현재 경로다.
- FlowMe는 Today에서 just-completed row를 잠시 유지하고, Flow 안 완료 section에서도 다시 열 수 있게 한다.
- All은 Flow 전체 구조, 과거 완료, 기준일과 대량 관리에 집중한다.
- 실제 사용자 15 session에서 탭 이름/역할 혼란이 계속되면 P24-00C에서 재검토한다.

## Date Movement Is A Contract Problem

날짜 변경 UI를 바로 추가하면 안 된다. 최소 다섯 scope가 있다.

1. 한 Item을 fixed date로 지정
2. 선택한 여러 Item을 이동
3. Flow anchor를 이동해 linked Item 재계산
4. 반복의 이번 occurrence만 이동
5. 이번부터 또는 전체 series 변경

각 scope는 completed/skipped history, fixed override, timezone, Calendar/ICS UID, undo에 다른 영향을 준다. 먼저 pure transition과 fixture를 만든 후 UI를 연결한다.

## Export Is A Scope Problem

현재 항목 detail의 `캘린더 파일 받기`는 Flow title 아래 있어 전체처럼 보이지만 한 항목만 내보낸다. 해결은 버튼 label 하나를 바꾸는 것이 아니다.

```text
scope: whole Flow | selected Items | current Item
then
format: calendar | checklist | sheet | memo
```

기본 scope는 whole Flow다. 선택 mode는 날짜 이동과 공유한다. 각 format은 Item 수와 제외 정책을 미리 보여준다.

## Incremental Feedback Boundary

실행 중 note는 세 종류를 섞지 않는다.

- personal note: 나중의 나를 위한 비공개 기록
- Flow improvement note: source/creator에게 보낼 수정 제안 초안
- final reflection: 완료 후 개인 notes를 모은 회고

입력은 선택 사항이며 explicit submit 전에는 외부로 전송하지 않는다.

## Unknown URL Boundary

사전 등록되지 않은 URL을 지금 실제 변환처럼 테스트할 수 없는 것은 맞다. 현재 P24에서는 다음만 검증한다.

- unknown URL이 hit처럼 보이지 않는다.
- miss에서도 입력이 유실되지 않는다.
- 사용자가 직접 초안을 만들거나 준비 요청을 이해한다.
- live AI를 암시하지 않는다.

production fetch/extraction/LLM은 SSRF, rights, retention, provider, cost, failure recovery가 닫힌 별도 backend program이다.

## Open Questions For Human Observation

1. 완료 직후 inline undo만으로 충분한가, 완료 section도 자주 쓰는가?
2. Today/All 역할을 label 없이 이해하는가?
3. linked/fixed badge를 보고 anchor 이동 결과를 예상할 수 있는가?
4. Calendar `날짜 없음` tray를 실제로 찾고 일정에 배치하는가?
5. export에서 기본 전체 Flow가 기대와 맞는가?
6. item inline note가 유용한가, row가 다시 복잡해지는가?
7. source-backed 구조 편집 제한을 버그로 느끼는가?
