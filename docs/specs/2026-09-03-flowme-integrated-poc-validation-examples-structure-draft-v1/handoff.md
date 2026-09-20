# P3-C handoff

## 목표

`D2-023 실제·검증 콘텐츠 예시`와 `D2-056 StructureDraft/compiler versioned internal asset`의 각 여섯 판정 단위를 React와 독립 HTML에서 fresh E4로 만들고 primary gap을 14에서 12로 줄인다.

## 현재 상태

P3-C 구현과 로컬 자동·production browser 검증을 완료했다. D2-023과 D2-056의 각 여섯 하위 판정은 current E4이며, 현재 집계는 `133 충족 / 8 부분 / 4 미충족 / 11 의도적 변경 / 12 제외`, primary gap 12다.

React와 독립 HTML 모두 31개 검증 예시를 다섯 그룹에서 읽기 전용으로 탐색하고, 빈 원문에서만 exact bytes를 적용한다. StructureDraft P0.2는 6 positive fixture, 3 archetype, 19 rule, 20 negative patch, 결정적 compiler와 고정 PoC sidecar를 사용한다.

## 고정한 결정

- 일반 메모 작성은 기본 경로다.
- 작성 틀은 빈 골격, 검증 예시는 완성된 QA 원문 사본이다.
- 4번째 주 navigation을 만들지 않고 입력 화면의 분리된 보조 탐색기로 연결한다.
- browse/preview는 read-only이고 빈 원문에서 명시 행동만 source를 한 번 바꾼다.
- StructureDraft P0.2 core는 clean HEAD `974db8f2`를 기준으로 PoC-local 포트한다.
- sidecar는 `flow:poc:personal-workspace:v1:structure-template-sidecars:p0.2`로 고정한다.
- current authoring fingerprint/CAS와 StructureDraft SHA fingerprint를 둘 다 유지한다.

## 최종 검증 증거

| 범위 | 결과 |
|---|---:|
| P3-C core assets | 78/78 |
| React authoring surface | 22/22 |
| ProductUx | 6/6 |
| standalone | 82/82 |
| React·standalone parity | 18/18 |
| production browser | 62/62(기존 48 + P3-C 14) |
| production build | 18/18 |
| `npm test` | 1809/1810 |
| regression tail | 220/220 |

production browser에서 다섯 viewport, keyboard와 비드래그 경로, no-op/error guard, prefix allowlist를 확인했다. prefix 밖 write/remove/clear는 0건이고 non-PoC `flow:*` key/value는 시나리오 전후 byte-for-byte 동일했다.

## 남아 있는 검증과 알려진 회귀

- `npm test`의 유일한 실패 `dog-adoption-first-week:review_due:2026-06-04`는 2026-09-04 기준 92일이 지난 기존 published seed가 90일 freshness gate를 넘긴 날짜 의존 fixture다. P3-C와 인과가 없다.
- 실제 Android Chrome, iOS Safari, screen reader와 실제 200% 확대는 실행하지 않았다.
- 관찰 사용자 검증은 실행하지 않았고 관찰 사용자 수는 0명이다.
- 다음 단계는 남은 primary gap 12건의 우선순위를 새로 정하는 일이다. 실제 기기·보조기술·관찰 사용자 검증이 필요하면 자동화와 별도 gate로 수행한다.

## 게시 상태

- commit: 미진행
- push: 미진행
- PR: 미진행
- Preview: 미진행
- Production: 미진행
