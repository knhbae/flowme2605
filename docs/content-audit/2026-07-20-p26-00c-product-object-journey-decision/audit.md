# P26-00C Audit

## Findings

### High: 같은 사용자 객체가 두 card 문법으로 표현된다

- route: `/`, `/flows`
- current source: `FlowMapCatalogCard`, `DirectoryFlowCard`
- expected: 같은 저장·실행 객체는 같은 information hierarchy
- actual: source-backed map과 ordinary Flow가 다른 정보 밀도와 CTA를 사용
- impact: 사용자가 Flow와 Flow Map의 차이를 먼저 학습해야 함
- decision: user-facing unified Flow card
- evidenceKind: `current_source`, `owner_feedback`

### High: 설명 문장이 artifact preview를 대신한다

- route: `/`, `/flow-maps/*`, `/f/*`
- expected: title, representative item, input, count/date range로 저장 결과 예측
- actual: `이사일 하나로 ... 저장합니다` 형식의 promise가 핵심 정보를 한 문장에 압축
- impact: 문장이 길어지고 실제 item 구조는 늦게 보임
- decision: integrated hierarchy and copy budget
- evidenceKind: `current_source`, `owner_feedback`, `prior_design_artifact`

### High: 저장과 개인 조정의 순서가 단일 경로로 읽힌다

- route: save-before, post-save
- expected: 그대로 시작하는 사용자와 먼저 조정하는 사용자 모두 지원
- actual: route마다 setup/save/customize의 위계가 다르고 조정 capability를 예측하기 어려움
- impact: 저장 후에야 수정 가능성을 발견하거나 얕은 include/exclude만 조정으로 오해
- decision: dual path over one effective artifact
- evidenceKind: `owner_feedback`, `heuristic_simulation`

### High: whole Flow가 콘텐츠 모양을 충분히 드러내지 못한다

- route: `/my`
- expected: timeline/checklist/routine/project/record가 공통 shell 안에서 자연스러운 grouping 사용
- actual: generic row/card가 콘텐츠별 구조와 다음 조작을 충분히 표현하지 못함
- impact: 저장 결과와 조정 가능성을 머릿속에 그리기 어려움
- decision: adaptive body with stable shell
- evidenceKind: `owner_feedback`, `current_package_screenshot`

### High: Calendar가 filter와 placement 작업을 명확히 분리하지 못한다

- route: `/calendar`
- expected: dated execution, Flow filter, undated placement가 각자 명확한 mode
- actual: date-free rows/tray와 grid/agenda가 viewport에 따라 과밀하거나 목적이 모호함
- impact: 날짜 없는 일을 Calendar에서 어떻게 써야 하는지 이해하기 어려움
- decision: explicit filter, on-demand tray, task-focused wide panes
- evidenceKind: `owner_feedback`, `prior_design_artifact`

### Medium: unsupported popularity and review signals

- route: `/flows`
- current source: `인기순` option
- expected: actual aggregation contract or no signal
- actual: supporting metric definition not found in current local model
- decision: hide until real data contract
- evidenceKind: `current_source`

## Alternatives

### Card hierarchy

- Promise-first: 짧지만 source와 actual artifact가 약함. 기각.
- Source-first: 신뢰는 보이나 사용자가 하게 될 일이 늦음. 기각.
- Integrated: job/title, verified source, representative artifact, input, result. 채택.

### Save model

- Save then adjust only: 빠르지만 조정 기대를 놓침. 기각.
- Adjust then save only: 모든 사용자에게 planner 비용을 강제. 기각.
- Dual path: same artifact에서 그대로 시작/조정. 채택.

### Whole-Flow grouping

- Date-only: undated checklist와 record에 부적합. 기각.
- Phase-only: timeline과 recurrence에 부적합. 기각.
- Adaptive shape: stable shell + shape-specific body. 채택.

### Calendar tray

- Always visible: discoverable하지만 wide/mobile 모두 과밀. 기각.
- Hidden route: 발견성이 약함. 기각.
- On-demand in Calendar: count + explicit `일정에 놓기`. 채택.

### Editor

- Full editor inline: capability는 보이나 실행 흐름을 압도. 기각.
- Quick only: 구조와 recurrence 요구를 막음. 기각.
- Quick + advanced + separate batch/structure modes. 채택.

## Implementation impact

P26-00C 자체는 runtime/schema를 바꾸지 않는다. 다음 구현에서 component composition은 크게 바뀔 수 있지만 source/personal/run/occurrence ownership과 4-tab IA는 유지한다.

## Current/Proposed 측정

| frame | visible text blocks | visible actions | overflow | console error |
| --- | ---: | ---: | ---: | ---: |
| current production Home mobile | 15 | 9 | 0 | 0 |
| proposed Home mobile | 9 | 3 | 0 | 0 |
| current production `/flows` mobile | 25 | 22 | 0 | 0 |
| proposed catalog mobile | 16 | 6 | 0 | 0 |
| current production public vehicle mobile | 63 | 16 | 0 | 0 |
| proposed save-before mobile | 12 | 8 | 0 | 0 |

측정 selector와 전체 route/frame 결과는 `capture-results.json`에 있다. 숫자는 화면 복잡도의 대리 지표일 뿐 이해도 점수가 아니다.

Fresh browser query는 local saved records를 만들지 않으므로 current `/my`와 `/calendar` 캡처는 empty-state만 증명한다. 저장된 multi-Flow Calendar 비교는 이번 실행과 prior artifact를 섞지 않으며 P26-15 interactive fixture에서 다시 캡처한다.

## Deferred evidence

- 실제 사용자의 5초 comprehension
- source trust signal이 선택에 미치는 영향
- dual path의 선택 비율
- adaptive grouping 선호
- Calendar tray 발견률

이 항목들은 observed-user test 전까지 heuristic이다.
