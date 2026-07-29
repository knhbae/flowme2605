# P35-R7 bounded revision final audit

## 범위

R7은 새 기능을 추가하지 않고 P35-R0~R6가 만든 bounded composition을 다섯
대표 형태에서 다시 검증했다.

- Calendar: `/f/moving-d30-basic`
- Checklist: `/f/vehicle-inspection-prep`
- Routine: `/f/curated-allblanc-morning-workout`
- Sheet: `/f/source-backed-middle-school-math-1`
- Memo: `/f/overseas-safety-register`
- Scale: `/my?demo=ux60&view=flows`

Evidence kind는 `current_source`, `current_local_production_build`,
`current_browser_automation`, `current_package_screenshot`이다.

## 세션별 결과

### Session 1: 저장 전 실제 결과

390x844에서 각 route의 primary artifact와 전체 실제 행을 확인했다.

- 형태 선택 control: 0
- visible primary action: 최대 1
- 항목 편집: contextual 한 행 editor
- Calendar 첫 행 editor: Enter로 열기, Escape로 닫기, trigger focus 복귀
- source Item 수와 preview row 수 불일치: 0

### Session 2: 외부 이동 전 preflight

1024x768에서 같은 artifact plan을 export preflight가 읽는지 확인했다.

- Calendar: 24 events
- Checklist: 10 items
- Routine: 1 committed series event
- Sheet: 8 rows
- Memo: 4 records
- 추천된 disabled destination: 0
- preview와 preflight count mismatch: 0

### Session 3: 저장한 개인 Flow 실행

390x844에서 같은 stable Flow를 My Flow focused workspace로 열었다.

- Calendar: `nearest_date_group`
- Checklist: `next_items`
- Routine: `current_occurrence`
- Sheet: `current_and_next_row`
- Memo: synthetic execution block 없음
- 독립 local workspace tab: 0
- 완료 후 snackbar 되돌리기와 같은 checkbox focus 복귀: 통과
- structural membership 변화: 0

## 데이터와 projection

| 계층 | R7 판정 |
| --- | --- |
| source/published Flow | 원본 row, order, schedule mutation 0 |
| personal overlay | 제목, 날짜, 포함 여부를 기존 경로로 유지 |
| execution run | 완료/다시 열기를 구조와 분리 |
| recurrence occurrence | series와 current occurrence identity 분리 |
| export | whole/selected/current와 실제 count 계약 유지 |
| storage | 새 key, schema, migration 없음 |

## 회귀 수정 내역

전체 gate 전에 오래된 E2E가 P35 이전 화면 위치를 가정하던 부분을 현재 사용자
동작으로 교정했다.

1. 개인 draft의 중복 표시 중 전체 계획 행만 구조 편집 대상으로 선택한다.
2. 모바일 Calendar에서 날짜 sheet를 닫고 다음 날짜를 선택한다.
3. 완료 직후에는 화면을 가리는 checkbox 재클릭 대신 snackbar `되돌리기`를 쓴다.
4. 보관함 복구 후 목록을 강제하지 않고 바로 열린 focused workspace를 확인한다.
5. 메모 preview에서는 항목 수정은 허용하되 reorder/delete 구조 명령은 disclosure
   전 0개인지 검증한다.
6. 기록형 Flow는 범용 `날짜 없음` 대신 `현재 행/다음 행` 문법을 검증한다.

제품 기능을 통과시키기 위해 P35에서 제거한 Today frame, local view tab, Calendar
inline editor, 중복 receipt를 되살리지 않았다.

## 화면 품질

15개 session screenshot과 1440px 60-Flow library screenshot에서 다음을
자동 측정하고 육안 확인했다.

- horizontal overflow: 0
- fixed bottom navigation overlap: 0
- 이름 없는 visible interactive: 0
- main landmark 누락: 0
- console/page error: 0

## 검증

- `npm.cmd run docs:check`: 14개 필수 문서, 3,294개 로컬 링크 통과
- `npm.cmd test`: pretest 91/91, unit 590/590
- `npx.cmd playwright test --workers=1`: 381/381
- `npm.cmd run build`: pass
- R7 targeted E2E: 6/6
- viewport: 390x844, 1024x768, 1440x900

## 잔여 위험

1. observed-user count는 0이다.
2. current R7 변경은 아직 commit/push/PR/Preview/production에 반영되지 않았다.
3. 현재 worktree는 P35 전체가 함께 있는 큰 미커밋 상태다. publish 전에는 의도한
   범위만 별도 closeout하고 Preview에서 동일 상태를 다시 확인해야 한다.

위 세 항목은 로컬 기능 gate 실패가 아니라 publish 및 실제 관찰의 별도 단계다.
