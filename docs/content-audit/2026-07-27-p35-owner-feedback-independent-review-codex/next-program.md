# P35 bounded composition revision program

## 실행 원칙

- P35 전체를 폐기하지 않는다.
- 한 slice씩 구현하고 acceptance screenshot을 확인한 뒤 다음으로 이동한다.
- source, personal overlay, execution run, occurrence, export identity는 변경하지 않는다.
- 새 4번째 탭, 고정 5 artifact 탭, full planner 기능을 추가하지 않는다.
- migration은 현재 권고 범위에서 필요하지 않다.
- observed-user count는 자동 검증과 별도로 계속 0으로 기록한다.

## Dependency

```text
R1 artifact preflight parity
 ├─ R2 contextual Item personalization
 └─ R3 receipt + personal workspace continuity
      ├─ R4 shape-aware execution + history
      └─ R6 mobile Calendar selected-day composition

R1 + R2 + R3
 └─ R5 memo proposal grammar

R1~R6
 └─ R7 final independent gate
```

## P35-R1. Primary artifact preflight parity

### 문제

public preview가 `체크리스트 24개`를 약속해도 external preflight는 sheet/memo만
보여 줄 수 있다. 같은 artifact의 이름, count, loss가 preview와 export에서
일치하지 않는다. 반복 Flow는 시작일 미확정 상태의 예시 날짜가 저장된 일정처럼
보이지만 실제 저장 후에는 날짜 없는 1개 항목으로 바뀐다.

### 범위

- `artifact-plan`에서 primary 1개와 eligible secondary 최대 2개를 정한다.
- `FlowArtifactDataPreview`와 public export가 같은 plan을 읽는다.
- public preflight는 whole Flow만 소유한다.
- count, destination, 빠지는 정보, FlowMe-only 상태를 표시한다.
- 반복 schedule의 provisional 값과 committed 개인 값을 구분한다.
- Calendar가 primary인 반복 Flow는 시작일 확정 뒤에만 날짜 있는 event count를 약속한다.
- 5개 대표 shape를 고정한다.

### 비범위

- selected/current public export
- OAuth
- 새로운 artifact 종류
- export identity 변경

### 영향 파일

- `lib/flow/artifact-plan.ts`
- `lib/flow/flow-experience-projection.ts`
- `components/flow/FlowArtifactDataPreview.tsx`
- `components/flow/ArtifactWorkbench.tsx`
- `components/flow/FlowExportPanel.tsx`
- `components/flow/AppClient.tsx`

### Rollback

기존 `public-flow-export-secondary-entry` disclosure를 feature branch에서 그대로
복구할 수 있게 R1 diff를 export presentation과 plan adapter에 한정한다.

### Acceptance

- moving: checklist 24 preview -> checklist 24 preflight
- vehicle: checklist/todo 10 preview -> 동일 10
- workout: source Item count와 occurrence count를 분리하고, 시작일·첫 날짜·예정 회차·
  Calendar/ICS event count가 preview/receipt/My Flow/export에서 일치
- study: sheet 8행 일치
- guide: memo 4개 일치
- unsupported control 0
- 390/1024 overflow 0
- keyboard focus return
- screenshot:
  - `P35-R1-PUBLIC-PREFLIGHT-MOVING-390`
  - `P35-R1-PUBLIC-PREFLIGHT-SHAPES-1024`
- E2E:
  - `p35-r1-artifact-preflight-parity.spec.ts`

## P35-R2. Contextual pre-save Item personalization

### 문제

저장 전 항목 조정은 include checkbox뿐이라 title, detail, individual date를
검토하거나 바꿀 수 없다.

### 범위

- public preview row에서 Item sheet를 연다.
- 저장 전 수정 필드는 title, detail, date만 제공한다.
- 한 번에 Item 하나만 편집한다.
- 변경 전/후 artifact count와 date range를 즉시 갱신한다.
- source mutation 없이 personal proposal을 저장 후 overlay로 넘긴다.

### 비범위

- add/delete/reorder
- advanced repeat
- time/location 전체 editor
- source content 수정

### 영향 파일

- `components/flow/PublicFlowAdjustmentPanel.tsx`
- `components/flow/AppClient.tsx`
- 기존 Item editor primitive
- personal overlay adapter

### Rollback

새 contextual editor entry와 proposal adapter만 제거하면 include-only P35로
돌아갈 수 있어야 한다.

### Acceptance

- row edit 진입 2 tap 이하
- 열린 editor 1개
- source mutation 0
- 저장 전/후 title, detail, date parity
- Escape, cancel, focus return
- 390 screenshot `P35-R2-CONTEXTUAL-ITEM-EDIT-390`
- 1024 screenshot `P35-R2-ITEM-INSPECTOR-1024`
- E2E `p35-r2-pre-save-contextual-item.spec.ts`

## P35-R3. Saved receipt와 personal workspace continuity

### 문제

public receipt 뒤 My Flow가 다시 저장 receipt와 4개 next command를 보여 준다.

### 범위

- public receipt를 name/count/date/source 확인으로 축소한다.
- primary는 `저장한 전체 Flow 보기` 하나로 둔다.
- My Flow는 selected Flow workspace로 직접 연다.
- second receipt와 post-save 4-path hub presentation을 제거한다.
- Calendar/export는 workspace secondary command로 유지한다.

### 비범위

- 저장 schema
- Flow library IA 변경
- execution projection 변경

### 영향 파일

- `components/flow/SavedFlowReceiptFrame.tsx`
- `components/flow/PostSaveDecisionHub.tsx`
- `components/flow/AppClient.tsx`
- post-save E2E helper

### Rollback

legacy post-save hub component는 한 slice 동안 삭제하지 않고 unused 상태로 둔다.
R3 검증 후 별도 정리한다.

### Acceptance

- receipt primary 1개
- My Flow first frame duplicate receipt 0
- 전체 Flow와 next unit이 같은 object frame에 존재
- reload 후 같은 Flow 선택 유지
- 390 screenshot `P35-R3-RECEIPT-TO-WORKSPACE-390`
- 1024 screenshot `P35-R3-RECEIPT-TO-WORKSPACE-1024`
- E2E `p35-r3-saved-continuity.spec.ts`

## P35-R4. Shape-aware execution unit와 history ownership

### 문제

모바일 fixed `다음 행동 / 전체 계획 / 기록`은 콘텐츠 shape를 왜곡하고 wide와
semantic order가 다르다.

### 범위

- 모바일 fixed 3탭 presentation을 제거한다.
- 공통 순서:
  - object header
  - shape-aware execution unit
  - whole plan
  - optional progress history
- dated: 가장 가까운 날짜의 미완료 group
- checklist: next 1~3 + 전체 목록
- routine: current occurrence + series summary
- sheet: current row + next row
- memo/guide: relevant section, synthetic next 없음
- history는 event가 있을 때만 표시한다.
- Item memo와 run reflection은 history에서 분리한다.

### 비범위

- execution run schema 변경
- occurrence 생성 규칙 변경
- 새 Today route

### 영향 파일

- `components/flow/AppClient.tsx`
- `lib/flow/whole-flow-reading.ts`
- `lib/flow/my-flow-local-ia.ts`
- My Flow E2E helper

### Rollback

새 next-unit projection을 feature adapter로 만들고, 기존
`getSavedFlowNextRow`는 R4 완료 전 제거하지 않는다.

### Acceptance

- same-date group과 Calendar selected-day stable identity parity
- routine occurrence와 series 구분
- sheet current row label
- memo synthetic next 0
- history 없는 Flow에서 고정 record tab 0
- 390/1024 semantic order parity
- screenshots:
  - `P35-R4-DATED-NEXT-GROUP-390`
  - `P35-R4-ROUTINE-OCCURRENCE-390`
  - `P35-R4-SHEET-CURRENT-1024`
- E2E `p35-r4-shape-aware-workspace.spec.ts`

## P35-R5. Memo proposal을 공통 result grammar로 통합

### 문제

메모 제안은 14개 input과 1541px form을 펼치며 external destination을 제공하지
않는다.

### 범위

- memo parsing 결과를 actual primary artifact preview로 먼저 표시한다.
- 전체 title과 optional first date는 compact quick value로 둔다.
- 각 row는 R2 contextual editor를 재사용한다.
- primary artifact와 eligible external destination은 R1 preflight를 재사용한다.
- save 후 R3 workspace로 이어진다.

### 비범위

- 실제 AI 생성
- crawler
- 자동 source enrichment
- memo parser 재작성

### 영향 파일

- `/flows` memo proposal presentation in `AppClient.tsx`
- R1 artifact preflight
- R2 contextual editor
- R3 receipt routing

### Rollback

memo parsing과 draft storage는 유지하고 presentation adapter만 되돌릴 수 있게 한다.

### Acceptance

- first useful preview 전 필수 입력 1개
- proposal 첫 frame text/date input 2개 이하
- row editor 1개
- 5개 count parity
- public/memo command grammar parity
- 390 screenshot `P35-R5-MEMO-PROPOSAL-390`
- E2E `p35-r5-memo-result-grammar.spec.ts`

## P35-R6. Mobile Calendar selected-day composition

### 문제

390px selected-day agenda가 월간 grid 아래에 있어 날짜와 상세 사이에 긴
스크롤이 생긴다.

### 범위

- 390px date tap은 bottom sheet agenda를 연다.
- 1024px side agenda는 유지한다.
- completion은 shared primitive를 그대로 쓴다.
- Flow open은 workspace로 이동한다.
- close/Escape 시 선택한 날짜 button으로 focus를 돌린다.

### 비범위

- undated queue
- Calendar Item full editor
- Calendar IA 변경

### 영향 파일

- `components/flow/MyFlowCalendarSurface.tsx`
- Calendar focus/navigation helper

### Rollback

viewport-specific agenda container만 교체한다.

### Acceptance

- date tap 뒤 first agenda row가 한 viewport 안에 표시
- focus trap과 return
- bottom nav overlap 0
- 1024 side agenda 회귀 0
- screenshots:
  - `P35-R6-CALENDAR-DAY-SHEET-390`
  - `P35-R6-CALENDAR-SIDE-AGENDA-1024`
- E2E `p35-r6-calendar-day-sheet.spec.ts`

## P35-R7. Final independent gate

### 범위

- 5 shapes x 3 sessions 재실행
- 390x844, 1024x768
- source/personal/run/occurrence/export parity
- overflow, fixed overlap, accessible name, focus
- public Preview direct interaction
- build, unit, targeted/full E2E, docs check

### 완료 조건

- High findings H01-H05 모두 닫힘
- Medium M01-M05 regression marker 통과
- observed-user count는 0으로 명시
- 실제 사용자 관찰 질문은 별도 보존

## 실제 사용자 관찰 전 반드시 닫을 항목

1. preview artifact와 external result parity
2. 중복 post-save receipt/4-path hub
3. contextual pre-save Item edit
4. shape-aware next unit
5. memo proposal long form
6. Item start CTA와 completion destination 일치
7. 접근 가능한 Preview의 direct smoke

## 실제 사용자에게만 확인할 질문

1. 저장 전에 어느 정도까지 Item을 고쳐야 저장할 확신이 생기는가?
2. 저장 직후 전체 Flow와 가장 가까운 실행 묶음 중 무엇을 먼저 찾는가?
3. 날짜형 Flow에서 같은 날짜 항목을 한 묶음으로 보는 것이 자연스러운가?
4. 외부로만 가져간 사용자에게 FlowMe의 실행 기록과 재사용이 재방문 이유가 되는가?
5. routine 사용자는 현재 회차, 다음 3회, 전체 series 중 무엇을 첫 화면에서 먼저 찾는가?
