# P1 구현 계획

## 단계 1 — 기준선과 결정 계약

- 세 원천의 잔여 ID를 현재 코드와 다시 대조한다.
- 운영 결정을 PoC-local default와 운영 보류로 분리한다.
- 기능별 write owner, identity, fail-closed, Undo 경계를 먼저 테스트한다.

## 단계 2 — 휴지통

- versioned trash entry와 pure transition을 추가한다.
- Flow와 QuickItem의 이동·복원·영구 삭제를 같은 transition family로 연결한다.
- 보관 중에는 원래 폴더·실행 상태·진행 기록을 유지한다.
- 영구 삭제는 별도 확인 이후에만 실행하고 Undo snapshot과 reload를 검증한다.

## 단계 3 — 네 결과 projection

- 하나의 effective Item 배열에서 TXT, Todo, Calendar, Sheet를 만든다.
- 네 결과의 ref·순서·날짜·완료를 비교하는 공통 assertion을 둔다.
- TXT 복사/다운로드와 Sheet CSV 다운로드는 사용자 명시 동작으로만 실행한다.
- 결과 전환 자체는 durable write 0이다.

## 단계 4 — property와 near-miss 복구

- catalog와 입력 surface를 source 문법과 1:1로 연결한다.
- 단순 값은 inline, 날짜·시간은 native picker, 의존 값은 제한 surface를 사용한다.
- 기존 값 재진입은 해당 값의 정확한 range만 선택한다.
- near-miss는 원문을 보존해 보여 주고 명시 복구 시에만 한 번 치환한다.

## 단계 5 — 두 surface parity

- React exact-query route와 조작형 단일 HTML의 행동명, 결과, transition outcome을 맞춘다.
- Android용 단일 파일을 standalone과 byte-identical하게 갱신한다.

## 단계 6 — 검증과 판정

- targeted model/component, standalone Node, 관련 회귀, `npm test`, build, docs check를 실행한다.
- Chromium에서 기능 시나리오와 320×700, 375×812, 390×844, 844×390, 1024×768,
  1440×900을 검사한다.
- 자동화, 실제 기기, 관찰 사용자, 게시 상태를 분리해 기록한다.
