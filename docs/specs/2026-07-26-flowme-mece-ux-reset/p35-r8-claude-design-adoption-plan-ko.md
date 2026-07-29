# FlowMe P35-R8 이후 Claude Design 제안 수용 개발 계획

- 작성일: 2026-07-28
- 상태: 개발 착수 전 승인 계획
- 기준 작업트리: `D:\flowme2605\flow-p35-mece-ux-reset`
- 기준 HEAD: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 현재 구현 상태: P35-01~08 및 P35-R0~R7 로컬 미커밋
- 현재 판정: `block_publish`
- observed-user count: `0`
- 이번 문서 작성으로 앱 코드는 변경하지 않는다.

## 1. 결정

Claude Design의 최신 제안을 시각 참고 수준에만 두지 않고, P35 후속 개발의 주요
구성 원칙으로 적극 수용한다.

다만 Claude Design 검토는 현재 R7 Preview를 직접 조작하지 못하고 패키지 캡처를
기준으로 작성됐다. 현재 로컬 production build를 직접 조작한 Codex 검토에서 반복
Flow 실행 중단 문제가 확인됐으므로, 다음 원칙으로 실행 순서를 조정한다.

1. correctness와 artifact 의미 연속성을 먼저 고친다.
2. 그 위에 Claude Design의 공통 실행 행, 중복 제거, shape별 표현을 적용한다.
3. wide composition과 Calendar+Todo 대안은 안정된 공통 문법 위에서 검증한다.
4. `내 Flow`를 곧바로 `할 일`로 교체하지 않는다.
5. 먼저 기존 `/my` 안에서 교차 Flow Todo projection을 실험한 뒤 전역 IA 변경을
   별도 승인한다.

최종 방향은 다음과 같다.

> Flow 찾기와 Flow 상세은 FlowMe의 원문·전체 계획·출처 의미를 보존한다.
> Todo와 Calendar는 같은 개인 Item을 읽는 익숙한 실행 surface로 단순화한다.
> Routine, Sheet, Memo의 고유 의미는 Flow 상세에서 보존한다.

## 2. 정본 자료

### 현재 구현과 correctness

1. `docs/content-audit/2026-07-28-p35-r7-independent-review-codex/README.md`
2. `docs/content-audit/2026-07-28-p35-r7-independent-review-codex/next-program.md`
3. `docs/content-audit/2026-07-27-p35-r7-bounded-revision-final-gate/README.md`
4. `docs/specs/2026-07-26-flowme-mece-ux-reset/p35-bounded-revision-developer-handoff-ko.md`

### Claude Design 제안

1. `D:\flowme2605\flow-mvp\claude_work\디자인 판정 및 구현 우선순위_0728_1014.zip`
2. ZIP 내부 `FlowMe P35-R7 독립 검토.dc.html`
3. ZIP 내부 `FlowMe Calendar Todo 단순화 UX 비교안.dc.html`
4. ZIP 내부 `FlowMe P35 독립 검토.dc.html`

### 현재 기준

1. `AGENTS.md`
2. `agent.md`
3. `docs/PRODUCT_PRINCIPLES.md`
4. `docs/SERVICE_STRUCTURE.md`
5. `docs/DECISIONS.md`

근거 우선순위는 다음과 같다.

1. current local browser interaction
2. current source
3. current automated test
4. current package screenshot
5. Claude Design proposal
6. reference pattern

## 3. 유지할 P35 기반

다음은 다시 열지 않는다.

- `Flow 찾기 / Calendar / My Flow` 3개 전역 진입
- public Flow의 result-first 첫 화면
- 한 번에 한 종류만 여는 저장 전 조정
- 저장 전 실제 artifact와 개수 확인
- 짧은 saved receipt
- My Flow library와 선택한 한 Flow의 focused workspace 분리
- Calendar를 날짜가 있는 개인 Item의 lens로 사용하는 원칙
- export의 `범위 -> 개수 -> 형식 -> receipt` 순서
- 콘텐츠별 primary artifact 1개와 의미 있는 secondary artifact 최대 2개
- source, published Flow, personal overlay, structural overlay, execution run,
  recurrence series/occurrence, export identity 분리
- 기존 localStorage 데이터와 개인 기록 보존

## 4. 적극 수용할 Claude Design 제안

### 4.1 하나의 실행 행 문법

모든 실행 행은 다음 slot 순서를 공유한다.

1. 날짜, 단계 또는 순서 표시
2. Item 제목
3. 보조 정보 한 줄
4. 선택적 상태 표시
5. 저장 후 실행 화면에서만 완료 checkbox

규칙:

- public preview에는 완료 checkbox를 표시하지 않는다.
- public preview의 사각형 장식은 번호, bullet 또는 guide line으로 바꾼다.
- 완료 checkbox는 저장 후 실행 행의 같은 trailing 위치에 둔다.
- 행 제목을 누르면 공통 Item detail을 연다.
- 모바일 행의 visible command는 `행 열기 + 완료` 두 개 이하로 제한한다.
- `수정`, `열기`, `메모`, `이번 회차 다시 진행`을 행에 동시에 펼치지 않는다.
- 상세 수정, 메모, 삭제, 제외, export는 Item detail 또는 Flow 상세이 소유한다.

### 4.2 한 Item에 하나의 실행 owner

- 현재 실행 묶음만 완료 checkbox를 소유한다.
- 전체 계획은 구조, 날짜 범위, 진행 위치를 보여준다.
- 같은 current group을 전체 계획에서 다시 그리지 않는다.
- 전체 계획에서 현재 묶음은 `현재 위치 · 4개`와 같은 요약 marker로 표시한다.
- 한 화면에서 같은 stable Item ID의 visible completion control은 하나만 존재한다.
- 저장 직후에는 전체 Flow 범위를 확인할 수 있어야 하므로 전체 계획 자체를
  무조건 숨기지 않는다.

### 4.3 콘텐츠 shape에 정직한 표현

- Calendar: 같은 날짜의 미완료 Item을 한 묶음으로 실행한다.
- Checklist: 날짜 없는 실행 Item을 조밀한 목록으로 보여준다.
- Routine: `반복 계획 / 이번 회차 / 지난 회차`를 분리한다.
- Sheet: `현재 행 / 다음 행 / 전체 진도표`의 순서와 현재 위치를 보존한다.
- Memo/Guide: 실행 Item과 읽을 resource를 분리한다.
- Memo가 진짜 기록이면 완료율과 checkbox를 제거한다.
- 실제 행동 목록이면 Checklist를 primary로 바꾸고 Memo를 secondary로 둔다.

### 4.4 반복과 export count

- 반복 정의와 생성 occurrence를 구분한다.
- 예: `반복 계획 1개 · 예정 회차 12개`
- receipt와 export preflight에서 같은 count 문법을 사용한다.
- ICS CTA는 파일에 들어갈 event 수를 표시한다.
- raw RRULE은 사용자 화면에 노출하지 않는다.

### 4.5 export 단순화

- 동일한 범위명과 개수를 여러 wrapper에서 반복하지 않는다.
- 한 summary에서 `전체 Flow · 24개 · 날짜 있음 24개`를 보여준다.
- 그 아래에는 실제 format 선택만 둔다.
- `내 버전`처럼 목적이 불분명한 단독 버튼은 제거한다.
- 필요하면 `내가 조정한 값으로 보기`를 범위 summary 안의 상태로 통합한다.
- 한 Item Flow에는 `전체 0/1 완료` progress bar를 만들지 않는다.

### 4.6 wide composition

1024px 이상에서는 모바일을 늘리지 않고 다음 구조를 사용한다.

- 왼쪽: Flow library rail
- 가운데: 현재 실행 묶음과 전체 계획
- 오른쪽 inspector:
  - 진행 요약
  - 가져가기
  - 기록
  - 반복 설정
  - Flow 관리

오른쪽 inspector는 항상 모든 명령을 펼치는 패널이 아니다. 현재 선택과 콘텐츠
shape에 필요한 영역만 보여준다.

### 4.7 Todo와 Calendar를 실행 surface로 활용

Claude Design의 `adapt_as_execution_surfaces` 판정을 채택 후보로 둔다.

- Flow 찾기: 무엇을 가져올지 결정
- Todo projection: 지금 무엇을 할지 결정
- Calendar: 언제 무엇이 있는지 확인
- Flow 상세: 전체 계획, source, 순서, 진도, 반복, 관리
- Item detail: 한 Item 실행과 수정

단, 전역 탭 교체 전에 기존 `/my` 안에 교차 Flow Todo 목록을 bounded experiment로
추가한다.

## 5. 수정해서 수용할 제안

### 5.1 public preview marker

Claude 보고서는 public 사각형을 포함 여부 checkbox로 해석했지만 현재 source에서는
`aria-hidden` 장식이다. 따라서 새로운 제외 toggle을 즉시 만들지 않는다.

- public 기본 상태: 중립 marker
- 조정 mode: 기존 포함/제외 control 유지
- 저장 후 실행 상태: 실제 완료 checkbox

### 5.2 전체 계획 접힘

Claude의 `전체 계획 기본 접힘`은 화면 중복을 줄이는 데 유효하지만, 저장 직후 전체
결과 확인을 약하게 만들 수 있다.

우선 적용:

- current group의 중복 행 제거
- 전체 계획 header에서 범위와 current 위치 표시
- receipt에서 전체 항목과 날짜 범위 유지

접힘 기본값은 390px screenshot 비교 후 결정한다.

### 5.3 Memo

시각 요소만 제거하지 않는다. 대표 콘텐츠 `overseas-safety-register`에 대해 다음 중
하나를 먼저 선택한다.

- A: 실행 행동이 중심이면 Checklist primary + Memo secondary
- B: 읽기와 기록이 중심이면 Memo primary + 완료 control 제거

한 콘텐츠가 public에서는 Memo이고 saved workspace에서는 Todo가 되는 상태는
허용하지 않는다.

### 5.4 날짜 축과 하단 nav

Claude 캡처에서 제기한 다음 항목은 구현 전 재현한다.

- public preview와 saved workspace의 7일 날짜 차이
- fixed bottom navigation이 마지막 행을 가리는 문제

캡처 시점 차이 또는 report crop이면 backlog에서 제거한다. 실제 재현되면 해당
slice의 acceptance에 포함한다.

## 6. 개발 프로그램

각 slice는 이전 slice가 acceptance를 통과한 뒤 시작한다.

| 순서 | Slice | 목표 | 주요 Claude 제안 | 선행 |
| --- | --- | --- | --- | --- |
| 1 | `P35-R8A` | 반복 다음 회차 correctness | Routine count와 hierarchy 기반 | 없음 |
| 2 | `P35-R8B` | artifact 의미 연속성 | Memo/Checklist shape honesty | R8A |
| 3 | `P35-R8C` | 한 Item에 하나의 실행 owner | current/whole 중복 제거 | R8B |
| 4 | `P35-R9` | 공통 실행 행 문법 | row anatomy와 command 축소 | R8C |
| 5 | `P35-R10` | shape·export 표현 정리 | count, wrapper, orphan command 제거 | R9 |
| 6 | `P35-R11` | wide composition과 Routine hierarchy | canvas/inspector, 3단 Routine | R10 |
| 7 | `P35-R12` | Todo/Calendar bounded experiment | execution surface A안 | R11 |
| 8 | `P35-R13` | 통합 회귀와 내부 final gate | 전체 continuity | R12 |

## 7. Slice 상세

## P35-R8A. Routine execution continuity

### 문제

월·수·금 계속 반복 Flow에서 첫 회차를 완료하면 다음 회차가 실제로 존재해도
`남은 회차가 없습니다.`가 표시된다.

### 범위

- 다음 open occurrence selector
- finite count/end date 종료 조건
- 완료와 다시 열기
- receipt의 series-aware summary
- export의 series/occurrence count

### 비범위

- recurrence schema migration
- occurrence identity 변경
- Calendar IA 변경
- 운동 기록 기능

### Acceptance

- 시작일 `2026-08-03`, 월·수·금, 계속 반복
- `2026-08-03` 완료 후 `2026-08-05`가 즉시 표시됨
- 완료 취소 시 같은 occurrence ID가 복구됨
- 종료 조건 도달 전에는 종료 문구가 없음
- receipt: `반복 계획 1개`
- export preflight: 실제 생성 event 수 표시
- 390x844, 1024x768
- 관련 unit, targeted E2E, build 통과

### Marker

- `P35-R8A-ROUTINE-NEXT-OCCURRENCE`
- `P35-R8A-SERIES-OCCURRENCE-COUNT`

## P35-R8B. Artifact semantic continuity

### 범위

- `overseas-safety-register` primary/secondary 결정
- public, receipt, workspace, export의 noun과 command 통일
- Memo mode의 progress/checkbox 제거 또는 Checklist primary 전환
- resource와 실행 Item 분리

### Acceptance

- 같은 Flow가 surface마다 같은 artifact 의미를 유지함
- Memo mode면 완료율과 checkbox가 없음
- Checklist mode면 public부터 실행 항목으로 보임
- secondary export의 손실과 count를 실행 전 확인 가능

### Marker

- `P35-R8B-ARTIFACT-SEMANTIC-CONTINUITY`

## P35-R8C. Single execution owner

### 범위

- current group과 whole-plan 중복 suppression
- whole-plan current marker
- progress denominator 통일
- 완료, 다시 열기, undo regression

### Acceptance

- 첫 viewport에서 stable Item 하나당 visible completion control 하나
- 전체 계획에서 전체 날짜 구조와 현재 위치를 확인 가능
- `현재 묶음 4개 · 전체 24개 중 0개 완료`처럼 분모가 명확함
- 완료와 다시 열기가 같은 위치와 Item identity를 사용함

### Marker

- `P35-R8C-SINGLE-COMPLETION-OWNER`

## P35-R9. Shared execution row grammar

### 범위

- 다섯 shape가 공유하는 presentation row 또는 동일 slot contract
- public neutral marker
- saved trailing completion
- title tap으로 공통 Item detail 진입
- inline command 제거
- 긴 제목 word-break
- Item detail visible close 하나

### 비범위

- storage 변경
- artifact recommendation 변경
- 전역 IA 변경
- whole Flow renderer 재작성

### Acceptance

- public preview completion control `0`
- saved row completion control `1`
- 모바일 row의 visible interaction `2` 이하
- 다섯 shape의 trailing checkbox x-coordinate 일치
- keyboard로 row와 checkbox를 각각 식별 가능
- accessible name, focus return, Escape 통과

### Marker

- `P35-R9-SHARED-EXECUTION-ROW`
- `P35-R9-PREVIEW-NOT-COMPLETION`
- `P35-R9-DETAIL-SINGLE-CLOSE`

## P35-R10. Shape honesty and export simplification

### 범위

- Routine `계획 1개 · 생성 N건`
- Memo/Guide header와 진행 표현
- Sheet current/next/whole label
- export summary 중복 제거
- `내 버전` 제거 또는 상태 통합
- 한 Item progress bar 제거
- 반복 날짜와 그룹 날짜의 중복 표기 제거
- 60 Flow 상태 filter에서 `루틴` 제거

### Acceptance

- export 숫자는 summary 1회와 format별 결과 count에만 표시
- format CTA의 count가 실제 파일 행/event 수와 일치
- 상태 filter가 lifecycle 한 축으로 구성됨
- 다섯 shape에서 내부 taxonomy와 raw recurrence가 노출되지 않음

### Marker

- `P35-R10-SHAPE-HONESTY`
- `P35-R10-EXPORT-SUMMARY-ONE-OWNER`
- `P35-R10-LIBRARY-FILTER-ONE-AXIS`

## P35-R11. Wide workspace composition

### 범위

- 1024/1440 rail, execution canvas, inspector
- inspector의 contextual section
- Routine `반복 계획 / 이번 회차 / 지난 회차`
- mobile 순서와 wide hierarchy parity

### 비범위

- 새 기록 기능
- 새 analytics
- 60개 초과 taxonomy
- 데이터 migration

### Acceptance

- 1024/1440이 늘어난 모바일 1열처럼 보이지 않음
- execution canvas 첫 화면에 현재 실행 묶음이 우선
- inspector는 현재 context에 필요한 명령만 표시
- 같은 occurrence가 완료와 미완료로 동시에 표시되지 않음
- 390에서는 동일 정보가 실행 -> 전체 계획 -> inspector 정보 순으로 이어짐

### Marker

- `P35-R11-WIDE-EXECUTION-INSPECTOR`
- `P35-R11-ROUTINE-SERIES-CURRENT-HISTORY`

## P35-R12. Todo/Calendar bounded experiment

### 목표

`Flow 찾기 / 할 일 / Calendar` 대안을 전역 IA 변경 없이 검증한다.

### 1단계 범위

- 기존 `/my` 안에 교차 Flow Todo projection 추가
- 그룹:
  - 오늘
  - 예정
  - 날짜 없음
  - 완료
- 기존 Item identity와 completion/date overlay 재사용
- Routine은 이번 occurrence만 노출
- Sheet는 현재 행 또는 현재 단원만 노출
- resource는 Todo 행으로 만들지 않음
- Flow별 보기와 원본 Flow 열기

### 2단계 범위

- Todo, Calendar, Flow 상세이 같은 Item detail을 열도록 통합
- 날짜 지정 시 Todo의 예정과 Calendar에 동시에 반영
- 날짜 제거 시 Calendar에서 빠지고 Todo의 날짜 없음으로 복귀

### 비범위

- 전역 탭 이름 교체
- `/my` library 삭제
- 독립 Calendar Item 생성
- priority, tag, reminder, nested task
- drag-and-drop scheduling
- full planner 기능

### Acceptance

- 다섯 shape에서 빈 그룹 때문에 화면이 깨지지 않음
- Routine은 이번 occurrence 한 건만 노출
- Sheet 순서와 현재 위치가 Flow 상세에서 보존됨
- resource는 Todo 행이 아님
- Todo와 Calendar가 같은 stable Item ID와 완료 상태를 읽음
- 날짜 지정/제거 왕복 후 사본이나 ghost event가 생기지 않음
- 390에서 실행 행이 조밀하고 overflow가 없음

### 전역 IA 변경 gate

다음 조건을 모두 충족한 경우에만 `My Flow -> 할 일` 전역 탭 교체를 별도 승인한다.

1. 여러 Flow의 Item을 한 목록에서 보는 것이 유용하다는 owner 판단
2. Routine과 Sheet의 의미 손실 없음
3. Flow library와 관리 진입이 숨지 않음
4. `/flows -> public -> save -> Todo -> Flow detail` 경로가 설명 없이 이어짐
5. 기존 `/my`를 복구할 rollback이 있음

### Marker

- `P35-R12-CROSS-FLOW-TODO-EXPERIMENT`
- `P35-R12-TODO-CALENDAR-SAME-ITEM`
- `P35-R12-DATE-REMOVE-RETURNS-UNDATED`

## P35-R13. Final internal gate

### Owner 승인안

- B안의 cross-Flow `할 일`을 My Flow 기본 내부 보기로 채택한다.
- Flow library와 focused Flow workspace는 유지한다.
- 실행 목록은 A안의 정확한 날짜별 rail을 사용한다.
- 기본 Item 행은 row-open + trailing completion만 노출한다.
- 모바일 전체 계획은 public saved receipt의 첫 진입에서만 자동으로 펼치고,
  reload와 library 재진입에서는 접는다.
- rollback query `experiment=off`는 최종 publish 판단 전까지 유지한다.

### 재현 콘텐츠

1. 이사 D-30
2. 날짜 없는 차량 점검
3. 반복 홈트
4. 중학교 수학 진도
5. 해외여행 안전 Guide
6. 개인 여행 메모

### 세션

1. 발견 -> 전체 결과 -> 조정 -> 저장 또는 가져가기
2. receipt -> 실행 -> 완료 -> 다시 열기 -> 수정
3. 기록 -> 전체/선택/현재 export -> 새 실행으로 재사용

### Viewport

- 390x844
- 1024x768
- 1440x900

### 검사

- horizontal overflow
- fixed UI overlap
- keyboard focus order
- focus trap과 focus return
- accessible name
- console/page error
- title/date/count/stable identity parity
- completion/reopen parity
- series/occurrence parity
- export event/row count parity
- reload persistence
- localStorage backup/restore

### 명령

```powershell
npm.cmd run docs:check
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e -- <P35 targeted specs>
npm.cmd run test:e2e
git diff --check
```

### 최종 판정

- `publish_ready`
- `bounded_fix_before_publish`
- `block_publish`

자동화와 agent simulation은 실제 사용자 검증이 아니다. observed-user count는 계속
`0`으로 기록한다.

## 8. 제거·보류 목록

### 제거

- 실행 행의 중복 `수정 / 열기 / 메모 / 다시 진행`
- 같은 Item의 중복 checkbox
- export wrapper label 반복
- 의미 없는 `내 버전`
- 한 Item Flow의 progress bar
- 그룹 header가 이미 소유한 날짜의 행별 반복
- Flow rail의 네 번째 설명 줄
- 상태 filter 안의 content shape 값

### 보류

- 전역 `My Flow -> 할 일` 교체
- `/my` library 제거
- Calendar drag scheduling
- Calendar 다중 Flow 기능 확장
- 회고 입력 신규 기능
- 60개 초과 Flow taxonomy
- account, DB, cloud sync
- AI/crawler
- OAuth 직접 연동

## 9. 데이터와 migration

P35-R8A~R12는 원칙적으로 presentation, projection selector, interaction composition
변경이다.

다음은 변경하지 않는다.

- storage schema
- canonical Flow identity
- personal overlay key
- execution run identity
- occurrence identity
- export identity
- 기존 완료, 메모, 날짜 override

새 projection helper가 필요하면 기존 저장값을 읽는 pure selector로 추가한다.
migration이 필요해지는 제안은 해당 slice에서 중단하고 별도 승인받는다.

## 10. Rollback 원칙

- R8A: next-occurrence selector 사용만 되돌림
- R8B: artifact recommendation/presentation mapping만 되돌림
- R8C: duplicate suppression만 되돌림
- R9: shared row presentation component만 되돌림
- R10: shape formatter와 export summary만 되돌림
- R11: wide layout composition만 되돌림
- R12: experimental Todo projection을 숨기고 기존 `/my` 유지

rollback은 사용자 데이터 삭제나 migration 역변환을 요구하지 않아야 한다.

## 11. 개발 실행 규칙

1. 한 번에 한 slice만 구현한다.
2. 이전 slice의 marker, screenshot, targeted test를 확인한다.
3. 기존 dirty worktree의 사용자 변경을 보존한다.
4. 지운 명령을 다른 메뉴에 그대로 옮겨 복잡도를 유지하지 않는다.
5. 새 설명문으로 hierarchy 문제를 덮지 않는다.
6. Claude wireframe의 외형보다 해결하려는 사용자 문제를 우선한다.
7. current source와 wireframe이 충돌하면 current contract를 확인한 뒤 조정한다.
8. commit, push, PR, merge, deploy는 별도 요청 전에는 하지 않는다.
9. 각 slice 완료 후 변경 파일, 테스트, screenshot, 미검증 gap, publish 상태를
   보고하고 멈춘다.

## 12. 첫 개발 `/goal`

```text
FlowMe P35-R8A Routine execution continuity만 구현해줘.

작업 위치:
D:\flowme2605\flow-p35-mece-ux-reset

먼저 읽을 자료:
1. AGENTS.md
2. agent.md
3. docs/specs/2026-07-26-flowme-mece-ux-reset/p35-r8-claude-design-adoption-plan-ko.md
4. docs/content-audit/2026-07-28-p35-r7-independent-review-codex/README.md
5. docs/content-audit/2026-07-28-p35-r7-independent-review-codex/next-program.md
6. docs/content-audit/2026-07-27-p35-r7-bounded-revision-final-gate/README.md
7. components/flow/AppClient.tsx의 occurrence projection과 routine workspace
8. recurrence projection 관련 unit test
9. tests/e2e/p35-r4-shape-aware-workspace.spec.ts
10. tests/e2e/p35-r7-bounded-revision-final-gate.spec.ts

확인된 blocker:
- 월·수·금 계속 반복 Flow를 2026-08-03에 시작한다.
- 첫 회차 2026-08-03을 완료한다.
- 실제 다음 회차 2026-08-05가 있는데도 `남은 회차가 없습니다.`가 표시된다.

목표:
- series가 유효한 동안 다음 open occurrence 한 건을 안정적으로 표시한다.
- finite count/end date에 실제로 도달했을 때만 종료 문구를 표시한다.
- receipt와 export에서 반복 계획 수와 생성 occurrence 수를 구분한다.

범위:
- next open occurrence selector
- series 종료 조건
- 첫 occurrence 완료와 다시 열기
- routine receipt/export count presentation
- unit, targeted E2E, 390/1024 screenshot

비범위:
- storage 또는 recurrence schema migration
- occurrence identity 변경
- Calendar IA 변경
- 다른 artifact recommendation 변경
- 운동 기록 기능
- Claude 행 문법 R9 선행 구현
- commit, push, PR, merge, deploy

데이터 원칙:
- source, personal overlay, execution run, recurrence series/occurrence,
  export identity를 유지한다.
- 기존 완료 기록과 날짜 override를 다시 쓰지 않는다.

Acceptance:
1. 2026-08-03 완료 후 2026-08-05가 즉시 표시된다.
2. 완료 취소 후 같은 occurrence ID와 날짜가 복구된다.
3. finite count/end date 종료 전에는 종료 문구가 표시되지 않는다.
4. receipt에서 반복 계획 1개와 예정 회차를 구분한다.
5. export preflight에서 실제 파일에 들어갈 occurrence 수를 확인할 수 있다.
6. 390x844과 1024x768 screenshot을 남긴다.
7. 관련 unit, targeted E2E, build를 통과한다.
8. 기존 dirty 변경을 보존한다.

완료 후 변경 파일, 테스트 결과, screenshot marker, 미검증 gap, publish 상태를
보고하고 다음 slice를 시작하지 마라.
```
