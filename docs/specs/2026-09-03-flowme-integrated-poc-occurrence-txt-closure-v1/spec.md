# FlowMe 통합 PoC P2-B — 반복 회차·완전 TXT 완결성 명세

상태: 구현·P2-B 검증 완료, 기존 전체 회귀 1건 별도

기준: `origin/main` `db74a36cbf2325573b2d696589daa659619e50f2`

범위: 격리된 `/my?personalWorkspacePoc=v1` 및 독립 HTML

## 목적

v4.1·개발1·개발2 결과를 잇는 통합 PoC에서 남은 핵심 갭 D2-017과 D2-020을 닫는다. 원본 Item은 하나로 유지하고, 반복 실행 회차를 안정적인 파생 identity로 만들어 Todo·월간 Calendar·Sheet·TXT가 같은 순서의 회차 manifest를 사용한다. 배포용 TXT는 화면·복사·다운로드가 같은 바이트를 사용한다.

## 버전 계약

- occurrence contract: `v1`
- result projection: `v3`
- TXT download contract: `v2`
- 유한 반복 기본 페이지: 첫 회차를 포함해 30회
- 종료 없는 반복 기본 horizon: 기준일부터 4주
- 지원 문법: `매일`, `N일마다`, `매주 요일`, `N주마다 요일`, `매월 N일`, `N개월마다 N일`
- 종료 문법: `N회` 또는 ISO 날짜
- `sourceItemRef`와 `occurrenceId`를 분리한다. 회차 ID는 원 발생일과 반복 signature로 결정하며 실행 날짜 이동으로 바뀌지 않는다.
- 일정 이동·완료·다시 열기는 해당 회차의 PoC shadow state만 바꾼다. 원본 일정, 원본 Item, Flow 소속은 바꾸지 않는다.
- 반복 규칙 편집, 이번 이후 일괄 변경, 외부 동기화, 운영 migration은 범위 밖이다.

## TXT 바이트 계약

- UTF-8, BOM 없음, LF, 마지막 개행 정확히 1개, 행 끝 공백 없음
- 제목과 `=` 구분선, `[단계]`, 단계별 1부터 자동 번호
- 회차 상태·제목·회차 번호 뒤에 설명, 메모, 완료 기준, 날짜, 시간, 시간대, 장소, 소요 시간, 반복, 실행 조건, 하위 체크, 자료, 출처, 주의를 고정 순서로 출력
- 값이 없는 속성은 출력하지 않고, 같은 속성을 설명에 중복하지 않는다.
- 한 단계 하위 체크는 부모 회차 아래에 유지하며 Item/회차 수를 늘리지 않는다.
- 구조로 해석하지 않은 일반 문장은 `[원문 메모]`에 원문 순서로 보존한다.
- 화면 TXT, clipboard payload, `.txt` download payload는 byte-for-byte 동일하다.

## 안전 경계

- 진입점은 exact `/my?personalWorkspacePoc=v1`이다.
- 쓰기는 `flow:poc:personal-workspace:v1:*`만 허용한다.
- 기존 Flow 데이터와 `/my`는 읽기만 하며 기존 writer를 호출하지 않는다.
- unsupported/invalid/corrupt, 같은 위치, 취소, Escape, pointer cancel, 저장 실패는 mutation 0이다.
- `localStorage.clear()`를 호출하지 않는다.
- 실행 전후 운영 `flow:*` key/value가 byte-for-byte 동일해야 한다.

## 완료 기준

1. `반복 종료: 3회`가 첫 날짜 포함 정확히 세 회차가 되고 네 결과의 ID·순서·날짜가 같다.
2. 유한 30회와 종료 없는 4주가 bounded되고 확장 전 회차 ID·순서가 유지된다.
3. 한 회차의 날짜 이동·완료·다시 열기·Undo·reload가 동작하며 다른 회차와 원본은 불변이다.
4. invalid 반복은 명시적으로 차단되고 저장은 0건이다.
5. React와 standalone이 동일 fixture에서 같은 occurrence/TXT 계약을 충족한다.
6. targeted/full test, production build, 6개 Chromium viewport 검증 및 운영 데이터 불변 증거를 남긴다.

실제 Android Chrome·iOS Safari 및 관찰 사용자 검증은 별도이며 실행하지 않은 경우 미실행으로 보고한다.
