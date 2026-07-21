# P27-R 상세 백로그

## P27-R00A [Blocking Gate] 라이프사이클 비교 prototype

**문제**

기존 P27 자료가 composer, batch editor, Calendar, My Flow를 각각 개선하지만 이번 사용자 피드백의 전체 Flow 문법과 복구 의미를 한 번에 비교하지 못했다.

**범위**

- current/proposed save-before workspace
- current/proposed My Flow 1/3/5/12 Flow
- current/proposed workout series/occurrence/resource
- Flow archive와 Item exclusion interaction storyboard
- 390x844, 1024x768

**비범위**

- app code
- schema/migration
- 실제 사용자 검증 주장

**완료 기준**

- 기본 read mode와 contextual edit mode가 분리된다.
- save-before와 saved detail이 같은 Flow outline을 사용한다.
- program end/preview horizon이 별도 label로 보인다.
- My Flow search 노출 조건이 결정된다.
- archive/remove/restore 문구와 경로가 결정된다.
- owner 승인 전 implementation 상태는 `blocked_by_design_gate`다.

## P27-R00F [High, Parallel] SSR와 접근성 foundation

**범위**

- `/flows` meaningful server document
- `/my` shell SSR regression
- routine event one focusable control
- shared overlay focus return
- no-JS/server HTML smoke

**완료 기준**

- `/flows` server HTML에 loading 문구만 존재하는 상태 0.
- `/my` primary nav 4개, studio shell 0.
- unnamed visible control 0.
- hydration mismatch 0.

## P27-R01A [Blocking Contract] Reversible lifecycle

**범위**

- Flow archive record와 resolver
- item personal exclusion/tombstone/restore
- execution history 보존
- malformed/legacy migration
- clear/reset/permanent-delete 정책

**필수 fixture**

1. active Flow archive/restore
2. completed Flow archive/restore
3. recurring Flow archive with past occurrences
4. source Item exclude/restore
5. user Item delete/restore
6. archive after export receipt
7. malformed archive record
8. legacy saved Flow

**완료 기준**

- archive 후 source mutation 0.
- run/history loss 0.
- restore stable identity change 0.
- UI 변경 0.

## P27-R01B [High] Archive/remove/restore UI

**범위**

- Flow `보관하기`, undo, 보관됨, 복구
- source item `내 Flow에서 빼기`
- user item `삭제`
- removed item restore
- mobile/wide command hierarchy

**완료 기준**

- destructive Flow action이 기본 row에 상시 노출되지 않는다.
- 즉시 undo와 reload 후 restore가 모두 된다.
- completion/reopen 상태가 유지된다.
- accessible name에 대상 title과 action이 포함된다.

## P27-R02A [Blocking Contract] Recurrence horizon, resource, subcheck

**범위**

- source-defined duration provenance
- preview horizon
- series end
- resource/subcheck ownership
- nested personal overlay 최소 계약
- occurrence edit scope

**완료 기준**

- generic 4-week fallback이 series end가 되는 경로 0.
- source-defined 4-week와 UI preview 4-week fixture가 구분된다.
- URL resource가 completion-like item으로 분류되는 건수 0.
- source subcheck/resource mutation 0.

## P27-R02B [High] Workout end-to-end correction

**범위**

- save-before routine setup
- source/program truth label
- start/weekdays/time/end adjustment
- resource block
- saved My Flow series/next occurrence
- mobile/wide Calendar

**완료 기준**

- 사용자가 4주의 의미를 화면에서 확인할 수 있다.
- 390px에서 Calendar text collision 0.
- one occurrence one completion control.
- video URL subcheck count 0, resource count >=1.
- save-before/saved/Calendar occurrence count가 계약과 일치한다.

## P27-R03A [High Gate] Save-before workspace prototype

**범위**

- moving, vehicle, workout A/B prototype
- whole Flow first
- operation-specific adjustment
- sticky primary 1개
- artifact preflight
- Composer handoff

**완료 기준**

- 첫 viewport에 실제 Flow item과 결과 요약이 보인다.
- 조정 전 editing control 기본 count가 최소화된다.
- 한 번에 활성 operation 1개.
- 저장 결과 수와 projection count가 같다.

## P27-R03B [High] Save-before workspace implementation

**범위**

- shared Flow outline
- adjustment mode
- existing URL hit/memo proposal 연결
- save surface 통합
- post-save receipt handoff

**완료 기준**

- save decision surface 1.
- source/personal write path cross-write 0.
- moving/vehicle/workout targeted E2E 통과.
- mobile keyboard path 완결.

## P27-R04A [High Gate] My Flow IA prototype

**범위**

- `지금`과 `Flow`
- adaptive search
- active/recent/archived
- same-date grouping
- one/multi-Flow wide layout

**완료 기준**

- 1/3/5/12 fixture decision 기록.
- 검색 없이 Flow를 찾는 기본 경로와 검색이 필요한 경로가 분리된다.
- same-date item은 한 날짜 group에서 스캔된다.

## P27-R04B [High] My Flow implementation

**범위**

- common execution row
- adaptive Flow library
- saved/returning detail parity
- archived list
- same-date grouping

**완료 기준**

- 1 Flow에서 불필요한 search/filter chrome 0.
- 12 Flow에서 keyboard/search로 찾기 가능.
- post-save와 returning outline count/title/date parity.
- same item duplicate primary execution row 0.

## P27-R05 [High] Confirmation/resource contextual edit

**범위**

- subcheck add/edit/remove/reorder
- resource add/edit/remove
- source/personal ownership labels
- compact item edit sheet

**완료 기준**

- resource completion-like checkbox 0.
- source mutation 0.
- nested personal changes reload persistence.
- mobile horizontal overflow 0.

## P27-R06 [Medium] Calendar routine and placement workspace

**범위**

- routine weekly strip/agenda
- selected-day occurrence detail
- undated queue
- Flow scope filter
- same-date groups

**완료 기준**

- long routine title collision/truncation identity loss 0.
- grid compact, agenda full-detail 역할 유지.
- filter count parity across queue/grid/agenda.
- date move undo와 identity 보존.

## P27-R07 [Medium] Compact export and post-save hierarchy

**범위**

- compact export preflight
- Flow/selected/item scope
- resource/subcheck loss notice
- output receipt
- compact save receipt band

**완료 기준**

- duplicate full item list 0.
- preview/output count parity.
- default expanded secondary section <=1.
- saved outline을 receipt가 가리지 않는다.

## P27-R08 [Integration] Regression and final review

**필수 시나리오**

1. moving save-before adjust -> save -> archive -> restore
2. vehicle undated -> date placement -> item exclude/restore
3. workout series setup -> occurrence complete/reopen -> Calendar
4. memo draft add/reorder/resource/subcheck -> export
5. 1/3/5/12 Flow retrieval
6. public preview -> saved execution

**완료 기준**

- Blocking/High automated finding 0.
- source/personal/run/occurrence/export identity mismatch 0.
- docs/unit/build/targeted/full E2E 통과.
- 390/1024 overflow/fixed overlap/console/page error 0.
- observed-user count를 실제 값으로 기록.

## P28로 넘길 항목

- account/database/cloud sync
- real URL extraction/AI provider
- external service OAuth
- creator publish/update workflow
- cross-device archive/trash retention
- social proof, review/rating, marketplace
