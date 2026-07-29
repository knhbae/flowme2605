# P30 Independent Review Checklist

## 공통 실행 순서

1. production과 current main SHA를 확인한다.
2. P30 `review.html`에서 어떤 문제를 고쳤는지 파악한다.
3. prior artifact보다 current production을 먼저 조작한다.
4. 각 여정을 390x844, 1024x768에서 확인하고 핵심 workspace는 1440x900도 확인한다.
5. finding마다 `route / viewport / 재현 / 기대 / 실제 / 사용자 영향 / evidenceKind`를 기록한다.
6. 자동화·heuristic simulation과 observed-user evidence를 분리한다.
7. 마지막에 `keep / revise / defer`를 판정한다.
8. [persona-journey-simulation-ko.md](./persona-journey-simulation-ko.md)의 8개 페르소나를 3세션씩 검토한다.
9. surface pass와 end-to-end journey pass를 별도로 판정한다.

## 시나리오 A - 처음 발견하고 저장

- `/` -> `/flows` -> `/f/moving-d30-basic`
- 첫 viewport에서 source, 실제 Calendar 결과, 항목 수, primary action이 읽히는가?
- 긴 설명이나 outline이 artifact를 다시 반복하지 않는가?
- `조정` 전 row-level edit control은 0개인가?
- 내용/날짜/항목 선택/순서 중 한 목적만 펼쳐지는가?
- 저장 후 save-before controls가 사라지고 별도 receipt가 나타나는가?

## 시나리오 B - public export

- `/f/moving-d30-basic`, `/f/vehicle-inspection-prep`
- 전체 Flow export의 scope, format, 예상 count가 실행 전에 보이는가?
- mobile export primary가 bottom tabs 또는 fixed save layer와 겹치지 않는가?
- 저장 전 preview 선택과 저장 후 completion이 다른 의미로 읽히는가?

## 시나리오 C - My Flow 반복 사용

- `/my?demo=ux20&view=flows`
- 20개 이상 Flow에서 검색 -> 열기 -> 다음 행동 -> 완료 -> 다시 열기 -> 가져가기가 자연스러운가?
- mobile row에는 visible command가 과도하지 않은가?
- detail에서 primary 1개, secondary 1개가 먼저 읽히는가?
- source/archive overflow를 닫은 뒤 focus가 trigger로 돌아오는가?
- export panel이 workspace나 persistent tabs에 가리지 않는가?

## 시나리오 D - Calendar-heavy

- `/calendar`, `/calendar?demo=ux20`, `/calendar?demo=ux50`
- 62개 scope option에서 검색하고 2개를 선택해 적용하는 흐름이 이해 가능한가?
- 같은 날짜 5개 Flow가 grid에서는 compact하고 selected day에서는 전체 identity로 보이는가?
- 날짜 없는 할 일 2개를 배치하고 undo했을 때 `10 -> 8 -> 10`과 stable identity가 유지되는가?
- sheet/dialog가 page scroll을 흔들지 않고 focus를 반환하는가?

## 시나리오 E - 반복 Flow

- `/f/curated-allblanc-morning-workout`
- 초기에는 compact summary와 다음 3회만 보이는가?
- advanced mode에서 현재 mode에 필요한 field만 보이는가?
- series 설정과 이번 회차 실행이 다른 레벨로 읽히는가?
- 운동 전용 기능처럼 보이는 비일관적 control이나 설명이 남아 있는가?

## 시나리오 F - legacy 경계

- `/flow-maps/moving-d30`
- 현재 active consumer가 실제 사용자 가치가 있는가?
- artifact-first `/f`와 다른 composition이 혼란을 만드는가?
- 즉시 제거, bounded migration, 명시적 defer 중 무엇이 근거에 맞는가?

## 접근성·반응형 공통 확인

- DOM focus order: header -> workspace -> persistent tabs
- unnamed focusable: 0
- horizontal overflow: 0
- fixed-layer primary intersection: 0
- icon button accessible name/tooltip
- Escape close와 focus return
- keyboard-only open, adjust, save, complete/reopen, export
- 390 safe area와 1024/1440 pane 폭

## 결과 형식

### Overall verdict

다음 중 하나만 선택한다.

- `keep_p30`: current production에서 P31을 정당화할 concrete gap이 없음
- `bounded_revision`: 1~3개의 제한된 P31 slice가 필요함
- `structural_reopen`: 핵심 사용자 여정이 현재 frame으로 해결되지 않음. 매우 강한 current evidence가 있을 때만 선택

### Findings

severity 순으로 작성한다.

| Severity | Route / viewport | 재현 | 기대 | 실제 | 사용자 영향 | evidenceKind |
| --- | --- | --- | --- | --- | --- | --- |

### Keep / revise / defer

| Surface | 판정 | 근거 | 다음 행동 |
| --- | --- | --- | --- |

### P31 후보

최대 5개다. 각 후보에 문제, dependency, non-goal, rollback, acceptance screenshot, test marker를 포함한다. concrete finding이 없으면 P31을 만들지 않는다.

### Evidence limits

- current interaction과 prior artifact를 구분한다.
- 실제 관찰 사용자 수를 명시한다.
- 실사용자가 확인해야만 하는 가정은 별도 질문으로 남긴다.

### Persona scorecard

8 personas x 3 sessions의 24개 셀을 `supported / hidden / partial / missing / blocked`로 분류하고, session 사이의 identity·personal state·execution history 보존 여부를 기록한다.

### Service/platform assessment

가치 제안, source 신뢰, artifact 적합성, 개인화, 실행·복구, projection 정합성, 재사용, creator correction, 접근성, scale을 평가한다. 기능 수가 아니라 전체 가치 사슬이 자연스럽게 연결되는지를 판단한다.
