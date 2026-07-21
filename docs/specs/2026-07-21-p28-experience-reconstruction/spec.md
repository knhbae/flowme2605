# P28 Cross-Surface Experience Reconstruction Spec

**Date:** 2026-07-21

**Status:** Released through PR #144; owner and independent review pending

**Owner:** FlowMe product owner + implementation agent

**Related roadmap:** [P28 Cross-Surface Experience Reconstruction](../../ROADMAP.md#p28-cross-surface-experience-reconstruction)

## 1. Goal

FlowMe의 동일한 Flow가 `Flow 찾기`, 저장 전 조정, My Flow, Calendar에서 서로 다른 제품처럼 보이지 않게 한다. 사용자는 전체 Flow와 실제 결과 형태를 먼저 확인하고, 필요한 제목·날짜·순서·포함 여부·반복 범위만 자연스럽게 조정한 뒤 저장하거나 외부 도구로 옮길 수 있어야 한다.

P28의 목적은 기능 개수를 늘리는 것이 아니다. P27까지 만든 기능과 데이터를 하나의 일관된 사용자 문법으로 재구성하는 것이다.

## 2. Stage fit

FlowMe는 아직 internal alpha다. source 기반 Flow, 개인 overlay, 실행 run, recurrence occurrence, Calendar, export는 구현됐지만 owner가 현재 UX를 실제 사용자 관찰에 넘길 수준으로 보지 않는다.

따라서 지금 필요한 일은 다음이다.

- 대규모 participant study가 아니라 current interaction 재구성
- AI/crawler가 아니라 준비된 Flow와 개인 draft의 save-before/edit/execute 연결
- planner 기능 확장이 아니라 portable execution layer의 정보 위계 정리
- 더 많은 설명이 아니라 실제 데이터와 직접 조작 가능한 구조

## 3. User need

### 발견·저장 사용자

준비된 Flow를 선택했을 때 저장될 전체 내용과 가장 자연스러운 결과 형태를 보고, 저장 전에 필요한 부분을 고치고 싶다.

### 반복 Flow 사용자

홈트와 정기 루틴에서 주 몇 회, 무슨 요일, 언제까지 할지만 이해하고 조정하고 싶다. 저장 전과 Calendar에서 다른 운동 전용 도구를 새로 배우고 싶지 않다.

### My Flow 반복 사용자

저장한 Flow가 늘어나도 검색창부터 배우지 않고 전체 목록을 훑고, 원하는 Flow를 열어 구조·다음 행동·수정·보관을 이해하고 싶다.

### Calendar-heavy 사용자

Flow가 많아져도 가로로 긴 chip 목록을 스크롤하지 않고, 보고 싶은 Flow를 찾거나 좁히고 날짜별 일을 실행하고 싶다.

### 외부 도구 사용자

저장 또는 export 전에 Calendar, Checklist/Todo, Sheet, Memo에 실제로 무엇이 들어가는지 확인하고 싶다.

## 4. 현재 문제의 제품 판정

P27의 다음 capability는 구현돼 있다.

- include/date/title+memo/order adjustment
- reversible completion and reopen
- Flow archive/restore
- Item exclude/delete/restore
- recurrence series/occurrence identity
- resource/subcheck data separation
- Calendar Flow scope
- whole/selected/item export scope

하지만 다음 interaction은 `supported_but_not_accepted`다.

- 저장 전 전체 Flow를 보면서 자연스럽게 수정
- routine schedule과 occurrence result의 구분
- resource의 공통 표현
- 다수 Flow에서 Calendar scope 선택
- My Flow browse/search/detail hierarchy

P28은 capability를 다시 구현하지 않고 interaction grammar를 다시 구성한다.

## 5. 보존할 계약

### 5.1 One user-facing Flow object

Home, `/flows`, public `/f`, My Flow, Calendar, export에서 같은 Flow title, identity, effective item을 사용한다. `Flow Map`은 사용자에게 별도 제품 object로 다시 노출하지 않는다.

### 5.2 Source ownership

- source title, detail, source URL, published schedule, source order는 원본 소유다.
- 개인 수정, 제외, 보관이 source를 덮어쓰거나 삭제하지 않는다.
- source가 없는 콘텐츠를 그럴듯한 item으로 채우지 않는다.

### 5.3 Personal overlay

- Flow alias, anchor, item title/date/memo, include/exclude, personal order를 소유한다.
- save-before draft는 저장 전 ephemeral state로 유지하고 저장 시 기존 overlay path에 commit한다.
- 별도 save-before persistence schema를 만들지 않는다.

### 5.4 Execution run and occurrence

- completion, reopened, skipped, held는 run/occurrence 소유다.
- routine series definition은 완료 대상이 아니다.
- 한 occurrence의 완료가 series 전체 완료를 뜻하지 않는다.

### 5.5 Export identity

- preview count, saved count, export receipt는 같은 effective projection을 사용한다.
- mutable title/date/order를 event UID로 사용하지 않는다.

### 5.6 Navigation

- 4탭 IA를 유지한다.
- Studio를 5번째 탭으로 승격하지 않는다.
- public `/f` 공유 shell과 저장 전/후 completion 경계를 유지한다.

## 6. P28 공통 interaction grammar

## 6.1 Flow header

모든 surface에서 다음 순서를 유지한다.

1. Flow 제목
2. source/creator 또는 개인 draft 상태
3. 콘텐츠 형태와 핵심 범위
4. 현재 필요한 사용자 값 또는 다음 행동

첫 화면에 긴 설명문을 반복하지 않는다. source scope, rights, safety는 필요한 경우 disclosure로 연다.

## 6.2 Flow outline

동일한 effective item list를 저장 전과 저장 후에 쓴다.

- timeline: 날짜/구간 group
- checklist: section group
- routine: series definition + occurrence preview
- mixed/project: phase + dated/undated item
- record: row/field preview

긴 Flow는 요약할 수 있지만 `전체`라는 label을 쓰면 한 번의 action으로 모든 item title을 확인할 수 있어야 한다.

## 6.3 Item row anatomy

실행 row의 기본 구조는 콘텐츠 종류와 route에 관계없이 같다.

1. completion control 또는 non-completable role marker
2. title
3. date/time 또는 `날짜 없음`
4. Flow/section context
5. `열기`

기본 row에 edit/delete/reorder/export를 모두 노출하지 않는다. 구조·일정·내용 수정은 contextual command 또는 edit mode에서만 나타난다.

## 6.4 Item detail/editor

저장 전과 저장 후가 같은 field order와 control vocabulary를 사용한다.

### Quick

- 제목
- 날짜 없음/날짜
- 시간 또는 종일
- 개인 메모

### Structure

- 포함/제외
- 추가
- 복구
- 순서

### Advanced

- 반복 빈도, 요일, 종료
- duration/location
- resource/subcheck personal adjustment

한 화면에서 모든 mode를 펼치지 않는다. 현재 작업 하나만 연다.

## 6.5 Completion grammar

- ordinary item: `완료 체크` / `다시 열기`
- routine occurrence: 같은 checkbox + occurrence date
- skip/hold: overflow 또는 detail의 별도 execution action
- immediate undo: 완료, 보관, 제외, 날짜 이동 등 recoverable mutation 뒤 제공

운동만의 `오늘 결과` 상태 selector를 공통 완료 모델 위에 별도 completion system으로 두지 않는다.

## 6.6 Resource grammar

영상, URL, 공식 안내, 문서는 공통 `자료` block에서 표시한다.

- completion checkbox가 없다.
- title, source, open action을 제공한다.
- 위험/중단 기준은 safety block이며 resource 또는 action과 분리한다.
- route별 `원본 운동 영상` special card를 만들지 않는다.

## 7. Save-before target experience

## 7.1 Cold start

`/flows` empty는 composer와 소수의 대표 결과 예시를 보여준다. 전역 다섯 카드 Gallery를 기본 IA로 만들지 않는다.

## 7.2 Flow selected

선택 후에는 다음 순서로 전환한다.

```text
Flow header
-> 저장될 전체 outline
-> primary artifact actual-data preview
-> 필요한 사용자 값
-> 조정
-> 저장/가져가기
```

모바일에서는 순차 stack/drill-in을 사용한다. 1024px에서는 outline과 preview 또는 preview와 editor 중 두 개의 주요 pane만 보인다. 1280~1440px 이상에서만 세 번째 contextual pane을 검토한다.

## 7.3 Adjustment

사용자는 다음을 저장 전에 조정할 수 있어야 한다.

- Flow title alias
- item include/exclude
- item title
- anchor 또는 item date
- undated/date transition
- item order
- personal memo
- routine frequency/weekdays/end

모든 Flow에 모든 control을 노출하지 않는다. 현재 콘텐츠와 선택한 item에 의미 있는 control만 보인다.

## 8. 다섯 projection shape

| Shape | 포함할 데이터 | 기본 사용 |
| --- | --- | --- |
| Flow execution | 단계, item, completion criteria, next action | FlowMe 내부 실행 |
| Calendar | valid date/time, recurrence, event identity | timeline, scheduled action, routine occurrence |
| Checklist/Todo | ordered executable item, optional due date | date-free checklist, condition-triggered action |
| Sheet | row/column attributes, status, record fields | course progress, comparison, logs |
| Memo | context, source, personal note, resource | reference, summary, handoff |

화면에서는 primary 한 개와 의미 있는 secondary만 노출한다. 다섯 shape 모두를 항상 탭으로 만들지 않는다.

## 9. Routine target experience

## 9.1 Definition

반복 Flow의 저장 전 핵심 입력은 다음으로 제한한다.

- 시작일
- 빈도 또는 요일
- 선택적 시간
- 종료 없음 / 날짜까지 / 횟수까지

`앞으로 4주 미리보기`는 화면 범위다. `4주 프로그램`은 source 또는 사용자 종료 조건일 때만 표시한다.

## 9.2 Execution

Today와 Calendar는 occurrence 하나를 ordinary task row 문법으로 보여준다. 운동 특유의 정보는 detail의 resource와 note에 둔다.

- 완료: 공통 checkbox
- 다시 열기: 공통 checkbox
- 휴식: skip/hold
- 강도 조정: occurrence note 또는 personal adjustment
- 영상: resource
- 통증/중단: safety

## 10. My Flow target experience

## 10.1 `지금`

- 오늘, 지난 항목, 가까운 다음 항목을 날짜별로 묶는다.
- 같은 날짜의 같은 Flow는 시각적으로 group한다.
- one occurrence / one row / one completion control을 유지한다.

## 10.2 `Flow 목록`

- browse가 기본이다.
- search/filter는 library utility이며 primary experience가 아니다.
- 1, 5, 20, 50 Flow fixture에서 layout을 검증한다.
- mobile은 list -> detail, wide는 library rail -> selected Flow workspace를 기본 대안으로 검토한다.
- dropdown으로 하나를 고른 뒤 아래에 또 전체 list를 보여주는 중복 control을 제거한다.

## 10.3 Flow detail

- 저장 전과 같은 header/outline/item row/resource grammar를 쓴다.
- 다음 할 일은 강조하되 전체 Flow를 가리지 않는다.
- 조정, 가져가기, 보관은 명확한 secondary command로 둔다.

## 11. Calendar target experience

## 11.1 Scope

Flow가 적으면 compact shortcut을 사용할 수 있다. Flow가 많으면 다음을 제공한다.

- `전체` 상태
- 현재 선택 scope 요약
- 검색 가능한 Flow picker
- 최근 또는 현재 월에 event가 있는 Flow 우선
- selected count와 clear/reset

모든 Flow 이름을 한 줄 horizontal chip strip에 계속 늘리지 않는다.

## 11.2 Grid and agenda

- grid: compact marker/count
- agenda: full title, time, Flow, completion
- routine occurrence도 같은 agenda row를 사용한다.
- 날짜 없는 item은 undated placement queue에 둔다.
- Flow scope는 grid, agenda, count, undated queue에 동일하게 적용한다.

## 12. Information density and copy budget

- 한 viewport에 primary action은 최대 1개다.
- 같은 의미를 설명과 chip과 heading으로 세 번 반복하지 않는다.
- title 아래 supporting copy는 최대 두 줄을 기본으로 한다.
- source/safety/detail은 사용자가 필요할 때 연다.
- `저장`, `실행`, `내보내기` 단독 CTA보다 결과와 count를 쓴다.
- 설명을 삭제했을 때 이해가 깨지면 interaction hierarchy를 먼저 고친다.

## 13. Component boundary direction

P28-01에서 확정하되 다음 boundary를 우선 검토한다.

- `FlowPreviewWorkspace`: save-before composition
- `FlowOutline`: whole effective Flow
- `FlowItemRow`: ordinary/routine shared row
- `ContextualItemEditor`: save-before/post-save shared edit fields
- `ArtifactDataPreview`: five projection shape renderer
- `RoutineDefinitionEditor`: frequency/weekdays/end
- `ResourceBlock`: URL/video/official guidance
- `FlowScopePicker`: scalable Calendar scope
- `MyFlowLibrary`: browse/search/selected state

현재 `AppClient.tsx`와 `ArtifactWorkbench.tsx`의 slug/tag/category 분기를 그대로 복사해 새 component를 만들지 않는다. 필요한 policy는 pure resolver/fixture로 옮긴다.

## 14. Non-goals

- 실제 AI API, crawler, 자동 publication
- 계정, DB, cloud sync
- Google Calendar, Todoist, Notion OAuth
- 4탭 IA 변경
- Studio 5번째 탭
- full rich-text editor
- arbitrary nested outline
- workout tracking platform
- permanent five-artifact navigation
- source-backed 원본 직접 수정
- fake review/popularity metrics
- observed-user validation claim

## 15. FlowMe gates

| Gate | Decision |
| --- | --- |
| First user action | Flow를 고르거나 URL/메모를 넣고 전체 결과를 확인 |
| Completion signal | 저장 전 count와 저장 후 count/identity가 일치하고 같은 Flow를 다시 열 수 있음 |
| Artifact destination | 콘텐츠별 primary + 최대 2 secondary; 다섯 shape fixture |
| Source/risk boundary | non-action resource/warning은 completion과 분리; source 없는 content는 hold |
| Natural artifact | 실제 Calendar event, Todo/checklist, Sheet row, Memo output |
| Service structure | `/flows`, `/f`, `/flow-maps`, `/my`, `/calendar`, shared projection/component |
| Tooling | browser screenshot, Playwright, unit, docs, build, independent design review |
| Verification | 390/1024/1440, six content shapes, 1/5/20/50 Flow cardinality |

## 16. Program acceptance criteria

- 저장 전 조정에서 title/date/order/include/memo와 routine frequency/end가 실제 사용자 경로로 도달 가능하다.
- save-before, receipt, My Flow, Calendar, export가 같은 effective item identity와 count를 읽는다.
- 홈트의 별도 completion selector와 route-only resource card가 공통 grammar로 흡수된다.
- routine preview horizon과 series end가 구분된다.
- Calendar에 20개 이상의 Flow가 있어도 selector horizontal overflow와 긴 chip strip이 없다.
- My Flow의 browse/search/detail 관계가 1/5/20/50 Flow에서 일관된다.
- 다섯 projection shape가 actual data fixture로 검증되고 의미 없는 shape는 숨겨진다.
- 390x844와 1024x768에서 overlap, overflow, clipped action이 0이다.
- keyboard trap, unnamed focusable, focus loss가 0이다.
- P27 source/personal/run/occurrence/export identity mutation이 0이다.
- 실제 관찰 사용자 수를 자동 결과로 대체하지 않는다.
