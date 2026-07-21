# FlowMe P29-00 Visual & Interaction Reset Review Handoff

- **상태:** `independent_review_ready`
- **production:** <https://flowme2605.vercel.app>
- **검토 기준:** `origin/main` `ec97ff5effd6229c062528f6eb4f6d3f6d7fdc41`
- **P28 상태:** 구현, 자동 회귀, production 배포 완료
- **실제 관찰 사용자:** 0명
**앱 코드 변경:** 없음

이 패키지는 P28을 다시 칭찬하거나 기능 목록을 확인하기 위한 자료가 아니다. P28에서 데이터 계약과 주요 여정은 연결됐지만 화면의 시각적 변화가 작고, 여전히 긴 문서·설정 폼·카드 묶음처럼 느껴지는 문제를 독립적으로 평가한다. Claude Design과 Codex가 같은 evidence를 보고 다음 단계가 단순 polish인지, 일부 화면 재설계인지, cross-surface interaction reset인지 결정하도록 만든 handoff다.

## 바로 시작하기

1. [시각 검토 보드](./review.html)를 브라우저에서 연다.
2. [전략·기획 맥락](./strategy-context.md)에서 누적된 제품 원칙과 비범위를 확인한다.
3. [현재 gap audit](./current-gap-audit.md)에서 확인된 사실과 아직 검증되지 않은 가설을 구분한다.
4. [시나리오 matrix](./review-scenario-matrix.json) 순서대로 production을 시뮬레이션한다.
5. [통합 복붙용 프롬프트](./prompt-ko.md)를 Claude Design 또는 Codex에 전달한다.
6. 결과는 [응답 형식](./response-template-ko.md)에 맞춰 받는다.

세 대안의 평가 기준과 잠정 backlog는 [P29 decision matrix](./p29-decision-matrix.json)에 있다.

## 이번 검토가 반드시 답할 질문

1. P28의 Hybrid 구조를 유지하고 시각 polish만 하면 되는가?
2. 저장 전 workspace, My Flow, Calendar를 함께 다시 설계해야 하는가?
3. routine 설정과 다섯 결과 형태를 별도 기능처럼 보이지 않게 만드는 공통 interaction grammar는 무엇인가?
4. 저장 전부터 저장 후 실행까지 사용자가 같은 Flow를 다루고 있다는 연속성이 보이는가?
5. P29 첫 구현 slice는 shared visual grammar인가, save-before인가, My Flow인가?
6. 어떤 변화는 CSS/token 수준이고, 어떤 변화는 component composition과 interaction state를 바꿔야 하는가?

## 현재 판단

P28은 구조적으로 의미가 있었다. 다음 계약은 유지해야 한다.

- whole Flow와 실제 데이터 결과를 저장 전에 확인한다.
- source, personal overlay, execution run, routine occurrence, export identity를 분리한다.
- 콘텐츠에 맞는 primary result 하나와 필요한 secondary result만 보여준다.
- routine을 별도 운동 tracker로 만들지 않는다.
- My Flow와 Calendar가 같은 effective item을 읽는다.
- 4탭 IA와 public `/f` shell을 유지한다.

하지만 시각·상호작용 관점에서는 아래 문제가 남아 있다.

- 저장 전 화면은 여전히 긴 문서와 설정 폼의 조합처럼 보인다.
- routine은 전용 완료 문법을 없앴지만 설정 밀도는 높다.
- My Flow는 library/detail 구조가 생겼어도 다음 행동의 초점이 약하다.
- Calendar picker는 가로 chip 문제를 해결했지만 대규모 scope 관리의 부담이 남는다.
- 다섯 결과 형태는 실제 데이터가 됐지만 사용자가 결과를 고르고 비교하는 경험은 약하다.
- surface마다 card, label, border가 반복돼 P28의 구조 변화가 시각적으로 잘 드러나지 않는다.

따라서 현재 권장안은 **P29-00에서 cross-surface visual and interaction reset을 비교 승인한 뒤 구현하는 것**이다. 전면 planner rewrite나 데이터 계약 재작성은 권장하지 않는다.

## 검토 대안

| 대안 | 범위 | 장점 | 위험 | 현재 가설 |
| --- | --- | --- | --- | --- |
| A. Incremental polish | 색, 간격, typography, border 정리 | 빠르고 회귀가 작음 | hierarchy와 여정 단절이 남음 | 단독으로는 부족 |
| B. Coordinated surface reset | save-before, My Flow, Calendar, result choice를 같은 문법으로 재구성 | 체감 변화와 계약 보존의 균형 | 비교 prototype과 단계적 구현 필요 | **우선 검토 권장** |
| C. Full product rewrite | IA, data, planner 기능까지 재작성 | 큰 변화 가능 | 기존 신뢰 계약과 범위 붕괴 | 비권장 |

검토자는 이 가설을 그대로 승인하지 말고 production interaction, screenshot, source를 근거로 반박하거나 수정해야 한다.

## P29 잠정 실행 순서

이 순서는 검토 결과로 확정하거나 바꾼다.

1. **P29-00:** 세 대안의 current/proposed wireframe과 interaction prototype 비교 gate
2. **P29-01:** 공통 visual grammar, density, task row, command hierarchy
3. **P29-02:** save-before preview and adjustment workspace 재구성
4. **P29-03:** My Flow action-first library/detail 재구성
5. **P29-04:** Calendar scope, selected day, unscheduled placement 재구성
6. **P29-05:** routine progressive disclosure와 occurrence 실행 문법 정리
7. **P29-06:** five-shape result choice, preview, export receipt 연결
8. **P29-07:** cross-surface journey continuity와 responsive/accessibility gate
9. **P29-08:** final independent review와 production closeout

## Evidence 지도

- [P28 final package](../2026-07-22-p28-final-review-package/README.md)
- [P29 전략·기획 맥락](./strategy-context.md)
- [P28 detailed audit](../2026-07-22-p28-final-review-package/audit.md)
- [P28 route evidence](../2026-07-22-p28-final-review-package/route-evidence.json)
- [P28 architecture gate](../2026-07-22-p28-01-cross-surface-architecture-gate/README.md)
- [P28 spec](../../specs/2026-07-21-p28-experience-reconstruction/README.md)
- [현재 screenshot 묶음](./screenshots/)
- [route/evidence index](./route-evidence.json)
- [P29 option and implementation decision matrix](./p29-decision-matrix.json)
- [artifact manifest](./artifact-manifest.json)
- [review render check](./review-render-check.json)

## Evidence 규칙

- `current_production_interaction`: reviewer가 현재 production에서 직접 조작한 사실
- `current_package_screenshot`: 이 패키지 또는 P28 패키지의 현재 화면 캡처
- `current_source`: 현재 main 코드와 테스트
- `prior_design_artifact`: 이전 mockup이나 제안
- `reference_pattern`: 외부 서비스의 확인 가능한 interaction pattern
- `heuristic_simulation`: reviewer의 시뮬레이션과 디자인 추론
- `inaccessible`: 접근하지 못한 자료

자동화, screenshot 검토, 에이전트 시뮬레이션은 실제 사용자 검증이 아니다. 이번 gate에서 실제 사용자 관찰은 요구하지 않지만, 추후 사람에게 확인할 가설은 별도로 남긴다.
