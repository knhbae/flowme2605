# P26-11 audit

## 원인

개인 draft의 add/delete/restore/reorder와 여러 항목 날짜 조정이 전체 Flow의 읽기·실행 surface에 함께 노출됐다. 한 행에 완료, 열기, 수정, 삭제, 이동이 모두 나타날 수 있어 사용자가 지금 실행하는지 목록 구조를 고치는지 구분하기 어려웠다. 또한 날짜별·단계별 읽기 그룹 안에서 이동 control을 쓰면 개인 전체 순서가 화면상 순서와 다르게 보일 수 있었다.

## 구현

### 명시적인 구성 편집 모드

- 개인 draft whole-Flow header에만 `구성 편집` toggle을 둔다.
- 편집 중에는 adaptive reading group을 개인 effective order의 단일 `할 일 순서` 목록으로 바꾼다.
- 이 목록에는 선택 checkbox, effective 제목/날짜, 소유권 badge, 위/아래 이동만 둔다.
- 완료 checkbox와 상세 `열기`는 구성 편집 중 렌더링하지 않는다.
- 빈 draft에서도 toggle과 `할 일 추가`는 남아 다시 구성할 수 있다.

### 여러 항목 도구

- 선택 개수는 `role=status`, `aria-live=polite`로 알린다.
- 날짜 필드는 기본 toolbar에서 분리하고 `날짜`를 눌렀을 때만 연다.
- 목록에서 빼기는 선택 개수와 복구 가능성을 확인하는 destructive confirmation을 거친다.
- 삭제 직후 undo와 reload 이후 persistent recovery를 모두 유지한다.

### 반응형 배치

- 390px: `fixed-above-nav`, 4탭 위 고정, 본문 하단 여백 확보
- 1024px: `inline`, Flow workspace 안에서 목록과 같은 폭 사용
- drag-and-drop은 추가하지 않고 keyboard 가능한 위/아래 버튼을 유지한다.

## 소유권과 projection

- source Item과 source order는 변경하지 않는다.
- user-created Item은 stable personal ID와 `user_created` 소유권을 유지한다.
- 삭제는 tombstone, 복구는 tombstone 해제, 순서는 `orderOverride`로 저장한다.
- completion/run state는 structural overlay에 복사하지 않는다.
- checklist export는 구성 편집 종료 후 effective item 순서를 읽는다.
- storage schema와 Calendar/ICS/list-export builder 계약은 변경하지 않았다.

## 재현과 결과

| route | viewport | 재현 | 결과 | evidenceKind |
| --- | --- | --- | --- | --- |
| `/flows` miss -> `/my?view=flows` | 390x844 | 3개 draft 저장, 구성 편집 | 일반 모드 구조 control 0, 편집 모드 실행 control 0 | `current_browser` |
| `/my?view=flows` | 390x844 | 항목 추가, 키보드 위 이동, 선택 | stable personal ID, 순서 변경, live 선택 개수 유지 | `current_browser` |
| `/my?view=flows` | 390x844 | 목록에서 빼기, 즉시 undo | confirmation과 같은 stable ID 복구 | `current_browser` |
| `/my?view=flows` | 390x844 | source 항목 제거, reload, 영구 복구 | tombstone 유지 후 원래 stable ID로 복구 | `current_browser` |
| `/my?view=flows` | 1024x768 | 구성 편집 | inline toolbar, source/user 혼합 단일 순서 목록 | `current_browser` |
| `/my?demo=source-backed` | 390x844 | source-backed Flow 전체 보기 | 구성 편집 toggle/control 0 | `current_browser` |

## 접근성

- 구성 편집 toggle은 `aria-pressed` 상태를 갖는다.
- 선택 checkbox의 이름에는 effective 할 일 제목이 포함된다.
- 이동 버튼 accessible name에는 제목과 이동 방향이 포함되고 첫/마지막 불가능 방향은 disabled다.
- Enter로 순서 이동, Space로 영구 복구를 확인했다.
- 선택 개수는 live region으로 갱신된다.

## 검증 경계

자동 브라우저 검증은 mode separation, persistence, stable ID, projection order, viewport overflow를 증명한다. 실제 사용자가 `구성 편집` 이름을 설명 없이 찾는지, 고정 toolbar와 복구 정책을 자연스럽게 이해하는지는 아직 증명하지 않는다. observed-user session은 `0`이다.

## 남은 위험

1. source-backed Flow의 구조 변경은 계속 의도적으로 막혀 있으며, 사용자가 이를 제한으로 느끼는지는 관찰 전 확정할 수 없다.
2. 여러 항목 날짜 이동의 기준일 연결 정책은 P26-14에서 Calendar placement와 함께 재검토한다.
3. 완료 직후 undo와 완료 목록 reopen은 P26-12에서 구조 편집과 분리된 실행 상태로 닫아야 한다.
