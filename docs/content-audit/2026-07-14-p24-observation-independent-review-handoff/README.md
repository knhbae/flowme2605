# P24 관찰·독립 검토 전달 패키지

**상태:** 전달 준비 완료, 검토·관찰 미실행<br>
**공개 서비스:** <https://flowme2605.vercel.app><br>
**검토 PR:** <https://github.com/knhbae/flowme2605/pull/127><br>
**공개 확인:** 2026-07-14 19:04 KST, 대표 route 5/5 익명 HTTP 200<br>
**준비 기준:** e56afde5028728cace6613efb19b2f74c45cfa96<br>
**앱 runtime 기준:** d6487a0d3352de358320b15ceeacd8b5405eb04e<br>
**현재 회귀 확인:** P24 E2E 14/14, UTC host + Asia/Seoul browser timezone<br>
**실제 사용자 관찰:** 0 / 15

이 디렉터리는 P24를 다시 설명하지 않고 바로 검토를 시작할 수 있게 산출물, 운영 URL, 검토 질문, 역할별 프롬프트를 한곳에 모은다. 자동 QA, 에이전트의 휴리스틱 평가, 실제 사용자 관찰을 서로 다른 증거로 유지한다.

## 바로 시작하기

1. [한국어 검토 보드](./review-board-ko.html)를 연다.
2. 실제 사용자는 [2인 첫 세션 파일럿](../2026-07-14-p24-00b1-two-person-pilot/README.md)부터 진행한다.
3. Codex는 [독립 production QA 프롬프트](./prompt-codex-ko.md)를 사용한다.
4. Claude Code는 [독립 회귀 프롬프트](./prompt-claude-code-ko.md)를 사용한다.
5. Claude Design은 [제품·UX 평가 프롬프트](./prompt-claude-design-ko.md)를 사용한다.
6. 결과를 합치기 전에 [검토 체크리스트](./review-checklist-ko.md)의 증거 구분 규칙을 적용한다.

## 현재 판정

| 구분 | 상태 | 근거 |
| --- | --- | --- |
| P24 correctness·UX 구현 | 완료 | 날짜 정합성, 반복 회차, draft 포함, 완료 취소, 편집, Calendar 배치, export 범위, 단계별 메모 evidence |
| dependency·build·production | 완료 | prior artifact 기준 unit 514/514, Playwright 274/274, build 통과, audit high 0 |
| Claude Design (8) A~G 대조 | 완료 | [P24-00B2 production 디자인 감사](../2026-07-14-p24-00b2-production-design-readiness/README.md) |
| Codex 독립 재검토 | 준비 완료, 미실행 | 이 패키지의 Codex prompt |
| Claude Code 독립 회귀 | 준비 완료, 미실행 | 이 패키지의 Claude Code prompt |
| Claude Design 최신 평가 | 준비 완료, 미실행 | 이 패키지의 Claude Design prompt |
| 실제 사용자 관찰 | 미실행 | 5명 x 3회, 현재 0/15 |
| P24-00C 최종 판단 | 차단 | 실제 관찰 결과가 있어야 keep/change/defer를 확정할 수 있음 |

## 검토할 핵심 사항

1. public /f의 긴 설명이 첫 저장 판단과 결과 예측을 방해하는가.
2. My Flow의 연필 아이콘, 열기, 완료 체크가 설명 없이 다른 행동으로 읽히는가.
3. Calendar의 날짜 없는 할 일을 사용자가 발견하고 날짜에 배치할 수 있는가.
4. export 전에 전체 / 선택 / 현재 범위와 예상 항목 수를 맞게 예측하는가.
5. 개인 메모와 원본 수정 요청의 목적 차이를 이해하는가.
6. 반복 Flow에서 한 회차에 실행 control이 하나만 보이고 완료 취소가 제자리에서 가능한가.
7. 기준일 전체 이동과 개별 날짜 고정의 결과를 사용자가 예상할 수 있는가.
8. 모바일 390px의 편집·내보내기 화면이 기능 설명서처럼 느껴지지 않는가.

## 산출물 지도

| 산출물 | 용도 | 증거 종류 |
| --- | --- | --- |
| [P24 feedback reconciliation](../2026-07-14-flowme-p24-feedback-reconciliation/README.md) | 사용자·Codex·Claude 결과와 구현 순서 | current repo decision input |
| [P24 completion audit](../2026-07-14-p24-completion-audit/README.md) | 구현 slice와 남은 gate | prior audit |
| [P24 OPS2](../2026-07-14-p24-00ops2-controlled-dependency-upgrade-evidence/README.md) | dependency·build·E2E·rollback | prior automated QA |
| [P24 observed-user guide](../2026-07-14-p24-00b-observed-user-test-guide/README.md) | 5명 x 3회 전체 관찰 | observed-user protocol |
| [P24 two-person pilot](../2026-07-14-p24-00b1-two-person-pilot/README.md) | P1-S1·P2-S1 첫 실행 | observed-user protocol |
| [P24 production design readiness](../2026-07-14-p24-00b2-production-design-readiness/README.md) | A~G와 390/1024 화면 대조 | automated browser QA |
| [artifact-manifest.json](./artifact-manifest.json) | 도구가 읽는 상태·링크 목록 | handoff metadata |
| [production-smoke.json](./production-smoke.json) | 공개 Home·Flow 찾기·My Flow·Calendar·public route 응답 | current command |

Claude Design 원본은 GitHub의 [FlowMe UXUI 전체 검토 (8).zip](https://github.com/knhbae/flowme2605/blob/main/FlowMe%20UXUI%20%EC%A0%84%EC%B2%B4%20%EA%B2%80%ED%86%A0%20(8).zip) 안 FlowMe UX 개선안 목업 + 코멘트.dc.html이다.

## 증거 규칙

- 이전 테스트 수치는 prior artifact로 표시하고 현재 실행 결과처럼 쓰지 않는다.
- Codex와 Claude Code 결과는 독립 QA이며 실제 사용자 세션 수에 더하지 않는다.
- Claude Design의 평가는 휴리스틱 또는 제품 제안이며 사용성 검증으로 부르지 않는다.
- 실제 참가자가 세션 기록지와 evidence 참조를 남긴 경우에만 observedUserSessionCount를 올린다.
- 정확성 오류, 데이터 손실, 잘못된 날짜·export는 관찰을 중단하고 Blocking 후보로 기록한다.
- P24-00C 전에는 대규모 IA 변경, source v2 merge, OAuth, 계정·DB·동기화를 시작하지 않는다.

## 다음 순서

1. Codex와 Claude Code를 같은 origin/main commit·lockfile에서 독립 실행한다.
2. Claude Design은 현재 화면과 (8) 목업의 차이를 평가하되 실제 사용자 확인 질문을 분리한다.
3. P1-S1과 P2-S1 두 사람의 첫 세션을 진행한다.
4. Blocking이 없으면 P3~P5와 2·3회차를 진행해 15 / 15를 채운다.
5. P24-00C에서 관찰 발화와 행동을 기준으로 keep / change / defer / blocking을 확정한다.

이 패키지 작성으로 앱 코드나 제품 동작은 변경되지 않았다.
GitHub UTC runner에서도 한국 사용자 날짜를 동일하게 검증하도록 P24 E2E의 브라우저 timezone만 `Asia/Seoul`로 명시했다.
