# Revision log — 첫 제안 red-team과 3회 수정

## rev.0 — 첫 제안 (순수 A)

- `/` → `/flows` 고정 리다이렉트, 홈 제거
- `/my` library-only
- `/calendar` lens-only (읽기 전용, 어떤 조작도 없음)
- 개인 Flow가 실행·완료·편집·메모·export를 유일하게 소유

## Red-team 12문항

| # | 반박 | 판정 | 결과 |
| --- | --- | --- | --- |
| 1 | 삭제가 아니라 기능을 숨기기만 한 것 아닌가 | 일부 사실 | Calendar 편집은 “이동”이다 → rev.1에서 이동 대상 표면을 하나로 합쳐 총 편집 표면 3 → 1 |
| 2 | 다른 메뉴로 옮겨 복잡도를 보존한 것 아닌가 | 부분 사실 | `/my`에서 뺀 4버튼은 개인 Flow에서 3개(구조 조정·가져가기·관리)로 줄었고 나머지는 다음 하나 카드로 흡수 |
| 3 | 화면별 primary가 실제로 하나인가 | 사실 아님(초안 기준) | 공개 Flow에 `조정`+`시작`이 나란히 있었다 → `조정`을 outline secondary로 낮추고 filled는 하나만 |
| 4 | 콘텐츠 shape 차이를 공통 shell로 억지로 평준화했는가 | 사실 아님 | shape별 renderer 5종을 명시하고 “공통과 변형” 표를 분리 |
| 5 | 날짜 없는 Item의 접근 경로가 사라졌는가 | 사실 아님 | 개인 Flow가 전량 소유 + 목록 행에 `날짜 없음 · N개 중 다음 1개` |
| 6 | archive/restore, personal Item recovery가 사라졌는가 | 사실 아님 | 관리 영역과 구조 조정의 복구 목록으로 전량 유지 |
| 7 | Calendar lens-only가 실행 맥락을 과도하게 분리하는가 | **사실** | rev.2 — 완료 토글 1개를 row primitive로 복원 |
| 8 | My Flow library-only가 재방문자의 오늘 행동을 약하게 만드는가 | **부분 사실** | rev.2 — 행에 읽기 전용 다음 예정 1줄. Today mode는 복원하지 않음 |
| 9 | Home 제거가 discovery와 trust를 약하게 만드는가 | 사실 아님(discovery), **사실**(재방문 진입) | rev.1 — `/`를 entry router로 |
| 10 | 390에서 긴 설명과 카드가 다시 쌓였는가 | 부분 사실 | 공개 Flow 설명 block 3 → 1(접힘), 요약 chip 제거 |
| 11 | 1024가 늘어진 mobile인가 | 부분 사실 | rev.3 — wide 전용 composition을 My Flow·개인 Flow·Calendar 3개로 한정하고, 단일 결정 화면은 중앙 720으로 “의도적 동일” 명시 |
| 12 | visual polish가 정보 구조 문제를 가렸는가 | 사실 아님 | visual-system.md에서 [P]polish와 [C]composition을 분리 표기 |

## rev.1 — 진입과 편집 표면 (반박 1·2·9)

1. `/`를 고정 리다이렉트가 아니라 **entry router**로: 저장 Flow > 0 → `/my`, 0 → `/flows`. 새 surface 0개.
2. 편집 표면을 **Item detail 하나**로 확정. Calendar에서 옮겨온 메모·날짜 변경이 개인 Flow 안에서 또 다른 표면을 만들지 않게 했다.
3. 공개 Flow의 filled 버튼을 1개로(`조정`은 outline).

**대가**: 진입 화면이 상태에 따라 달라진다. QA 경로가 2개가 된다.

## rev.2 — 완료의 정의 (반박 7·8)

1. 완료/다시 열기를 **소유 기능이 아니라 row primitive**로 재정의. 실행 row가 렌더되는 곳이면 같은 컨트롤·같은 라벨·같은 undo. 편집(제목·날짜·메모·순서)의 소유자는 개인 Flow 하나.
2. Calendar 행에 완료 토글 1개만 복원. 메모·날짜 옮기기·제목 수정·undated tray는 제거 유지.
3. My Flow 행에 **읽기 전용** 다음 예정 1줄. 행의 목적지는 여전히 하나.

**대가**: 규칙이 한 줄 늘었다. 이 조항을 문서화하지 않으면 다음 라운드에 Calendar 편집이 다시 들어온다.
**rollback**: 완료 토글만 숨기면 순수 A로 되돌아간다(가장 싼 rollback).

## rev.3 — 밀도와 wide (반박 10·11)

1. 공개 Flow: 요약 chip 3개와 결과 형태 토글 제거, 설명 block 3 → 1(접힘), 최소 입력을 시작과 같은 영역으로.
2. wide 전용 composition을 3개 화면으로 한정(My Flow master-detail, 개인 Flow canvas+inspector, Calendar grid+agenda). 조정·receipt·가져가기는 중앙 720으로 유지 — 결정이 하나인 화면이라 두 pane이 불필요하다는 것을 명시적 결정으로 기록.
3. 공개 Flow(공유 화면)에는 전역 bottom nav를 두지 않아 고정 요소 충돌을 원천 차단.

## 남은 위험

1. **완료 primitive 조항의 부식** — 문서화된 규칙이 없으면 Calendar에 command가 다시 늘어난다. `P35-CALENDAR-LENS-ONE-TOGGLE` E2E로 고정한다.
2. **entry router 첫 페인트** — localStorage 판정 전 skeleton 한 프레임. 느린 기기에서 깜빡임으로 보일 수 있다.
3. **다음 예정 한 줄의 정확도** — 날짜 없는 Flow에서 “다음 1개”를 무엇으로 계산할지(순서 첫 미완료)를 구현에서 확정해야 한다.
