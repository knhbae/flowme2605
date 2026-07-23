# FlowMe P29 independent production review

## 판정

`revise`

P29의 coordinated surface reset은 production에서 확인됐다. artifact-first 저장 전 화면, 별도 저장 receipt, routine summary-first, compact My Flow, Calendar scope, export scope/count/identity는 유지한다. 전면 재설계나 데이터 계약 변경은 필요하지 않다.

다만 모바일 export 확장 상태에서 고정 UI가 primary export action을 덮는 상태 2개와, `/my` 및 `/calendar`에서 bottom navigation이 본문보다 먼저 keyboard focus를 받는 순서 문제가 확인됐다. P30은 이 evidence gap을 먼저 닫고, 긴 Flow 조정 밀도와 Calendar 축약 표기는 제한적으로 다룬다.

## Evidence

- Production: <https://flowme2605.vercel.app>
- Reviewed origin/main: `afe834addf0e954d39c6da165c9f8931caba25b3`
- Production interaction: 17 isolated browser journeys, 39 states, 41 screenshots
- Viewports: `390x844`, `1024x768`, `1440x900`
- Observed users: `0`
- Horizontal overflow: `0`
- Unnamed focusable controls: `0`
- Console/page errors: `0`
- Fixed-primary overlaps: `2`

## Files

- [review.html](./review.html): 10분 판단용 한국어 시각 보고서
- [audit.md](./audit.md): finding, journey, contract, responsive 판정
- [journey-scorecard.json](./journey-scorecard.json): 여정별 structured result
- [decision-matrix.json](./decision-matrix.json): P29 약속과 현재 production의 정합성
- [p30-backlog.md](./p30-backlog.md): evidence gap만 다루는 P30 구현 순서
- [production-interaction-results.json](./production-interaction-results.json): 독립 production interaction 원본
- [run-independent-production-review.mjs](./run-independent-production-review.mjs): 재현 스크립트
- [screenshots](./screenshots/): production screenshots
- [report-qa.json](./report-qa.json): HTML 390/1024/1440 render QA
- [run-report-qa.mjs](./run-report-qa.mjs): 보고서 QA 스크립트
- [report-qa](./report-qa/): 보고서 full-page와 first-viewport screenshots

## 검증

- clean `origin/main` `npm.cmd run docs:check`: pass, 2,883 local links
- artifact workspace `npm.cmd run docs:check`: pass, 2,532 local links
- `npm.cmd test`: pretest 33/33, unit 584/584
- `npm.cmd run build`: pass, 18/18 routes
- `npm.cmd exec -- playwright test tests/e2e/p29-coordinated-surface-reset.spec.ts --workers=1`: 13/13
- 독립 production interaction: 17/17 journeys, 39 states

자동화, screenshot 검토, heuristic simulation은 실제 사용자 관찰이 아니다.
