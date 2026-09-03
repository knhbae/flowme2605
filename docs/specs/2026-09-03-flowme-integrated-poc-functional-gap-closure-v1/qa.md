# P1 QA 기록

- 상태: `COMPLETE_WITH_KNOWN_REGRESSION_FAILURE`
- 실제 Android Chrome: 미실행
- 실제 iOS Safari: 미실행
- screen reader: 미실행
- 관찰 사용자: 0명
- commit·push·PR·Preview·Production: 미진행

## 필수 모델 시나리오

1. 휴지통 이동은 원본·진행 기록을 보존하고 활성 projection에서만 숨긴다.
2. 복원은 원래 폴더를 우선하며 폴더가 없으면 미분류로 복구한다.
3. 영구 삭제는 확인 전 mutation 0, 확인 뒤 PoC state만 바꾼다.
4. TXT·Todo·Calendar·Sheet는 동일 ref·날짜·완료·순서를 공유한다.
5. TXT/CSV payload 생성은 storage write 0이다.
6. property 삽입과 재편집은 해당 source range만 한 번 바꾼다.
7. near-miss browse/cancel/stale/invalid는 mutation 0이다.
8. 명시 복구는 한 transaction이고 Undo가 exact source를 복원한다.
9. 저장 실패는 이전 state/draft bytes를 복구한다.
10. 손상 payload는 운영 write 없이 fail-closed한다.

## 필수 브라우저 시나리오

1. Flow와 QuickItem을 휴지통으로 옮겨 목록에서 사라지고 휴지통에서 복원한다.
2. 영구 삭제 경고를 취소하면 0건, 확인하면 PoC state 1건만 변경된다.
3. 네 결과를 차례로 열어 같은 Item을 선택하고 TXT·CSV를 복사/다운로드한다.
4. 지원 property를 추가하고 다시 눌러 정확한 값만 편집한다.
5. near-miss를 검토하고 취소·적용·Undo한다.
6. 새로고침 뒤 마지막 성공 상태가 복원된다.
7. 전체 전후 비-PoC `flow:*` sentinel은 byte-identical이다.

## 실행 기록

| 범위 | 실제 결과 | 판정 |
| --- | --- | --- |
| P1 개인공간 suite | 교차 parity `4/4`, 기존·신규 P1 `295/295` | PASS (`299/299`) |
| 휴지통 집중 모델·화면 | `53/53` | PASS |
| 결과 projection | `9/9` | PASS |
| property·near-miss | `28/28` | PASS |
| React component | `50/50` | PASS |
| 독립 HTML Node | `48/48` | PASS |
| React+독립 HTML Chromium | `41/41` | PASS |
| production build | 18개 route 생성 | PASS |
| `npm test` | `1563/1564` | FAIL — 기존 시간 의존 `dog-adoption-first-week:review_due:2026-06-04` 1건 |
| 중단 뒤 회귀 묶음 | `201/201`, `19/19` | PASS (`220/220`) |

## 브라우저 판정

- 검사 크기: `320×700`, `375×812`, `390×844`, `844×390`, `1024×768`, `1440×900`
- 요청된 다섯 크기 `390×844`, `375×812`, `844×390`, `1024×768`, `1440×900` 포함
- 가로 넘침·가려진 주 행동·console error·page error: 각 `0건`
- 키보드와 비드래그 이동, 350ms 길게 누르기, pointer cancel, same-position no-op 확인
- 실제 Android Chrome·iOS Safari·screen reader·관찰 사용자 검증은 하지 않았다.

## 저장 경계 판정

- 허용 prefix 밖 `setItem`, `removeItem`, `localStorage.clear()`: 각 `0건`
- 결과 보기·TXT 복사·취소·same-position intent의 state mutation: `0건`
- 자동 fixture의 비-PoC `flow:*` sentinel: 시나리오 전후 byte 변화 `0건`
- 실제 사용자 브라우저 profile이나 운영 backend를 연 검사가 아니라 격리된 자동 브라우저 context 증거다.
