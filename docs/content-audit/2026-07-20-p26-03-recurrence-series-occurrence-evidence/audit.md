# P26-03 감사 기록

## 시작 상태

기준선에서 공개 `/f/washer-tub-clean-monthly`의 ICS는 canonical recurrence builder를 사용했다. 반면 My Flow 전체 export는 base row마다 `buildMyFlowStepIcs`를 호출하면서 recurrence series를 전달하지 않았고, Calendar 대상 수도 `0`이었다.

재현값:

- public UID: `saved-routine-j36h7x@flowme.local`
- public RRULE: `FREQ=MONTHLY;BYMONTHDAY=20`
- saved My Flow UID: `washer-tub-clean-monthly::flow-washer-tub-clean-monthly-item-0@flowme.local`
- saved My Flow RRULE: 없음

이 값은 이번 수정 전 current command로 직접 재현했다. prior P25/P26 문서의 결과를 현재 실행값으로 대체하지 않았다.

## 구현 판단

### 정의와 실행

- source/version: 반복 규칙과 source item을 보존한다.
- series definition: My Flow 전체의 `반복 설정`에서 확인·수정한다.
- occurrence: Today와 Calendar에서 완료·재개·건너뜀·보류한다.
- execution run: occurrence 상태를 저장하며 structure membership과 UID를 바꾸지 않는다.

Flow 전체의 반복 행은 더 이상 다음 occurrence 상세로 우회하지 않는다. occurrence 실행은 Calendar/Today에만 남긴다.

### Calendar와 날짜 없는 tray

`structuralRepeat`이 있거나 Flow 자체가 routine인 base row는 series definition이다. 이 정의는 날짜 없는 할 일이 아니므로 Calendar `날짜 정하기` tray에서 제외한다. projected occurrence만 grid/agenda에 나타난다.

### export

My Flow 전체 export는 `buildEffectiveRoutineProjection`의 carrier와 series를 사용한다. list export는 기존 구성 항목을 유지하지만 Calendar/ICS eligibility는 canonical carrier series에만 부여한다.

- series UID는 mutable 날짜·순서가 아닌 series ID에서 파생한다.
- 공개와 저장 후 Flow는 `bundle.flow.slug`를 canonical identity namespace로 사용한다.
- 같은 Flow의 public/My Flow UID와 RRULE은 일치한다.
- Flow export preview는 series count와 현재 visible-range occurrence count를 분리한다.

### 4주 exact-video 경계

`exact-video`와 `schedule-user-choice` metadata를 함께 가진 루틴은 현재 제품에서 4주 occurrence preview를 약속한다. Calendar만 4주이고 ICS는 무한 반복이 되지 않도록 같은 28일 horizon을 canonical projection에 적용했다. 특정 slug 분기는 추가하지 않았다.

## 시나리오 결과

| 시나리오 | route | viewport | 결과 | evidence kind |
| --- | --- | --- | --- | --- |
| 월간 preview -> 저장 | `/f/washer-tub-clean-monthly` | 390x844 | 7~10월 월간 preview, public RRULE 1개 | `current_browser` |
| Flow 전체 반복 설정 | `/my` | 390x844 | 구성 3개, series completion control 0 | `current_browser` |
| Flow 전체 export | `/my` | 390x844 | 반복 일정 1개, public UID/RRULE parity | `current_browser` |
| occurrence 완료/취소/reload | `/calendar` | 390x844 | stable occurrence ID 유지, reopened 유지 | `current_browser` |
| 월간 wide Calendar | `/calendar` | 1024x768 | marker 1개, agenda row 1개, overflow 0 | `current_browser` |
| 주간 4주 루틴 | public/My Flow/Calendar | 390/1024 | 12 occurrences, bounded RRULE, sibling state 독립 | `current_browser` |
| 개인 draft 반복 | `/flows` -> `/my` -> `/calendar` | 390/1024 | done/reopen/skip/hold 분리, series ICS 유지 | `current_browser` |

## 시각 참고 자료 반영 경계

로컬 prior artifact `docs/content-audit/2026-07-19-flow-content-usage-preview-ko.html`의 다음 패턴을 P26-06/07/10/16/17 입력 근거로 등록했다.

- source 선택 rail
- timing, title, 짧은 요약을 한 행에 둔 compact item
- Calendar/checklist/sheet/memo destination preview
- 날짜 없는 이유와 결과 개수를 destination 수준에서 설명하는 방식

긴 intro, 사용법 설명, 내부 검토 상태를 production UI로 복제하지 않는다. P26-03 correctness에는 시각 artifact를 정답으로 사용하지 않았다.

## 잔여 위험

1. 하나의 Flow에 서로 독립적인 여러 recurrence series가 있는 source fixture가 부족하다.
2. source-backed series의 future/all rule editing은 현재 local draft와 저장 종료일 경계를 더 넓게 검증할 필요가 있다.
3. automated browser 결과는 실제 사용자가 series/occurrence 용어를 이해한다는 증거가 아니다.

