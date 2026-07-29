# P35-04 Audit

## 1. 판정

`pass`

Calendar live surface를 먼저 추출한 뒤 dead `checklist`/`routine` view만
삭제했다. live Calendar routine과 checklist-shaped Item은 삭제 대상이
아니다.

## 2. Before

- `app/calendar/page.tsx`가 giant `MyFlows`에
  `initialView="calendar"`와 `surface="calendar"`를 전달했다.
- `MyFlowView`는 실제 local IA 외에 `checklist`, `routine`을 포함했다.
- dead view가 전용 state, filter, 계산, 렌더 branch를 보유했다.
- 테스트는 접근 경로가 없는 test id의 부재를 10줄 반복 검사했다.
- FullCalendar import와 month shell이 `AppClient.tsx` 안에 있었다.

## 3. After

- `MyFlowCalendarSurface.tsx`가 Calendar grid, month navigation, placement
  queue slot, scope slot, selected-day slot을 소유한다.
- `app/calendar/page.tsx`는 전용 `MyFlowCalendar` entry를 렌더링한다.
- `MyFlows` public entry에는 더 이상 `initialView`/`surface` prop이 없다.
- `MyFlowView`는 `today | calendar | flow | completed`만 남는다.
- dead `checklist`/`routine` 전용 state, filter, 계산, JSX와 assertion은
  0개다.
- shared projection과 mutation handler는 parity 우선으로 기존 runtime에
  유지하고 extracted surface에 props로 전달한다.

## 4. Route Parity

### `/my?demo=ux12&view=flows`, 390×844

- My Flow local view: 지금 / Flow 목록 / 완료
- Calendar workspace mounted: false
- Flow 목록: 16개
- focused personal workspace 진입: true
- `flow:saved:*` fixture write: 0
- horizontal overflow: 0
- console/page error: 0

### `/calendar?demo=ux12`, 1024×768

- extracted Calendar marker: true
- My Flow library mounted: false
- month selection and day selection: pass
- selected occurrence stable row identity: pass
- completion → reopen → completion: pass
- identity change: 0
- horizontal overflow: 0
- console/page error: 0

## 5. Data And Rollback

P35-04에서 storage, serialization, migration, source projection,
execution-run, recurrence occurrence, export identity를 변경하지 않았다.

rollback은 `app/calendar/page.tsx`의 entry와
`MyFlowCalendarSurface` composition을 되돌리는 것으로 한정된다. 데이터
rollback은 필요 없다.

## 6. Evidence Kind

- current_source
- current_command
- current_browser
- current_package_screenshot
- heuristic_review

실제 관찰 사용자 수는 0이다.
