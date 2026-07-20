# P26-02 저장 영수증·route parity evidence

## 판정

`implemented_automated_browser_verified`

신규 저장 handoff를 `savedFlow | savedMap` 두 계약으로 통일했다. public Flow, source-backed Flow Map, URL-first hit, 메모 draft는 저장 직후 같은 `저장된 전체 Flow` 패널에 착지한다. 영수증 수량은 별도 snapshot이 아니라 패널 내부 whole-Flow outline이 실제로 렌더링하는 effective row를 그대로 집계한다.

이 패키지는 자동화와 브라우저 검증이다. 실제 관찰 사용자는 `0`명이다.

## 현재 결과

| 경로 | handoff | 할 일 | 날짜 있음 | 날짜 없음 | reload |
| --- | --- | ---: | ---: | ---: | --- |
| public 차량 점검 | `savedFlow` | 10 | 0 | 10 | 유지 |
| source-backed 이사 | `savedMap` | 5 | 5 | 0 | 유지 |
| URL-first 중1 수학 | `savedMap` | 8 | 0 | 8 | 유지 |
| 메모 개인 draft | `savedFlow` | 3 | 1 | 2 | 유지 |

중1 수학은 시작일을 받지만 현재 콘텐츠의 실행 항목은 날짜 없는 체크리스트다. 영수증은 이를 날짜 있는 일정으로 과장하지 않고 `날짜 없음 8개`로 표시한다.

## 현재 검증

- `npm.cmd test`: 536/536 통과
- `npm.cmd run docs:check`: 14개 필수 문서와 2,555개 로컬 링크 통과
- P26-02 저장 영수증 E2E: 3/3 통과
- URL-first 전체 E2E: 19/19 통과
- P24/P25/public 관련 회귀 묶음: 45/45 통과
- 저장 producer 직접 영향 `flow-mvp` E2E: 7/7 통과
- `npm.cmd run build`: 18/18 route 생성 통과
- `git diff --check`: 오류 0, 기존 줄바꿈 경고만 확인

## 산출물

- [상세 감사](./audit.md)
- [route evidence](./route-evidence.json)
- [receipt fixtures](./receipt-fixtures.json)
- [public mobile](./screenshots/01-public-post-save-receipt-mobile.png)
- [Flow Map wide](./screenshots/02-flow-map-post-save-receipt-wide.png)
- [URL-first wide](./screenshots/03-url-first-hit-post-save-receipt-wide.png)
- [memo draft mobile](./screenshots/04-memo-draft-post-save-receipt-mobile.png)

## 범위 경계

- P26-02는 route/count/hydration correctness slice다.
- post-save action hub의 큰 정보 구조 변경은 P26-07에 남긴다.
- source/personal overlay/execution run/occurrence schema는 변경하지 않았다.
- 자동화 결과를 실제 사용자 검증으로 표현하지 않는다.
