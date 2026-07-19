# Journey Frame Audit

## Observation Policy

2026-07-19 owner decision: FlowMe is not yet ready to ask external users for observation. This audit therefore supports an internal product-frame decision and P24-J1~J5 observation-readiness correction only. Owner walkthrough, simulated journeys, Codex/Claude review, browser inspection, and automated QA must remain separate from `observed_user`; P24-00B stays `0 / 15`, not scheduled, until an explicit owner reopen after P24-J5.

## Findings

### 1. High - Moving save-before relies on repeated explanation

`/flow-maps/moving-d30`의 첫 구간에서 이사일 하나로 무엇이 만들어지는지 hero promise, chip, input help, long summary로 반복한다. 정보가 안전 경고이거나 입력 조건이라서 반복되는 것이 아니라, 화면 구조가 저장 artifact를 직접 보여주지 못해 문장으로 보충하는 형태다.

**Impact:** 사용자는 timeline을 보기 전에 설명을 읽어야 하고 primary action이 늦게 보인다.

**Change:** 제목, 이사일, `5개 일정` 요약, 첫 3개 timeline row, `전체 보기`, 저장/조정 action으로 뜻을 전달한다. source/caution/detail은 보존하되 접는다.

### 2. High - Post-save confirmation does not show the saved artifact

저장 후 `/my?savedMap=moving-d30`은 Today 중심의 compact confirmation과 한두 개의 실행 row를 먼저 보여준다. 전체 5개 Flow를 보려면 `전체`로 전환하고 Flow를 다시 펼쳐야 한다.

**Impact:** 사용자는 제대로 저장됐는지 확인하지 못한 채 실행 surface로 이동한다. 기존 시뮬레이션 Step 06의 “저장 성공 메시지가 아니라 실제 실행 목록”과 어긋난다.

**Change:** post-save special state에서 전체 timeline/checklist를 기본 노출한다. returning visit에는 기존 Today-first를 유지한다.

### 3. High - Save and personalize are not presented as one predictable choice

기존 시뮬레이션은 `그대로 시작`과 `조금 고쳐 시작`을 분리했지만 current public/save shell은 저장 CTA와 설명, detail, export가 긴 페이지에 분산된다.

**Impact:** 사용자는 저장 전에 어느 정도 고쳐야 하는지, 저장 후에도 고칠 수 있는지 예측하기 어렵다.

**Change:** save-before는 두 경로만 제공한다. `그대로 저장`은 현재 전체 artifact를 복사하고, `조정하고 저장`은 이름·기준일·포함 항목의 progressive editor를 연다. 항목 상세 편집은 저장 후 유지한다.

### 4. High - My Flow selection is mistaken for Calendar filtering

wide My Flow에서 여러 Flow를 고르는 `보기 범위`가 Calendar filter처럼 읽힌다. 선택한 Flow가 날짜 없는 경우 긴 목록이 나타나 사용자는 Calendar에서 발생한 일로 해석할 수 있다.

**Impact:** My Flow의 전체 artifact 관리와 Calendar의 날짜 실행 역할이 섞인다.

**Change:** My Flow는 저장한 artifact 선택/관리로 명명·구성하고, Calendar는 날짜가 있는 항목만 grid/agenda에 둔다. 날짜 없는 항목은 별도 tray에서 날짜를 부여한다.

### 5. High - Held content competes with executable content

source policy는 held/review 콘텐츠의 public 노출을 제한하지만, legacy saved copy는 `실행 보류`, `확인 후 실행`으로 ordinary My Flow inventory에 나타날 수 있다.

**Impact:** 실행 가능한 콘텐츠와 검토 중 콘텐츠가 같은 목록에서 경쟁한다.

**Change:** ordinary Home/Flows/My Flow/Calendar에서 숨긴다. record와 history는 삭제하지 않고 데이터 관리의 `숨긴 콘텐츠` 또는 직접 복구 경로에 둔다.

### 6. Medium - Vehicle public Flow has a sound basic journey but excessive density

`/f/vehicle-inspection-prep`은 anchor 입력, preview, Flow-level save, post-save completion 경계가 비교적 명확하다. 그러나 hero, setup promise, post-save explanation, workbench intro, 전체 item preview, export, creator, source, caution이 한 page에 연속된다.

**Impact:** 좋은 action hierarchy가 page length와 반복 설명에 묻힌다.

**Change:** 첫 viewport는 title, 검사일, 전체 항목 수, 상위 preview, save/adjust만 보여준다. 나머지는 progressive sections로 유지한다.

## Current Evidence

| Evidence | Finding |
| --- | --- |
| `screenshots/02-moving-save-before-mobile-current.png` | moving promise가 여러 층에서 반복됨 |
| `screenshots/03-post-save-today-mobile-current.png` | 저장 직후 Today slice가 먼저 보임 |
| `screenshots/04-post-save-full-flow-after-two-actions-mobile-current.png` | 전체 Flow는 추가 action 뒤에 보임 |
| `screenshots/05-calendar-mobile-current.png` | date-first Calendar의 기본 역할은 유지 가능 |
| `screenshots/01-public-vehicle-mobile-current.png` | public structure는 유효하나 첫 action 전 copy가 많음 |

## Prior Artifact Evidence

- `2026-07-14-flowme-content-edit-execution-simulation-ko.html`: 전체 Step 확인, 그대로/조정 선택, post-save actual list를 제안한다.
- Claude Design `(8)` progressive editor: title/date/time을 먼저, advanced fields를 뒤로 둔다.
- Claude Design `(8)` completion/undo: 한 실행 row와 즉시 복구를 제안한다.
- Claude Design `(8)` one-occurrence view: Today에는 하나의 실행 row, 다음 항목은 비실행 preview로 낮춘다.

이 자료는 방향 근거이지 현재 production 또는 observed-user evidence가 아니다.

## Decision

### Rejected: copy-only cleanup

문장만 줄이면 post-save full artifact, save/adjust, My Flow/Calendar 역할 문제는 남는다.

### Rejected: full product rewrite

완료·재개, personal overlay, Calendar/export projection, public boundary 등 현재 계약을 버릴 근거가 없다. 재작성은 이미 해결한 정확성 위험을 다시 연다.

### Recommended: bounded journey-frame reset

다음 다섯 장면만 같은 흐름으로 재설계한다.

1. artifact-first public/save preview
2. optional lightweight adjustment
3. post-save full Flow confirmation
4. returning Today and whole Flow management
5. dated Calendar plus undated tray

## Questions Requiring Human Evidence

1. 사용자가 전체 Flow를 저장 전에 어느 정도까지 보고 싶어 하는가?
2. `그대로 저장`과 `조정하고 저장` 중 어느 기본값이 더 자연스러운가?
3. 저장 직후 전체 timeline/checklist와 첫 실행 row 중 무엇을 먼저 기대하는가?
4. source/caution을 접었을 때 신뢰가 낮아지는가?
5. 날짜 없는 tray를 Calendar 안에서 이해하는가, My Flow에서 더 잘 찾는가?
