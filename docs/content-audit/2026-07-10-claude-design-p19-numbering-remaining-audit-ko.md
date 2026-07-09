# Claude Design P19 번호 정합성 및 잔여 항목 감사

작성일: 2026-07-10

## 목적

Claude Design 원문 P19 백로그와 현재 구현/evidence 패키지의 번호가 일부 어긋났다. 특히 사용자가 최근 `P19-04`로 지시한 public `/f` 저장 전 체크박스 정책은 Claude 원문 기준으로는 `P19-05` 성격이다. 이 문서는 P19 원문 번호와 현재 완료 상태를 다시 맞추고, 원문 `P19-04`인 Calendar wide 헤더/라벨 중복 회귀를 별도로 닫기 위한 감사 기록이다.

## 원문 P19 대조

| Claude 원문 번호 | 원문 성격 | 현재 상태 | 근거 |
| --- | --- | --- | --- |
| P19-01 | Calendar 모바일 라벨/같은 날짜 Flow 식별 가독성 | 완료 | `docs/content-audit/2026-07-09-claude-design-p19-01-calendar-mobile-density-evidence/` |
| P19-02 | My Flow/Calendar/public 완료 컨트롤 통일 | 완료 | `docs/content-audit/2026-07-09-claude-design-p19-02-completion-control-evidence/` |
| P19-03 | My Flow/Calendar 진행 숫자 의미 맥락화 | 완료 | `docs/content-audit/2026-07-09-claude-design-p19-03-progress-metric-evidence/` |
| P19-04 | Calendar wide 헤더/라벨 중복 제거 | 이번 감사에서 별도 처리 | 1024px `/calendar` 캡처에서 상단 `날짜별 실행 / 캘린더`와 workspace 헤더가 중복 노출됨 |
| P19-05 | public `/f` 저장 전 항목 체크 preview 톤 분리 | 완료 | `docs/content-audit/2026-07-09-claude-design-p19-04-public-presave-checkbox-evidence/`가 실제로는 원문 P19-05를 닫음 |
| P19-06 | 홈 URL entry 발견성 | 잔여 | 아직 구현 목표 미진행 |
| P19-07 | My Flow 저장 후 편집入口 발견성 | 잔여 | P18-05/P18-07 overlay는 있으나 발견성 개선 목표 미진행 |
| P19-08 | URL-first/Studio AI draft spec/gate | 잔여 | 실제 AI 구현이 아니라 spec/gate 목표로 남음 |

## Calendar Wide P19-04 판단

최신 P19 public pre-save evidence의 `44-calendar-same-date-multi-flow-wide.png`는 다음 기준선은 이미 유지한다.

- 1024px `/calendar` horizontal overflow 0
- same-date distinct Flow group 2
- same-date grid Flow labels 2
- agenda grouped by Flow true
- Calendar title contains My Flow count 0
- Calendar primary generic type label count 0
- progressMetricAmbiguousCount 0
- rowLevelFlowProgressChipCount 0
- taskCompleteButtonCount 0
- taskCompleteMixedControlCount 0

다만 픽셀 기준으로는 `날짜별 실행 / 캘린더`가 상단 route header와 calendar workspace header에 한 번씩 반복되어 원문 P19-04 회귀가 실제로 남아 있었다. 원인은 `/calendar` surface에서도 My Flow 내부 workspace header가 wide breakpoint에서 표시되는 구조였다.

## 처리 기준

이번 수정은 새 UI나 새 기능이 아니다. `/calendar` surface에서는 최상단 route header 하나만 남기고, My Flow 내부 Calendar 탭에서만 workspace header를 유지한다. 범위 필터, Flow marker/group, selected-day agenda, 완료 체크박스, 진행 숫자 맥락화, public `/f` preview 정책은 유지한다.

추가 evidence marker:

- `calendarHeadingDuplicateCount`: `/calendar`에서 같은 visible heading이 중복 노출되는지 기록한다.
- 목표값: `0`
- review HTML summary에도 `calendar duplicate headings`로 노출한다.

재생성 evidence:

- package: `docs/content-audit/2026-07-09-claude-design-p19-04-public-presave-checkbox-evidence/`
- screenshot: `screenshots/44-calendar-same-date-multi-flow-wide.png`
- `calendarHeadingDuplicateCount: 0`
- `calendarPrimaryGenericTypeLabelCount: 0`
- `calendarTitleContainsMyFlowCount: 0`
- `calendarSameDateDistinctFlowGroupCount: 2`
- `calendarAgendaGroupByFlow: true`
- `progressMetricAmbiguousCount: 0`
- `rowLevelFlowProgressChipCount: 0`
- `taskCompleteButtonCount: 0`
- `taskCompleteMixedControlCount: 0`
- `publicPreSaveCheckboxCompletionLikeLabelCount: 0`

## 완료/잔여 상태

완료로 취급할 P19 범위:

- P19-01 Calendar 모바일 밀도/라벨 정리
- P19-02 할 일 완료 체크박스 통일
- P19-03 진행 숫자 맥락화
- P19-04 Calendar wide 헤더 중복 제거
- P19-05 public `/f` 저장 전 체크 preview 정책

잔여:

- P19-06 홈 URL entry
- P19-07 My Flow 편집入口 발견성
- P19-08 AI draft spec/gate

## 권장 실행 순서

1. P19-07 My Flow 편집入口 발견성
   - 이유: 사용자가 이미 “한 번 세팅하면 어떻게 다시 수정하지?”를 실제 테스트 피드백으로 남겼고, P18-05/P18-07 overlay/기준일 모델이 이미 구현되어 있다. 기능을 새로 키우기보다 기존 수정入口를 찾게 만드는 것이 다음 마찰을 가장 빨리 줄인다.

2. P19-06 홈 URL entry
   - 이유: 신규 사용자가 `/`에서 URL/메모를 어디에 넣는지 바로 파악하도록 하는 진입 개선이다. 실행 화면 손잡이 정리가 끝난 뒤 acquisition entry를 정리하는 순서가 안전하다.

3. P19-08 AI draft spec/gate
   - 이유: AI draft는 P18 overlay와 P19 편집入口 발견성이 닫힌 뒤에야 “초안 제안 -> 사용자가 손보기 -> My Flow/Calendar/export 반영” 흐름으로 설계할 수 있다. 이번 단계에서는 구현이 아니라 spec/gate로 남긴다.

## 유지해야 할 기준선

- 4탭 IA 유지
- public `/f` 공유 shell 유지
- 저장/실행/export 스키마 유지
- source-backed 원본과 personal overlay 경계 유지
- Calendar는 날짜 우선 실행 화면, My Flow는 할 일 우선 실행 허브
- 할 일 완료는 row-left 체크박스 1종
- public `/f` 저장 전 체크는 preview/선택 상태
- 사용자 화면에 `P0`, `대기열`, `파이프라인`, `Canonical URL`, `handoff`, `source-backed`, `Step`, `Item`, `Markdown` 재노출 금지
