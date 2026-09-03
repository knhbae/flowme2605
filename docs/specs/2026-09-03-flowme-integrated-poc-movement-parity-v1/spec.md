# FlowMe 통합 PoC 이동 방식 일치 v1 Spec

## 1. 목표

v4.1 UI, 개발 1, 개발 2의 결과물을 한 통합 PoC에서 검증할 수 있도록 이동 조작의
확실한 미충족만 닫는다. 이번 범위는 Flow 행 전용 이동 손잡이와 독립 실행형 HTML의
왼쪽 비모달 목적지 패널이다. 기존 전이·저장 모델을 재사용하고 운영 정책이나 운영
schema를 새로 정하지 않는다.

완료 시 사용자는 React PoC와 내려받아 여는 단일 HTML에서 다음을 같은 뜻으로 수행할
수 있어야 한다.

- Flow의 폴더 이동: 손잡이 짧게 누르기, 350ms 길게 누르기, 마우스 drag, `…`,
  Enter/Space
- 할 일의 날짜·폴더·같은 목록 순서 이동: 손잡이, drag, `…`, 키보드
- 현재 위치, 대상 밖, Escape, pointer cancel, blur, resize: 성공 변경 0건
- 성공 뒤 Undo와 새로고침 복구

## 2. 세 원천과 이번 연결점

| 원천 | 가져올 정본 | 이번 적용 |
| --- | --- | --- |
| v4.1 UI | 48px 손잡이, 350ms/8px, 왼쪽 목적지, 오른쪽 순서 통로, 현재 위치 중립 | React Flow 행과 독립 HTML 이동 표면 |
| 개발 1 | 기존 Flow 선택·상세·개인 사본의 폴더 소유권, 네 origin read projection | Flow 전체만 폴더 이동, Item은 부모 폴더 상속 |
| 개발 2 | 텍스트 작성→개인 Flow 저장→결과 열기, 원문 불변 | 새 작성 Flow도 같은 Flow 이동 전이를 사용 |

이번 변경은 세 원천을 새로 병합하는 데이터 migration이 아니다. 이미 통합된 read model과
shadow state 위에서 서로 다른 UI adapter를 한 계약으로 맞춘다.

## 3. 포함 범위

### 3.1 React 제품 정본

- 폴더 화면의 모든 Flow 행에 본문과 분리된 48×48px 이상 전용 손잡이를 둔다.
- 기존 Task 손잡이의 pointer lifecycle을 공용으로 사용한다.
- Flow 손잡이는 폴더 목적지만 유효하다. 날짜·순서 대상은 invalid이며 저장하지 않는다.
- 모든 성공 경로는 기존 `move-folder(member: 'saved_flow')`로 수렴한다.
- 성공한 이동만 패널을 닫는다. 같은 위치와 실패는 상태를 보여 주고 사용자가 다시
  선택할 수 있게 한다.

### 3.2 독립 실행형 단일 HTML

- 중앙 modal을 이동 용도로 쓰지 않고 왼쪽 비모달 `이동할 곳` 패널을 추가한다.
- 패널이 열린 동안 오른쪽에 원 목록과 48px 손잡이 통로를 최소 168px 남긴다.
- Flow와 Task의 손잡이·길게 누르기·`…`·키보드가 같은 패널을 연다.
- Task의 날짜·QuickItem 폴더·같은 목록 순서를 구분한다.
- Flow는 폴더만 보여 주고, Item 폴더는 부모 Flow 상속 안내만 보여 준다.
- 중앙 dialog는 빠른 할 일, 폴더 만들기, 사용 안내 같은 비이동 작업에 계속 쓴다.

### 3.3 판정과 증거

- 우선 재판정 대상: `V41-003`, `V41-007`, `V41-008`, `V41-009`, `V41-018`,
  `V41-037`, `V41-058`
- 실제 기기 증거가 필요한 `V41-066`은 자동화가 통과해도 부분 충족으로 남긴다.
- 기존 추적표의 D1/D2 판정 중 현재 구현과 모순되는 항목은 구현 대상으로 오인하지
  않도록 증거를 다시 연결한다.

## 4. 제외 범위

- `/calendar` 운영 연결, 운영 completion/editor/export/trash writer
- Flow 날짜 이동, Flow 순서 이동, Item 독립 폴더 이동
- 실제 Android Chrome, iOS Safari, screen reader 관찰
- 계정·cloud·외부 동기화·공개 후보·AI·운영 migration
- commit, push, PR, Preview, Production

## 5. 전이 계약

| 주체 | 목적지 | 전이 | 결과 |
| --- | --- | --- | --- |
| Flow | 다른 폴더 | `move-folder / saved_flow` | 변경 1, Undo 가능 |
| Flow | 현재 폴더 | 같은 전이의 no-op | 변경 0, 중립 상태 |
| Flow | 날짜·순서·대상 밖 | 전이 호출 안 함 | 변경 0, invalid/cancel |
| QuickItem | 다른 폴더 | `move-folder / quick_item` | 변경 1, Undo 가능 |
| Flow Item | 날짜 | `move-date` | 개인 실행 위치만 변경 |
| Task | 같은 목록 순서 | `reorder` | 변경 1, Undo 가능 |

Flow Item의 원본 일정과 Flow 소속은 바뀌지 않는다. Flow를 옮기면 Item은 부모 Flow의
폴더를 읽어 상속한다.

## 6. 저장 경계

- React 진입은 `/my?personalWorkspacePoc=v1` exact-query gate를 유지한다.
- PoC 쓰기는 `flow:poc:personal-workspace:v1:*`에서만 허용한다.
- 독립 HTML도 기존 PoC state와 draft key만 사용한다.
- `localStorage.clear()`는 호출하지 않는다.
- 실패 시 이전 bytes를 복구하고 성공한 state mutation은 0건이어야 한다.
- 시나리오 전후 PoC prefix 밖 `flow:*` key/value를 byte-for-byte 비교한다.

## 7. 반응형·접근성 계약

- 320×700과 필수 390×844, 375×812, 844×390, 1024×768, 1440×900에서
  가로 넘침과 가려진 핵심 행동이 없어야 한다.
- 이동 패널은 safe-area 안에서 세로로 독립 scroll된다.
- 패널 너비는 300px 이하이며 좁은 화면에서도 오른쪽 통로 168px을 남긴다.
- 손잡이는 `aria-label`, `aria-describedby`, `aria-controls`, `aria-expanded`를 가진다.
- Flow 도움말은 폴더만 이동하고 일정·Item 실행 위치는 유지된다고 설명한다.
- Escape 뒤 원 opener로 초점을 돌린다. 성공 뒤 원 Flow 행이 사라지면 현재 화면 제목을
  fallback으로 사용한다.

## 8. 완료 기준

아래 체크는 현재 구현과 이미 확보된 집중 검증을 기준으로 한다. 최종 묶음 재실행이
필요한 항목은 구현이 끝났더라도 완료로 올리지 않는다.

- [x] React와 단일 HTML 모두 Flow 행 손잡이와 왼쪽 목적지 패널을 제공한다.
- [x] drag, 길게 누르기, `…`, 키보드의 최종 state가 동일한지 최신 React와 독립
  HTML을 한 묶음으로 확인했다. React Stage 4 5/5, core React browser 16/16,
  독립 HTML browser 16/16이 통과했다.
- [x] 현재 위치·취소·실패 경로가 성공 mutation 0건이 되도록 구현했고 집중
  model/component 및 standalone node 검증을 확보했다.
- [x] 기존 Undo·reload·손상 payload fail-closed 전이와 저장 key를 바꾸지 않았고
  해당 회귀 검증을 유지했다.
- [x] 네 origin과 새 작성 Flow가 기존 `move-folder / saved_flow` 계약을 같이 쓴다.
- [x] movement 자동 테스트·필수 5개 viewport와 320×700 캡처·추적표·통합 검증
  보고서를 최신 최종 실행 판정으로 맞췄다.
- [ ] 전체 `npm.cmd test` green은 확보하지 못했다. 1,520개 중 1,519개 통과 후
  시간 의존 `seed-flows` freshness 1건이 실패해 실행이 중단됐다. 뒤쪽 220/220의
  별도 통과는 이 전체 실행을 PASS로 바꾸지 않으며 known issue로 남긴다.
- [x] 실제 기기·스크린리더·관찰 사용자·게시 상태를 자동화와 분리했다. Android
  Chrome, iOS Safari, screen reader는 미실행이고 관찰 사용자는 0명이며 commit,
  push, PR, Preview, Production은 이번 범위 밖이다.

남은 내부 미체크 항목은 추가 movement 기능이 아니라 전체 회귀의 시간 의존
`seed-flows` freshness known issue다. 실제 기기·외부 검증·게시 항목은 계속 별도다.
