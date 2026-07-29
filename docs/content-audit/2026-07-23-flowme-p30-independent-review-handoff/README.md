# FlowMe P30 Independent Review Handoff

**검토 대상:** P30 production과 `origin/main`의 현재 UX/UI
**현재 main:** `4c5bbb34f5c8633d4b4b48fb8070e523ec5def6b`
**앱 구현 merge:** `b3c8500be3b6aa673e2078d02a986f7cae6fe8bf` ([PR #148](https://github.com/knhbae/flowme2605/pull/148))
**closeout merge:** `4c5bbb34f5c8633d4b4b48fb8070e523ec5def6b` ([PR #149](https://github.com/knhbae/flowme2605/pull/149))
**production:** <https://flowme2605.vercel.app>
**최종 deployment:** `5557873756` / <https://flowme2605-diq3fgv3b-flowme.vercel.app>
**실제 관찰 사용자:** `0`

이 패키지는 P30을 다시 구현하기 위한 문서가 아니다. Claude Design과 Codex가 같은 current production을 서로 다른 관점으로 독립 검토하고, 다음 결정을 `keep / revise / defer`로 좁히기 위한 handoff다.

## 검토 역할

| 검토자 | 주 책임 | 하지 않을 일 |
| --- | --- | --- |
| Claude Design | 시각 위계, 정보 밀도, 상호작용 문법, mobile/wide 대안, P31 후보 | 앱 코드 수정, 자동 QA를 실제 사용자 검증으로 표현, 근거 없는 전면 재설계 |
| Codex | current main/production 재현, correctness, 접근성, responsive, 테스트 수치, source 계약 영향 | 검토 중 앱 코드 수정, prior evidence를 current 결과로 재사용, 실제 사용자 관찰로 표현 |

## 정본 읽기 순서

1. [Production](https://flowme2605.vercel.app)
2. [P30 review.html](https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/review.html)
3. [P30 README](https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/README.md)
4. [P30 audit](https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/audit.md)
5. [route evidence](https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/route-evidence.json)
6. [journey results](https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/journey-results.json)
7. [local screenshot manifest](https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/screenshot-manifest.json)
8. [production smoke results](https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/production-smoke/results.json)
9. [production screenshots](https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/production-smoke/screenshots)
10. [P29 Claude Design standalone review](https://github.com/knhbae/flowme2605/blob/main/claude_work/FlowMe%20P29%20%EB%8F%85%EB%A6%BD%EA%B2%80%ED%86%A0%20(standalone).html), 비교 자료만 사용
11. [STATUS](https://github.com/knhbae/flowme2605/blob/main/docs/STATUS.md), [ROADMAP](https://github.com/knhbae/flowme2605/blob/main/docs/ROADMAP.md), [PRODUCT_PRINCIPLES](https://github.com/knhbae/flowme2605/blob/main/docs/PRODUCT_PRINCIPLES.md)

판단 우선순위는 `current production interaction -> current production screenshot -> current source -> P30 structured evidence -> P29 design artifact -> external reference pattern`이다.

## 유지할 제품 기준

- FlowMe는 무거운 planner가 아니라 외부 콘텐츠를 Calendar, checklist, sheet, memo로 옮기는 portable execution layer다.
- 첫 화면은 설명보다 실제 결과 artifact와 다음 행동을 먼저 보여준다.
- 필요한 값만 점진적으로 받고, source에서 이미 아는 값은 다시 입력시키지 않는다.
- source, personal overlay, execution run, recurrence occurrence, export identity를 섞지 않는다.
- 한 화면의 primary action은 하나를 우선한다.
- 4탭 IA와 public `/f` shell은 P31 근거 없이 다시 열지 않는다.
- 자동화·screenshot·heuristic simulation은 실제 사용자 관찰이 아니다.

## 공통 검토 질문

1. 처음 온 사용자가 설명을 읽지 않아도 무엇이 저장·복사되는지 예측하는가?
2. 저장 전 조정은 충분히 강력하면서도 24개 항목을 한꺼번에 노출하지 않는가?
3. 저장 후 My Flow에서 다음 행동, 전체 Flow, 완료 취소, 가져가기, 보관의 위계가 분명한가?
4. Calendar에서 50개 이상 Flow scope, 같은 날짜 여러 Flow, 날짜 없는 할 일 배치가 한 모델로 읽히는가?
5. 반복 Flow가 요약 우선이고 series와 이번 회차가 혼동되지 않는가?
6. mobile fixed layer, focus order, sheet/dialog focus return, keyboard 조작이 안정적인가?
7. P29/P30에서 이미 닫힌 문제를 다시 제안하고 있지 않은가?
8. 남은 문제가 실제 P31 구현을 요구하는가, 아니면 keep/defer가 더 타당한가?

## 파일

- [unified-review-prompt-ko.md](./unified-review-prompt-ko.md): Claude/Codex 공통 복붙용, reviewer 역할별 분기 포함
- [review-checklist-ko.md](./review-checklist-ko.md): 공통 시나리오와 판정 형식
- [persona-journey-simulation-ko.md](./persona-journey-simulation-ko.md): 8개 페르소나 x 3세션 상세 여정
- [claude-design-prompt-ko.md](./claude-design-prompt-ko.md): Claude Design 복붙용
- [codex-independent-review-prompt-ko.md](./codex-independent-review-prompt-ko.md): Codex 복붙용
- [simulation-output-contract.json](./simulation-output-contract.json): 24셀 scorecard와 discontinuity 결과 규격
- [source-manifest.json](./source-manifest.json): SHA, deployment, source/evidence 목록

## 기대 결과

두 검토 결과를 나중에 합칠 때 다음만 P31 후보가 된다.

- current production에서 재현된다.
- route, viewport, expected/actual, 사용자 영향이 있다.
- P30의 안정된 데이터 계약을 깨지 않고 bounded slice로 해결할 수 있다.
- acceptance screenshot 또는 자동 검증 marker를 정의할 수 있다.

단순 취향, prior screenshot만의 문제, 이미 해결된 P29 finding, 실제 사용자 증거가 필요한 가정은 구현 백로그와 분리한다.

화면 단위 pass만으로 서비스 pass를 선언하지 않는다. 8개 페르소나가 여러 세션에서 같은 Flow identity와 개인 상태를 이어가는지 확인하고, 각 여정을 `supported / hidden / partial / missing / blocked`로 분류한다.
