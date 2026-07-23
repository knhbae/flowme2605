# P30 evidence-gap backlog

## Program rule

P30은 P29를 다시 설계하거나 새 기능을 추가하는 단계가 아니다. production에서 확인된 interaction/accessibility gap과 독립 검증이 재현하지 못한 상태만 닫는다. source, personal overlay, run, occurrence, export 계약과 4탭 IA는 유지한다.

## 순서

`P30-01 -> P30-02 -> (P30-03 || P30-04) -> P30-05`

`P30-03`과 `P30-04`는 P30-02 뒤 병렬 가능하다.

## P30-01 - Mobile fixed-layer and export collision

### 문제

- `/f/moving-d30-basic`에서 export preflight를 열면 `public-flow-mobile-save-cta`가 primary Calendar export 버튼의 `top 804..844` 영역을 덮는다.
- `/my?demo=ux20&view=flows`에서 export를 열면 `platform-mobile-tabs`가 primary Calendar export 버튼의 `top 817..832` 영역을 덮는다.

### 범위

- export panel open 상태에서 fixed save CTA의 suppress/reposition 정책 확정
- My Flow bottom navigation clearance를 실제 expanded panel의 마지막 action까지 적용
- fixed layer와 primary/secondary action의 geometry audit를 nested state까지 확장

### 비범위

- export format 추가
- bottom navigation IA 변경
- persistence/schema 변경

### 영향 파일

- `components/flow/AppClient.tsx`
- `components/flow/PlatformNav.tsx`
- `components/flow/FlowExportPanel.tsx`
- `app/globals.css`
- `tests/e2e/p29-coordinated-surface-reset.spec.ts` 또는 P30 전용 spec

### 완료 기준

- 390x844 public/My Flow export open 상태의 fixed-primary intersection `0`
- primary export action을 추가 scroll 없이 온전히 읽고 누를 수 있음
- save CTA 또는 nav를 숨길 경우 닫은 뒤 원래 상태와 focus가 복구됨
- 1024/1440 layout 변화 없음

## P30-02 - Mobile keyboard focus order

### 문제

`/my`와 `/calendar`에서 `FLOW -> 보조 메뉴 -> 화면 하단 4탭 -> 본문 상단 control` 순으로 focus가 이동한다. 시각적 위치는 상단에서 하단으로 갔다가 다시 상단으로 되돌아간다.

### 범위

- desktop navigation과 mobile bottom navigation의 DOM/focus order 분리
- main workspace 진입 후 bottom navigation으로 이동하거나 명시적 skip path 제공
- focus-visible과 focus return 회귀 확인

### 비범위

- 4탭 구성 변경
- 키보드 shortcut 추가

### 완료 기준

- 390x844에서 상단 메뉴 다음 focus가 현재 화면의 핵심 workspace action으로 이동
- bottom navigation은 여전히 keyboard와 screen reader로 접근 가능
- `/my`, `/calendar`, bottom sheet open/close에서 focus loss 없음

## P30-03 - Long Flow adjustment density

### 문제

24-item moving Flow에서 조정을 열면 기본 `항목 고르기` mode가 24개 row를 즉시 펼친다. 기능은 명확하지만 빠른 제목/날짜 수정 의도에도 긴 목록이 먼저 나타난다.

### 범위

- 현재 4개 mode와 저장 계약 유지
- 첫 조정 viewport에서 선택된 mode의 목적과 변경된 수를 우선 표시
- 긴 item mode는 section grouping 또는 progressive expansion으로 24개 전체 접근을 보존
- current/proposed 390 screenshot 비교 후 적용

### 비범위

- full editor
- 새 item schema
- AI 수정

### 완료 기준

- 제목·메모 또는 날짜 조정은 24개 item을 지나지 않고 접근
- 항목 포함/제외 24개는 모두 keyboard로 접근 가능
- 저장되는 personal overlay와 order identity 변화 없음

## P30-04 - Calendar evidence and compact identity

### 문제

- `/calendar?demo=ux20`에는 undated item이 없어 요구된 tray 여정을 production fixture만으로 재현할 수 없다.
- 1024 month cell에서 `컴퓨터활용능력 1급 학습`이 4개 event에서 `컴퓨터활용능력...`로 축약된다. title/aria와 selected-day full identity는 유지되지만 시각적 비교는 제한된다.

### 범위

- production demo 또는 deterministic E2E fixture 중 하나를 공식 evidence path로 지정
- month chip은 existing marker/color와 full selected-day identity를 유지하면서 의미 보존 여부를 screenshot gate로 확인
- 새 alias를 저장하지 않고 projection 수준에서 해결 가능한 안만 검토

### 비범위

- Calendar data contract 변경
- 사용자 정의 색/alias 기능
- 외부 Calendar 연동

### 완료 기준

- undated 10개 -> 2개 배치 -> undo를 정본 gate에서 재현
- 1024에서 선택된 2개 Flow를 month cell과 selected-day에서 연결 가능
- accessible name과 title은 full identity 유지

## P30-05 - Independent nested-state final gate

### 범위

- public export open/receipt
- My Flow export open/selected/current receipt
- routine first occurrence complete/reopen
- Calendar undated sheet/batch/undo
- mobile tab focus order
- 390/1024/1440 overflow, overlap, name, console/page error

### 완료 기준

- targeted unit/E2E/build/docs 모두 pass
- production nested-state interaction failure `0`
- fixed-primary overlap `0`
- horizontal overflow `0`
- unnamed focusable `0`
- observed-user count는 계속 `0`으로 명시

## 실제 사용자에게만 확인할 질문

1. 저장 전에 24개 전체와 실제 저장 결과를 정확히 예상하는가?
2. 긴 Flow에서 `항목 고르기`, `날짜`, `제목·메모`, `순서` 중 원하는 조정을 바로 찾는가?
3. 저장 receipt를 보고 저장 성공과 다음 행동을 확신하는가?
4. 20개 이상 My Flow에서 다음 실행할 Flow를 빠르게 찾는가?
5. Calendar의 날짜 없는 queue를 오류가 아닌 배치 대기 목록으로 이해하는가?
6. primary/secondary artifact 이유와 whole/selected/current 범위를 실행 전에 예상하는가?
