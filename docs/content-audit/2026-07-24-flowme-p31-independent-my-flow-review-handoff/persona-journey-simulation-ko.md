# FlowMe P31 Independent Persona Journey Simulation

## 목적

이 문서는 한 번 저장하고 끝나는 데모가 아니라 `발견 -> 저장 -> 재방문 -> 실행 -> 수정 -> 완료·복구 -> export -> 재사용·관리`를 여러 세션에 걸쳐 검토하기 위한 공통 시나리오다.

- 대상: Claude Design, Codex independent reviewer
- 규모: `8 personas x 3 sessions = 24 cells`
- viewport: 각 persona에서 mobile `390x844` 필수, 대표 상태는 wide `1024x768` 재검증
- evidence: production interaction, current screenshot, current source, heuristic simulation을 분리
- 실제 사용자 관찰: `0명`. reviewer의 판단을 observed-user result로 표현하지 않는다.

## 공통 실행 규칙

각 cell을 다음 순서로 기록한다.

1. 새 브라우저 상태 또는 명시한 fixture에서 시작한다.
2. route, query, local state, viewport를 기록한다.
3. 안내 문단을 먼저 읽지 않고 눈에 보이는 UI만으로 첫 행동을 예측한다.
4. 실제 행동과 결과를 기록한다.
5. interaction depth, 되돌리기 가능성, context loss, 중복 action을 측정한다.
6. My Flow, Calendar, export가 같은 effective Item을 읽는지 비교한다.
7. 자동화로 확인한 사실과 실제 사용자에게 물어야 할 가정을 분리한다.

각 cell의 상태는 다음 중 하나다.

| 상태 | 의미 |
| --- | --- |
| `supported` | 기능과 도달 경로가 명확하고 결과가 일관됨 |
| `hidden` | 기능은 있으나 정상 탐색으로 찾기 어려움 |
| `partial` | 일부 viewport, route, destination 또는 상태에서만 동작 |
| `missing` | 필요한 기능이나 정책이 없음 |
| `blocked` | 데이터·운영 결정 또는 선행 오류 때문에 검증 불가 |

## P1. 기준일 역산형 사용자

상황: 한 달 뒤 이사를 준비한다. 긴 원문을 읽는 대신 전체 일정과 당장 할 일을 확인하고, 일부 날짜를 개인 사정에 맞게 고치고 싶다.

대표 route: `/f/moving-d30-basic`

### Session 1: 발견과 저장

```text
Home 또는 Flow 찾기
-> 이사 Flow 발견
-> source와 전체 결과 범위 확인
-> 이사일 입력
-> Calendar 결과 preflight
-> 내 Flow로 저장
-> receipt
-> My Flow에서 방금 저장한 Flow 확인
```

검토 질문:

- 첫 화면에서 긴 설명보다 실제 날짜별 결과가 먼저 읽히는가.
- 저장 전에 전체 24개 결과와 날짜 범위를 이해할 수 있는가.
- 저장 후 receipt와 My Flow workspace가 같은 Flow identity를 유지하는가.
- My Flow 첫 진입에서 전체 결과를 저장했다는 확신과 다음 행동이 함께 보이는가.

### Session 2: 개인화와 실행

```text
My Flow 재방문
-> 저장한 이사 Flow 찾기
-> 전체 계획 확인
-> 이사일 변경
-> 한 항목 날짜를 별도로 고정
-> 오늘 할 일 완료
-> 바로 취소 또는 나중에 다시 열기
-> Calendar 비교
```

검토 질문:

- `지금`과 Flow workspace `실행`의 차이가 예측 가능한가.
- 전체 기준일 변경과 개별 날짜 고정의 차이가 짧은 UI로 이해되는가.
- 같은 Item의 완료 control이 한 시점에 한 곳에서만 primary로 보이는가.
- 완료 취소가 undo와 장기적인 `다시 열기` 모두에서 가능한가.

### Session 3: export, 관리, 재사용

```text
전체 Flow export
-> 보관
-> reload
-> 보관된 Flow 복구
-> 전체 완료
-> 회고 확인
-> 새 이사일로 다시 쓰기
-> 이전 run과 개인 날짜 유지 정책 확인
```

검토 질문:

- 전체 export와 현재 Item export 범위가 행동 전에 보이는가.
- 보관·복구가 mobile/wide에서 같은 capability인가.
- 새 run이 과거 완료 기록과 섞이지 않는가.

## P2. 날짜 없는 체크리스트 사용자

상황: 차량 점검표를 저장하고, 필요한 항목만 나중에 날짜를 정하고 싶다.

대표 route: `/f/vehicle-inspection-prep`

### Session 1: preview와 저장

```text
public Flow
-> preview check 확인
-> 전체 checklist 구조 확인
-> 저장
-> My Flow 진입
-> 날짜 없는 상태와 남은 항목 이해
```

검토 질문:

- 저장 전 preview check와 저장 후 completion check의 역할이 다르게 읽히는가.
- My Flow가 날짜 없는 Item을 숨기거나 Calendar 실패처럼 보이게 하지 않는가.
- 날짜를 정하지 않아도 바로 checklist로 실행할 수 있다는 점이 UI에서 드러나는가.

### Session 2: 선택적 일정 배치

```text
My Flow에서 특정 Item 열기
-> 날짜 지정
-> Calendar에서 확인
-> Calendar의 날짜 없는 목록에서 다른 Item 배치
-> 배치 undo
-> 완료
-> 완료 취소
```

검토 질문:

- My Flow와 Calendar 중 어디서 날짜를 정할 수 있는지 설명 없이 찾는가.
- Calendar의 undated tray와 선택일 상세가 전체 화면 흐름을 깨지 않는가.
- 날짜 지정·제거·undo가 stable Item identity를 보존하는가.

### Session 3: 범위 선택과 휴대

```text
일부 Item 선택
-> 선택 범위 export
-> 전체 Flow export
-> 날짜 제거
-> My Flow와 Calendar 재확인
```

검토 질문:

- `전체 / 선택 / 현재 항목` export 범위가 결과 수와 함께 예측 가능한가.
- 날짜를 없앤 Item은 My Flow와 list export에는 남고 Calendar/ICS에서만 빠지는가.

## P3. 반복 루틴 사용자

상황: 홈트 루틴을 주 3회 실행한다. 계획인 series와 오늘 실행인 occurrence, 운동 자료, 완료 기록을 구분하고 싶다.

대표 route: `/f/curated-allblanc-morning-workout`

### Session 1: 반복 설정과 저장

```text
Flow 찾기 또는 public Flow
-> 루틴 전체 구조 확인
-> 요일·시간·소요 시간·종료 조건 조정
-> 다음 occurrence preview
-> 저장
-> My Flow에서 routine 확인
```

검토 질문:

- advanced field를 펼치기 전 compact summary로 설정을 이해하는가.
- 4주 고정처럼 보이는 임의의 정책이 없는가.
- 운동 영상/공식 안내가 실행 Item과 resource로 구분되는가.
- routine만 특별한 앱처럼 보이지 않고 공통 Flow 문법을 쓰는가.

### Session 2: 한 회차 실행

```text
My Flow 재방문
-> 이번 occurrence 열기
-> 자료 확인
-> 일부 Item 완료
-> occurrence 완료
-> 다시 열기
-> Calendar 동일 occurrence 확인
```

검토 질문:

- `이번 실행`과 `전체 루틴`을 혼동하지 않는가.
- 오늘 결과 기록 UI가 다른 Flow의 completion/reopen 문법과 일관적인가.
- 한 occurrence 완료가 series 전체를 완료시키지 않는가.

### Session 3: 기록과 다음 회차

```text
run history 확인
-> 다음 occurrence 확인
-> 시간 변경
-> Calendar와 ICS 비교
-> 루틴 보관·복구
```

검토 질문:

- 기록이 현재 실행을 밀어내지 않는가.
- recurrence identity, Calendar row, ICS UID가 수정 후에도 안정적인가.

## P4. 선택형·혼합형 계획 사용자

상황: 결혼 또는 여행 준비 자료에서 Calendar, checklist, sheet 중 자신에게 맞는 결과를 고르고 전체 단계를 조정하고 싶다.

대표 route:

- `/f/curated-wedding-naver-timeline`
- `/f/real-mofa-overseas-travel-prep`

### Session 1: 결과 형태 선택

```text
Flow 상세
-> 실제 전체 구조 확인
-> primary artifact와 secondary artifact 비교
-> 한 형태 선택
-> 필요한 최소 입력
-> 결과 preflight
-> 저장
```

검토 질문:

- 다섯 형태를 긴 카드 stack으로 모두 펼치지 않는가.
- 선택 전 title, row/event 수, 날짜 여부, 손실 정보를 예측할 수 있는가.
- 선택한 artifact가 다음 단계의 화면 문법을 결정하는가.

### Session 2: 단계별 조정

```text
My Flow에서 선택한 Flow 열기
-> phase/date group 확인
-> Item 제목·날짜·메모 수정
-> 단계 중간 의견 또는 수정 메모 남기기
-> 완료·다시 열기
```

검토 질문:

- 공통 shell 안에서 timeline, checklist, resource가 시각적으로 구분되는가.
- Item 조정이 full planner보다 가볍지만 필요한 자유도를 제공하는가.
- 실행 중 메모가 완료 후 회고에만 갇히지 않는가.

### Session 3: 휴대와 source 재확인

```text
전체/선택 export
-> 원문 열기
-> source update 표시 확인
-> 개인 수정 유지 여부 확인
```

검토 질문:

- source link가 실제 링크로 동작하는가.
- source 변경과 personal overlay가 섞이지 않는가.

## P5. 개인 초안 사용자

상황: 등록되지 않은 URL 또는 메모를 여러 할 일로 정리해 개인 Flow로 사용한다.

대표 route: `/flows` miss 또는 memo

### Session 1: 초안 생성과 착지

```text
URL 또는 메모 입력
-> miss/source import 필요 상태
-> 실제 확보 내용 확인
-> 빈 입력 저장 차단
-> 여러 Item 초안 저장
-> My Flow 착지
```

검토 질문:

- 원문이 없을 때 가짜 Flow나 가짜 Item을 만들지 않는가.
- 저장한 Item 전체가 My Flow에 보이는가.
- 저장 직후와 재방문 My Flow의 화면 문법이 같은가.

### Session 2: 구조와 일정 편집

```text
Item 추가
-> 삭제
-> 즉시 undo
-> reload 후 복구
-> 순서 변경
-> 날짜·시간·반복 설정
-> 제목·메모 수정
```

검토 질문:

- 완료, 수정, 삭제, 이동 control이 한 row에서 경쟁하지 않는가.
- mobile editor가 progressive disclosure를 쓰는가.
- stable ID와 개인 값이 구조 변경 후 유지되는가.

### Session 3: projection과 lifecycle

```text
Calendar 확인
-> checklist/sheet/memo/ICS export
-> reload
-> 보관·복구
-> 영구 삭제 확인
```

검토 질문:

- destination별 포함·제외가 같은 effective Item을 읽는가.
- 영구 삭제 범위와 공개 source 보존 여부가 분명한가.

## P6. 많은 Flow를 가진 반복 사용자

상황: 20개 이상 Flow를 저장했다. 최근 실행, 검색, 상태, 다음 날짜로 필요한 Flow를 빠르게 찾고 싶다.

fixture: `1 / 5 / 20 / 60 Flow`

### Session 1: 찾기

```text
My Flow 진입
-> 원하는 Flow 검색 또는 filter
-> compact row 비교
-> Flow workspace 열기
```

검토 질문:

- 1개에서 편한 화면이 20/60개에서도 유지되는가.
- row가 제목 외에 next action, 다음 날짜, 진행 상태 중 실제 선택에 필요한 정보만 보여주는가.
- 20개에서 원하는 Flow를 4 interactions 안에 여는가.

### Session 2: 연속 작업

```text
Flow A 실행
-> Flow B로 전환
-> Calendar 이동
-> My Flow 복귀
-> 기존 search/filter/scroll/selected Flow 복구
```

검토 질문:

- focused workspace와 library context를 오갈 때 위치를 잃지 않는가.
- mobile과 wide의 capability가 같은가.

### Session 3: 관리

```text
보관
-> archived filter
-> 복구
-> 영구 삭제
-> source-backed Flow 재발견·재저장
```

검토 질문:

- lifecycle command가 실행 command와 분리되는가.
- archive row에 direct restore가 있는가.
- ghost row나 orphan local state가 남지 않는가.

## P7. 완료 후 돌아온 사용자

상황: 여러 날에 걸쳐 Flow를 실행하고 완료한 뒤, 기록을 보고 일부를 다시 열거나 새 run으로 재사용한다.

### Session 1: 이어하기

```text
Home 재방문
-> 이어할 Flow 선택
-> My Flow workspace
-> 다음 action 실행
```

검토 질문:

- Home이 Flow 찾기와 달리 실제 이어하기 맥락을 제공하는가.
- Home, My Flow `지금`, workspace `실행`이 같은 Item을 중복 primary로 만들지 않는가.

### Session 2: 완료와 복구

```text
여러 Item 완료
-> 일부 즉시 undo
-> 하루 뒤 완료 목록
-> 다시 열기
-> 기록 확인
```

검토 질문:

- 즉시 undo와 장기 reopen이 같은 상태 모델로 읽히는가.
- 완료된 Item이 사라져 복구 경로를 잃지 않는가.

### Session 3: 회고와 재사용

```text
Flow 전체 완료
-> 단계 메모·회고 확인
-> source 수정 요청 메모와 개인 회고 구분
-> 새 run 시작
-> 이전 history 확인
```

검토 질문:

- reflection, correction, export, reuse가 모두 동시에 펼쳐지지 않는가.
- 새 run과 과거 run의 identity가 분리되는가.

## P8. 키보드·복구 중심 사용자

상황: 키보드와 screen reader 이름에 의존하고, 잘못 누른 행동을 되돌릴 수 있어야 한다.

### Session 1: keyboard 기본 여정

```text
Home
-> Flow 찾기
-> public Flow
-> 저장
-> My Flow
-> Item 완료·다시 열기
```

검토 질문:

- DOM focus 순서가 visual 순서와 일치하는가.
- 모든 icon/action에 Flow 또는 Item 맥락의 accessible name이 있는가.
- visible label과 accessible name의 목적이 일치하는가.

### Session 2: overlay와 focus 복귀

```text
Calendar selected-day sheet
-> 날짜 없는 tray
-> My Flow menu
-> archive dialog
-> cancel/Escape
-> focus return
```

검토 질문:

- sheet/dialog/menu가 focus를 가두고 닫은 뒤 trigger로 돌려보내는가.
- bottom nav와 fixed command가 content보다 먼저 focus되지 않는가.

### Session 3: 오류와 파괴적 행동

```text
빈 입력
-> invalid date/time
-> export 실패
-> archive
-> permanent delete confirmation
-> cancel
```

검토 질문:

- 오류가 Item 또는 입력을 삭제하지 않는가.
- destructive action의 범위, 복구 가능성, source 보존 여부가 보이는가.
- 200% zoom 또는 긴 제목에서도 horizontal overflow와 action overlap이 없는가.

## 24-cell 결과표

검토자는 아래 필드를 모든 cell에 채운다.

| 필드 | 설명 |
| --- | --- |
| `personaId` / `sessionId` | `P1`~`P8`, `S1`~`S3` |
| `route` | 시작 route와 주요 transition |
| `viewport` | width, height, zoom |
| `initialState` | fixture, saved Flow 수, completion, schedule |
| `stepCount` | 성공 또는 막힘까지 interaction 수 |
| `status` | supported/hidden/partial/missing/blocked |
| `mentalModelPrediction` | 화면만 보고 예상한 다음 행동 |
| `actualResult` | 실제 production 결과 |
| `explanationFree` | 설명 문단 없이 성공했는지 |
| `crossSurfaceParity` | My Flow/Calendar/export 일치 여부 |
| `recoveryPath` | undo/reopen/restore/cancel |
| `actionableDuplicateCount` | 동일 Item의 동시 실행 control |
| `contextLossCount` | filter/selection/scroll 손실 |
| `evidenceKind` | 허용 enum |
| `observedUserQuestion` | 실제 사용자에게만 확인할 질문 |

## 최종 판정

24-cell 결과와 A/B/C My Flow 대안을 함께 비교해 다음 중 하나를 선택한다.

- `keep_p31`
- `bounded_revision`
- `my_flow_structural_reopen`
- `cross_tab_ia_reopen`

판정은 취향 투표가 아니다. current reproduction, complexity metric, persona transition, data impact, rollback을 근거로 해야 한다.
