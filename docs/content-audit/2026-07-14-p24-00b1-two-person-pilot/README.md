# P24-00B1 Two-Person First-Session Pilot

**상태:** 실행 준비 완료, 실제 세션 미실행

P24-00B의 첫 단계로 P1 기준일 역산형과 P2 날짜 없는 체크형 참가자 각 1명의 첫 세션을 진행한다. 이 패키지는 진행자가 기능을 설명하지 않으면서도 같은 순서와 중단 기준으로 관찰하도록 만든 운영 자료다.

## 바로 열기

- [진행 보드](./pilot-board-ko.html)
- [상세 목표](./goal.md)
- [진행자 runbook](./moderator-runbook.md)
- [P1-S1 기록지](./session-p1-s1.md)
- [P2-S1 기록지](./session-p2-s1.md)
- [준비 상태](./pilot-readiness.json)
- [Claude 목업 대비 production 디자인 준비 감사](../2026-07-14-p24-00b2-production-design-readiness/README.md)
- [전체 15세션 가이드](../2026-07-14-p24-00b-observed-user-test-guide/README.md)

## 완료 경계

이 패키지를 만든 것만으로 P24-00B1 또는 P24가 완료되지 않는다. 아래 조건을 모두 만족할 때만 P24-00B1을 완료로 바꾼다.

1. 서로 다른 실제 참가자 2명이 production 앱을 직접 사용한다.
2. P1-S1과 P2-S1 기록지가 실제 관찰 내용과 증거 참조로 채워진다.
3. 세션 등록부의 해당 상태와 `observedUserSessionCount`가 실제 완료 수와 일치한다.
4. 날짜·저장·완료 기록·export 범위의 신뢰 오류가 없거나, 오류 발생 즉시 다음 모집을 중단한다.
5. 자동화 결과를 실제 사용자 세션 수에 합산하지 않는다.

## 제품 기준

- production: <https://flowme2605.vercel.app>
- verified runtime baseline: `d6487a0d3352de358320b15ceeacd8b5405eb04e`
- dependency audit: critical `0`, high `0`, moderate `4`
- automated baseline: unit `514 / 514`, Playwright `274 / 274`
- actual observed sessions: `0 / 15`
