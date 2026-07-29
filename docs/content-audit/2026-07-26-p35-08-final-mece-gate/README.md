# FlowMe P35-08 Final MECE Gate

- 작성일: 2026-07-26
- 기준 SHA: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 작업 branch: `codex/p35-mece-ux-reset`
- 판정: `pass_local_gate`
- acceptance marker: `P35-FINAL-MECE-GATE`
- 실제 관찰 사용자: `0`

## 전체 판정

P35-01~P35-07에서 나눈 화면 책임과 명령 위계가 현재 로컬 앱, 테스트,
production build에서 함께 유지된다.

1. 전역 주 탐색은 `Flow 찾기 / 캘린더 / 내 Flow` 3개다.
2. `/`는 저장 상태만 읽고 빈 사용자는 `/flows`, 저장 사용자는 `/my`로 보낸다.
3. public Flow는 자연스러운 실제 결과 하나를 먼저 보여주고, 필요한 최소값과
   선택적 `Flow 조정`을 뒤에 둔다.
4. 한 번에 한 종류의 조정만 열리며 적용과 실제 저장은 구분된다.
5. My Flow는 저장 Flow library와 선택한 한 Flow workspace로 나뉜다.
6. Calendar는 날짜 lens, Flow 범위, 선택일 실행에 한정된다.
7. export는 범위, 형식, 실제 결과 개수, 영수증 순서로 진행된다.

source, personal overlay, execution run, occurrence, export identity와 기존
localStorage schema는 변경하지 않았다.

## 핵심 수치

| 항목 | 결과 |
| --- | ---: |
| 전역 주 탐색 | 3개 |
| public 첫 화면 shape 선택 control | 0개 |
| public visible primary action 최대 | 1개 |
| 동시에 열린 조정 종류 최대 | 1개 |
| My Flow 모바일 목록 행 visible command | 1개 |
| My Flow 독립 Today/완료 view | 0개 |
| Calendar inline 메모/날짜 이동/날짜 없는 tray | 각 0개 |
| export preview/output/receipt count mismatch | 0건 |
| horizontal overflow | 0건 |
| fixed UI overlap | 0건 |
| 이름 없는 visible interactive | 0건 |
| console/page error | 0건 |

## 검증

- 문서 검사: 14개 필수 문서, 3,219개 로컬 링크 통과
- 사전 단위 테스트: 74/74 통과
- 전체 단위 테스트: 590/590 통과
- P35 전용 E2E: 30/30 통과
- 전체 E2E: 356/356 통과
- production build: 통과
- `.next/BUILD_ID`: 생성 확인
- viewport: 390x844, 1024x768, 1440x900

## Evidence

- [상세 감사](./audit.md)
- [여정 결과](./journey-results.json)
- [복잡도 전후](./complexity-before-after.json)
- [route evidence](./route-evidence.json)
- [screenshots](./screenshots/)

자동화, fixture, screenshot, local production build는 실제 사용자 관찰이
아니다. 현재 변경은 commit, push, PR, merge, production deploy하지 않았다.
테스트용 Vercel Preview만 `READY` 상태로 배포했다.

- Preview: https://flowme2605-n5o0dw81h-flowme.vercel.app
- Deployment ID: `dpl_5LnB4w6kAzTkBuwR48y3qCupVGQS`
