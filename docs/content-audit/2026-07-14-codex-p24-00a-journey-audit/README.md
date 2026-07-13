# FlowMe P24-00A Codex 실행 라이프사이클 감사

## 목적

P23까지 구현한 기능을 코드 존재 여부가 아니라 실제 사용자 여정으로 다시 확인한다. Codex가 깨끗한 `69768a1` 기준선에서 브라우저를 직접 조작해 5개 페르소나의 발견, 저장, 수정, 실행, 완료 취소, Calendar 반영, 회고, 수정 메모, 재사용을 재현했다.

이 결과는 자동화와 관찰자 시뮬레이션이다. 실제 사용자의 이해도 검증으로 대체하지 않는다.

## 결론

- 핵심 가치 사슬은 동작한다. URL/공개 Flow를 저장하고 개인화한 뒤 My Flow와 Calendar에서 실행하고, 완료 후 기록과 새 실행으로 이어질 수 있다.
- 외부 파일 전달 이전에 고쳐야 할 제품 오류가 확인됐다. 한국 시간 오전의 기본 날짜가 전날로 잡히고, 반복 Flow의 같은 할 일이 오늘 화면에 중복 노출되며, URL miss 초안은 필수 입력이 비어도 생성된다.
- Vercel preview는 `READY`지만 SSO 보호로 익명 사용자가 열 수 없다. 실제 관찰 세션을 시작하기 전 접근 정책을 바꿔야 한다.
- 깨끗한 추적 기준선의 `npm audit`은 high 4, moderate 3이다. 현재 dirty `package.json`/lock 변경과 분리해 통제된 업그레이드가 필요하다.

## 검증 기준선

| 항목 | 결과 |
| --- | --- |
| Git 기준 | `69768a1`, `origin/main` 동기화 시점 |
| Node / Next / Playwright | 24.17.0 / 15.3.8 / 1.52.0 |
| 단위 테스트 | 476/476 통과 |
| Playwright 전체 | 259/259 통과, 8.9분 |
| production build | 통과 |
| Codex 브라우저 시뮬레이션 | 5 persona, 24 screenshots |
| 실제 관찰 사용자 | 0명 |
| Vercel | `READY`, 익명 접근은 302 SSO redirect |
| dependency audit | critical 0 / high 4 / moderate 3 |

## 파일

1. [workboard.html](./workboard.html) - 전체 판정과 다음 실행 순서를 한 화면에서 보는 한국어 보드
2. [audit.md](./audit.md) - 페르소나별 재현 과정과 발견 사항
3. [journey-scorecard.json](./journey-scorecard.json) - 여정별 판정과 행동 깊이
4. [state-transition-results.json](./state-transition-results.json) - 상태 전이별 supported/hidden/partial/missing 판정
5. [route-evidence.json](./route-evidence.json) - route, viewport, screenshot, marker
6. [security-audit-summary.json](./security-audit-summary.json) - 깨끗한 기준선 dependency audit
7. [backlog-recommendation.md](./backlog-recommendation.md) - P24 권장 순서
8. [claude-code-followup-prompt-ko.md](./claude-code-followup-prompt-ko.md) - 독립 재검증용 복붙 프롬프트
9. [screenshots/](./screenshots/) - 모바일 390px 및 wide 1024px 증거

## 증거 등급

- `current_command`: 이번 감사에서 직접 실행한 명령 결과
- `codex_browser_simulation`: Codex가 실제 브라우저를 조작해 재현한 결과
- `fixture_based`: localStorage 또는 테스트 fixture로 준비한 상태
- `current_repo`: 현재 저장소 코드나 문서에서 확인한 사실
- `observed_user`: 실제 사용자의 비개입 관찰. 이번 감사에는 0건이다.

## 다음 판단

P24-00B 관찰을 바로 시작하지 않는다. 먼저 `P24-00A-FIX`로 날짜 정확성, 반복 중복, 초안 필수 입력, preview 공개 접근을 닫고 독립 회귀 검증을 통과시킨다. 이후 5명 이상, 1인 3회 사용의 관찰 세션을 진행한다.
