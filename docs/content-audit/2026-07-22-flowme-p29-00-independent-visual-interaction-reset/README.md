# FlowMe P29-00 independent visual & interaction reset review

이 패키지는 P28 production을 독립적으로 자동 조작하고 current source와 대조한 뒤, P29 구현 전에 승인할 시각·상호작용 구조를 정리한 설계·기술 gate다.

- 검토일: 2026-07-22 (Asia/Seoul)
- production: <https://flowme2605.vercel.app>
- 검토한 GitHub 기준: `origin/main` `16c380a6a0550f1eafdb6189b0ab56f9358d912d`
- production/P28 기준 SHA: `ec97ff5effd6229c062528f6eb4f6d3f6d7fdc41`
- 판정: `coordinated_surface_reset`
- 확신도: 5/5
- observed-user count: 0
- 앱 코드 수정: 없음

## 먼저 볼 파일

1. [review.html](./review.html) - 10분 판정용 한국어 HTML 보드
2. [audit.md](./audit.md) - 정본 응답 형식에 맞춘 전체 검토
3. [p29-backlog.md](./p29-backlog.md) - P29-01~P29-08 실행 프로그램
4. [p29-goal-prompts.md](./p29-goal-prompts.md) - slice별 복붙용 `/goal` 프롬프트
5. [technical-impact.md](./technical-impact.md) - component/data/test 영향
6. [decision-matrix.json](./decision-matrix.json) - A/B/C 비교 판정
7. [journey-scorecard.json](./journey-scorecard.json) - 여정별 구조화 결과
8. [production-review-results.json](./production-review-results.json) - 64개 production 상태 원시 evidence
9. [screenshots](./screenshots/) - 모바일·와이드·데스크톱 캡처 64장
10. [report-qa.json](./report-qa.json) - HTML 390·1024·1440 렌더·접근성 QA

## 핵심 결론

P28은 projection, identity, routine occurrence, undated placement, export shape 같은 핵심 계약을 안정화했다. 따라서 full rewrite는 필요하지 않다. 반면 save-before, first-save receipt, My Flow, Calendar, result choice는 카드·설정·설명이 누적된 현재 composition만으로는 시각적 체감과 행동 발견성을 충분히 개선할 수 없다. 토큰 polish만 하는 대신 데이터·4탭 IA를 보존한 `coordinated_surface_reset`을 진행한다.

첫 구현은 `/f/moving-d30-basic`의 **artifact-first save-before -> 별도 saved receipt** 수직 슬라이스다. 기존 persistence와 projection을 변경하지 않고 새 frame을 route-level opt-in으로 적용하여 rollback 경계를 유지한다.

## Evidence 한계

- 이 검토는 production interaction, screenshot, current source, 공식 reference pattern, heuristic simulation에 근거한다.
- 자동화와 에이전트 시뮬레이션은 실제 사용자 관찰이 아니다.
- 실제 사용자 관찰 수는 0명이다.
- production 조작에서는 page error, console error, 가로 overflow, accessible name이 없는 focusable을 발견하지 못했다. 이것은 사용성 검증 완료를 뜻하지 않는다.

## 검증

- report QA: 3 viewports, overflow 0, broken image/link 0, unnamed focusable 0, console/page error 0
- interaction QA: severity filter와 mobile/wide wireframe toggle 통과
- `npm.cmd run docs:check`: 통과, required files 14, local links 2514
- unit/build: 앱 코드가 바뀌지 않아 이번 문서 gate에서는 재실행하지 않음. P28 package evidence와 current source를 대조했으며 P29 구현 slice에서 다시 실행해야 함
