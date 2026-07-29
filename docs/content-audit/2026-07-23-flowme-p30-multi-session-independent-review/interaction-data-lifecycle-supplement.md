# P30 조작 문법과 Flow 삭제·복구 보강

## 판정

현재 production은 완료, 날짜 이동, 항목 제외, Flow 보관을 각각 수행할 수 있지만 같은 객체를 조작하는 공통 문법으로 읽히지 않는다. 특히 Flow 단위의 사용자 도달 가능한 영구 삭제는 없고, `보관하기`는 Flow 상세의 마지막 `더보기` 안에 있다.

`/my?demo=ux20&view=flows`에서 직접 재현한 결과는 다음과 같다.

- 모바일 `390x844`: Flow 상세 맨 아래까지 내려가 `더보기 -> 보관하기`를 실행해야 한다.
- 보관 직후에는 8초짜리 `되돌리기` snackbar가 있다.
- snackbar가 사라진 뒤 `보관됨` 목록의 행을 눌러도 모바일 상세로 전환되지 않아 `복구하기`에 도달하지 못했다.
- 와이드 `1024x768`: 같은 보관 행은 오른쪽 상세 canvas에 표시되고, 맨 아래 `더보기 -> 복구하기`에 도달할 수 있다.
- `데이터 관리`는 백업 파일 받기/불러오기만 제공하며 Flow 삭제나 전체 데이터 초기화는 제공하지 않는다.
- source에는 `removeSavedFlow`와 `clearFlowLocalProgress`가 있지만 `removeSavedFlow`를 호출하는 UI가 없다.

따라서 이 문제는 버튼 발견성 하나가 아니라 `완료`, `제외`, `보관`, `삭제`의 상태와 복구 경로를 통일하는 lifecycle 설계 문제다.

Evidence: `current_production_interaction`, `current_source`, `fixture_only`, `heuristic_simulation`. 실제 관찰 사용자는 0명이다.

## 현재 사용자 도달 경로

| 객체와 의도 | 현재 표현 | 현재 위치 | 되돌리기 | 실제 의미 |
| --- | --- | --- | --- | --- |
| Item 실행 | `완료` / `다시 열기` | Item checkbox와 detail | 가능 | 현재 run의 실행 상태 |
| Item 일정 | 날짜 정하기 / 날짜 없애기 | Item 조정, Calendar | 가능 | 실행 날짜 projection |
| source-backed Item 구성 | `목록에서 빼기` / `복구` | Item editor, 제외됨 영역 | 가능 | 원본 삭제가 아닌 개인 사본 제외 |
| 개인 초안 Item 구조 | `목록에서 빼기` / 복구 | Item editor, 삭제된 항목 상태 | 가능 | 개인 초안의 구조 변경 |
| 확인 항목·자료 | 모두 `목록에서 빼기` | 세부 편집 | 일부 가능 | subcheck/resource 가시성 변경 |
| Flow 활성 목록 | `보관하기` / `복구하기` | 상세 최하단 `더보기` | 8초 undo, 이후 보관 목록 | 개인 실행 공간에서 숨김/복귀 |
| Flow 영구 삭제 | 사용자 UI 없음 | 없음 | 없음 | source의 미연결 함수만 존재 |
| 브라우저 데이터 | 백업/불러오기 | 상단 `데이터 관리` | 파일 기반 | 삭제·초기화 기능 아님 |

같은 `목록에서 빼기`가 source-backed Item의 개인 제외, 개인 초안 Item의 구조 삭제, subcheck, resource에 사용된다. 반대로 Flow는 `삭제` 대신 `보관`만 제공하지만 그 차이를 사용자가 미리 알 수 없다.

## 직접 재현한 단절

### H-08 Flow lifecycle의 모바일 복구 경로가 끊긴다

- Route: `/my?demo=ux20&view=flows`
- Viewport: `390x844`, 비교 `1024x768`
- 재현:
  1. Flow 목록에서 `결혼 준비 타임라인`을 연다.
  2. 상세 맨 아래까지 내려가 `더보기 -> 보관하기`를 누른다.
  3. `되돌리기` snackbar가 사라질 때까지 기다린다.
  4. `보관됨` filter에서 Flow 행을 누른다.
- 기대: 행 자체에서 복구하거나 복구 가능한 상세로 이동한다.
- 실제: 모바일은 같은 목록에 머물고 복구 action이 나타나지 않는다. 와이드는 오른쪽 상세와 `복구하기` menu가 나타난다.
- 사용자 영향: 모바일에서 잠깐의 undo 시간을 놓치면 자신이 숨긴 Flow를 제품 UI로 복구할 수 없다.
- 권장 변경: 보관 행마다 직접 `복구` action을 제공하고, 모바일/와이드 모두 같은 lifecycle entry를 사용한다.
- Evidence: `current_production_interaction`, `current_source`, `fixture_only`.

관련 source:

- `components/flow/AppClient.tsx:5739-5750`: active workspace에서 archived slug를 제외하고 선택을 `all`로 되돌린다.
- `components/flow/AppClient.tsx:7450-7480`: 보관 목록과 wide 기본 선택은 별도로 계산된다.
- `components/flow/AppClient.tsx:14673-14681`: 모바일 보관 행은 selected slug만 설정한다.
- `components/flow/AppClient.tsx:14969-15000`: 복구는 상세 최하단 관리 menu에만 있다.

### H-09 조작 이름과 데이터 의미가 일치하지 않는다

- Routes: `/my`, `/calendar`, 개인 초안 item editor
- Viewport: `390x844`, `1024x768`
- 기대: 동작 이름만 보고 실행 상태, 일정, Flow 구성, 삭제 중 무엇이 바뀌는지 예측할 수 있다.
- 실제: `목록에서 빼기`가 서로 다른 네 종류의 객체에 쓰이고, Flow-level 삭제는 없으며 보관과 완료의 관계도 한 관리 체계로 보이지 않는다.
- 사용자 영향: 원본이 지워지는지, 개인 사본에서만 빠지는지, 다시 복구할 수 있는지 실행 전에 판단하기 어렵다.
- 권장 변경: 객체와 상태 축별로 동사를 고정하고 danger 수준을 분리한다.
- Evidence: `current_source`, `current_production_interaction`, `heuristic_simulation`.

## 권장 공통 조작 문법

| 상태 축 | 사용자 동사 | 적용 객체 | 기본 위치 | 복구 |
| --- | --- | --- | --- | --- |
| 실행 | `완료` / `다시 열기` | occurrence 또는 Item | row의 checkbox | 같은 위치에서 즉시 |
| 일정 | `날짜 정하기` / `날짜 없애기` | Item occurrence | quick edit, Calendar placement | undo 또는 같은 editor |
| 개인 구성 | `Flow에서 제외` / `다시 포함` | source-backed Item | Item menu, 제외된 항목 | 제외된 항목 section |
| 개인 초안 구조 | `항목 삭제` / `항목 복구` | 개인 draft Item | Item menu, 삭제된 항목 | 삭제된 항목 section |
| 자료 구성 | `자료 숨기기` / `다시 보이기` | resource | resource menu | 숨긴 자료 section |
| Flow 수명주기 | `보관` / `복구` | 저장한 개인 Flow | workspace header menu, 보관 목록 row | 보관 목록의 직접 action |
| 영구 제거 | `이 기기에서 영구 삭제` | 보관된 개인 Flow | 보관된 Flow의 danger zone | 기본적으로 불가 |

Calendar item detail에서는 완료와 일정만 다룬다. Flow 보관·삭제는 Calendar에 중복하지 않고 `Flow에서 열기`로 My Flow의 canonical lifecycle surface에 연결한다.

## Flow 영구 삭제 계약

영구 삭제 UI를 기존 `removeSavedFlow`에 바로 연결하면 안 된다. 먼저 다음 계약을 고정해야 한다.

### source-backed Flow

- 공개 source와 원본 Flow 콘텐츠는 삭제하지 않는다.
- 이 브라우저의 저장 관계, 완료 상태, 개인 날짜·제목·메모, personal overlay, run history, 회고와 export preference를 삭제 대상으로 명시한다.
- archive lifecycle의 slug도 함께 제거해 ghost archived row를 남기지 않는다.
- 삭제 후 같은 public Flow를 다시 저장하면 새 개인 실행으로 시작한다.

### 개인 draft Flow

- draft 원문, 개인 구조, 삭제 tombstone, 실행 기록을 모두 삭제할지 확인문에 명시한다.
- source-backed Flow와 다른 문구를 사용한다.

### UI 위치

- 활성 Flow: `보관`만 제공한다.
- 보관된 Flow: 행에 `복구`, overflow의 danger group에 `이 기기에서 영구 삭제`.
- 확인 dialog: Flow 제목, 지워질 데이터, 공개 원본 보존 여부, 복구 불가를 실제 문장으로 보여준다.
- 데이터 관리: `Flow별 보관함 관리` 진입과 `백업 먼저 받기`를 제공할 수 있지만 삭제를 백업 action과 같은 우선순위로 두지 않는다.

## P31 반영

### P31-03 My Flow

- dedicated mobile workspace header에 `더보기`를 고정한다.
- active Flow의 lifecycle action은 `보관`, archived row의 primary recovery는 `복구`.
- mobile/wide가 같은 selection과 restore contract를 사용한다.
- Item 동사는 실행, 일정, 개인 구성, 개인 초안 구조로 분리한다.
- `목록에서 빼기`를 ownership별 명확한 동사로 교체한다.

### P31-05 Final gate

- Flow delete storage contract와 `clearFlowLocalProgress` 범위를 테스트로 고정한다.
- archive -> reload -> archived filter -> restore를 `390`과 `1024`에서 검증한다.
- 영구 삭제 -> reload 후 saved membership, personal overlay, run, archive slug가 남지 않는지 확인한다.
- source-backed 공개 Flow는 계속 발견 가능해야 한다.
- destructive action에 accessible name, confirmation focus trap, cancel focus return을 검증한다.

## Acceptance marker

- `P31-03-FLOW-LIFECYCLE-GRAMMAR`
- `P31-03-ARCHIVE-RESTORE-PARITY`
- `P31-03-MOBILE-ARCHIVED-DIRECT-RESTORE`
- `P31-05-PERMANENT-DELETE-CONTRACT`
- Screenshot: `P31-03-active-flow-management-390.png`
- Screenshot: `P31-03-archived-flow-direct-restore-390.png`
- Screenshot: `P31-03-archived-flow-restore-1024.png`
- Screenshot: `P31-05-permanent-delete-confirmation-390.png`
- E2E: archive -> undo, archive -> reload -> restore, delete -> reload, source rediscovery

## 현재 evidence

- [모바일 Flow 관리 menu](./screenshots/mobile-feedback/mobile-flow-management-menu-390.png)
- [모바일 보관 목록의 복구 action 부재](./screenshots/mobile-feedback/mobile-archived-flow-no-restore-390.png)
- [와이드 보관 Flow 복구 menu](./screenshots/mobile-feedback/wide-archived-flow-restore-menu-1024.png)
- [백업만 제공하는 데이터 관리](./screenshots/mobile-feedback/mobile-data-manager-backup-only-390.png)
- [구조화 evidence](./interaction-data-lifecycle-evidence.json)

앱 코드는 변경하지 않았다. 이 결과는 production interaction과 source inspection에 근거한 내부 검토이며 실제 사용자 검증이 아니다.
