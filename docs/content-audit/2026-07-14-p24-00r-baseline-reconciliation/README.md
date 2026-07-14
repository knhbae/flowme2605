# P24-00R Baseline Reconciliation

## 판정

P24 구현 기준선은 commit `211827d7f5fafebab00ed71dacdb106db0b3b44b`의 tracked product code로 고정한다.

- tracked dependency: Next `15.3.8`, Playwright `1.52.0`
- dependency candidate: Next `15.5.20`, Playwright `1.61.1`
- 두 환경 모두 unit `476/476`, production build `18 routes` 통과
- production `/flows` 직접 진입 targeted E2E는 두 환경 모두 통과
- Claude Code가 본 build 실패와 `/flows` 무한 로딩은 같은 commit의 격리 환경에서 재현되지 않음
- 제품 정확성 finding은 dependency 변경과 분리해 P24 correctness slice에서 처리

## 현재 게이트

| 항목 | 상태 | 판정 |
| --- | --- | --- |
| install | pass | clean/candidate 모두 `npm ci` 성공 |
| unit | pass | clean/candidate 모두 476/476 |
| build | pass | Next 15.3.8/15.5.20 모두 18 routes |
| docs | blocked | tracked baseline에 깨진 로컬 링크 2건 |
| full E2E | blocked | 259개 실행이 현재 15분 command limit 초과 |
| targeted production E2E | pass | home 및 `/flows` hard navigation |
| anonymous Vercel | blocked | 302 Vercel SSO |

## 다음 단일 목표

`P24-00F1 Local Date Boundary`부터 시작한다. KST 오전에 오늘/기본 날짜가 전날이 되는 오류는 실행 신뢰를 직접 깨며 clean baseline에서도 확인된 제품 결함이다.

상세 결과는 [audit.md](./audit.md), 환경은 [environment-matrix.json](./environment-matrix.json), 명령 결과는 [command-results.json](./command-results.json), finding 분류는 [reproduction-matrix.json](./reproduction-matrix.json)을 본다.
