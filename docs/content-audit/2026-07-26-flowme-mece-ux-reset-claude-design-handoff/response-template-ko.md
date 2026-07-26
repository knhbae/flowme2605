# FlowMe MECE UX Reset - Claude Design 응답 양식

이 순서를 유지한다. 확인하지 못한 항목은 생략하지 말고 `inaccessible`로 남긴다.

## 1. Execution metadata

```yaml
reviewerRole: claude_design
reviewDate:
localWorktree:
localBranch:
localHead:
originMain:
productionUrl: https://flowme2605.vercel.app
productionCheckedAt:
observedUserCount: 0
appCodeChanged: false
commitPushPrMergeDeploy: false
```

## 2. Overall verdict

다음 중 하나:

- `codex_structure_keep`
- `bounded_revision`
- `alternative_structure_required`

한 문단으로 가장 중요한 이유를 적는다.

### 세 결정

| Decision | Verdict | 선택 구조 | 감수할 대가 | Evidence |
| --- | --- | --- | --- | --- |
| Home 제거 및 Flow 찾기 통합 | keep / revise / reject |  |  |  |
| My Flow library-only | keep / revise / reject |  |  |  |
| Calendar lens-only | keep / revise / reject |  |  |  |

## 3. Blocking / High / Medium / Low findings

각 finding은 아래 형식을 사용한다.

```text
ID:
Severity:
Title:
Route:
Viewport:
Starting state:
Reproduction:
Expected:
Actual:
User impact:
EvidenceKind:
Recommended change:
Acceptance screenshot or interaction marker:
Unverified assumption:
```

현재 fact, heuristic inference, reference pattern을 한 finding 안에서 혼합하지 않는다.

## 4. A/B/C decision matrix

| Criteria | A Subtractive ownership | B Current tightened | C Claude alternative |
| --- | --- | --- | --- |
| 사용자 가치 |  |  |  |
| 첫 viewport 명확성 |  |  |  |
| 저장 전 예측 가능성 |  |  |  |
| session 연속성 |  |  |  |
| action owner 중복 |  |  |  |
| 모바일 밀도 |  |  |  |
| 20개 Flow 확장성 |  |  |  |
| data-contract 위험 |  |  |  |
| 구현 난이도 |  |  |  |
| rollback 가능성 |  |  |  |

권장 조합과 탈락 이유를 적는다.

## 5. 15-cell journey scorecard

| Persona | Session | Current | Proposed | 가장 큰 단절 | Recovery | EvidenceKind |
| --- | --- | --- | --- | --- | --- | --- |
| 이사 | A |  |  |  |  |  |
| 이사 | B |  |  |  |  |  |
| 이사 | C |  |  |  |  |  |
| 차량 점검 | A |  |  |  |  |  |
| 차량 점검 | B |  |  |  |  |  |
| 차량 점검 | C |  |  |  |  |  |
| 반복 홈트 | A |  |  |  |  |  |
| 반복 홈트 | B |  |  |  |  |  |
| 반복 홈트 | C |  |  |  |  |  |
| 장기 학습 | A |  |  |  |  |  |
| 장기 학습 | B |  |  |  |  |  |
| 장기 학습 | C |  |  |  |  |  |
| 개인 메모 | A |  |  |  |  |  |
| 개인 메모 | B |  |  |  |  |  |
| 개인 메모 | C |  |  |  |  |  |

Current status는 `supported / hidden / partial / missing / blocked`,
Proposed status는 `pass / revise / fail`을 사용한다.

## 6. Complexity comparison

| Surface | Version | 핵심 메시지 | Primary | Visible commands | Cards/blocks | 설명 blocks | First result depth | 주요 scroll depth |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Flow 찾기 | current |  |  |  |  |  |  |  |
| Flow 찾기 | proposed |  |  |  |  |  |  |  |
| Public Flow | current |  |  |  |  |  |  |  |
| Public Flow | proposed |  |  |  |  |  |  |  |
| Receipt | current |  |  |  |  |  |  |  |
| Receipt | proposed |  |  |  |  |  |  |  |
| My Flow | current |  |  |  |  |  |  |  |
| My Flow | proposed |  |  |  |  |  |  |  |
| Personal Flow | current |  |  |  |  |  |  |  |
| Personal Flow | proposed |  |  |  |  |  |  |  |
| Calendar | current |  |  |  |  |  |  |  |
| Calendar | proposed |  |  |  |  |  |  |  |
| Export | current |  |  |  |  |  |  |  |
| Export | proposed |  |  |  |  |  |  |  |

## 7. Screen message contract

각 화면에 대해 작성한다.

```text
Surface:
User question:
Message 1:
Message 2:
Primary action:
Secondary action:
Default visible:
Collapsed:
Removed explanation:
Next state:
Owned capability:
Not owned:
```

대상:

- Flow 찾기
- Public Flow
- 조정
- 저장 결과
- My Flow
- 개인 Flow
- Item detail
- Calendar
- 가져가기
- 관리

## 8. IA tree와 continuity map

### Proposed UI tree

Mermaid 또는 text tree로 작성한다.

### Continuity

```text
save-before → receipt → My Flow → personal Flow → Calendar → export → reuse
```

각 연결에서 유지되는 title, count, date, source, stable identity와 사용자의
다음 행동을 표시한다.

## 9. Current vs proposed wireframes

다음 화면을 390px과 1024px에서 나란히 비교한다. 핵심 화면은 1440px도 포함한다.

- Flow 찾기
- Public 이사 Flow
- Public 차량 Flow
- Public 반복 Flow
- 조정
- receipt
- My Flow
- personal Flow
- Item detail
- Calendar
- export
- 관리

각 wireframe에 표시:

- 첫 시선
- primary와 secondary
- 기본 노출과 접힘
- 완료·다시 열기·수정·export 위치
- 제거한 설명과 card
- production data contract로 가능한 부분
- 선행 계약이 필요한 부분

## 10. Interaction grammar

| Object | Command | Label/icon | Location | Feedback | Undo/recovery | Owner |
| --- | --- | --- | --- | --- | --- | --- |

Flow, Item, series, occurrence, export scope, lifecycle을 모두 포함한다.

## 11. Content renderer 및 progressive disclosure

| Shape | Primary renderer | 최소 입력 | 공통 shell | Shape-specific UI | 금지할 projection |
| --- | --- | --- | --- | --- | --- |
| 이사 역산 |  |  |  |  |  |
| 날짜 없는 Checklist |  |  |  |  |  |
| 반복 series |  |  |  |  |  |
| 학습 진도 |  |  |  |  |  |
| 개인 draft |  |  |  |  |  |

필드별 나타나는 시점과 소유권을 별도 표로 쓴다.

## 12. Visual system

- typography
- spacing
- color roles
- border/elevation
- compact row anatomy
- detail sheet/inspector anatomy
- selected/completed/excluded/archived/disabled states
- source/personal/execution distinction
- mobile/wide composition

순수 polish와 구조적 composition 변경을 분리한다.

## 13. Accessibility / responsive / recovery

| Area | Current | Proposed | Acceptance marker | EvidenceKind |
| --- | --- | --- | --- | --- |

keyboard, focus, accessible name, zoom, overflow, fixed overlap, error/retry,
undo, persistence를 포함한다.

## 14. Reference pattern

| Product | Pattern | FlowMe 판정 | 적용 방식 | 적용 금지 범위 | Evidence |
| --- | --- | --- | --- | --- | --- |

최소 8개 공식 제품을 비교한다.

## 15. Implementation handoff

### 구현 순서

5~9개의 vertical slice로 작성한다.

각 slice:

```text
ID:
Problem:
Routes:
UX direction:
Keep:
Cut:
Non-goals:
Classification: CSS/token only | component composition | interaction state | route/IA | data dependency
Likely affected components:
Data/migration impact:
Dependencies:
390 acceptance:
1024 acceptance:
1440 acceptance:
Accessibility acceptance:
Screenshot marker:
Unit/E2E marker:
Rollback:
Done:
```

### 순차/병렬

- 반드시 순차로 수행할 slice
- 병렬 가능한 visual/accessibility slice
- 별도 data gate가 필요한 항목

## 16. Actual-user-only questions

최대 7개만 작성한다. agent simulation으로 답할 수 없는 질문만 남긴다.

## 17. Verification and publish state

- prototype browser QA:
- current production inspection:
- local artifact files:
- inaccessible evidence:
- app code changed: false
- commit/push/PR/merge/deploy: 모두 false
- observed-user count: 0

## 18. Final summary

다음 순서로 한 페이지에 요약한다.

1. 남길 구조
2. 지울 UI
3. 조정할 구조
4. 구현 전에 승인할 세 결정
5. 첫 구현 vertical slice와 rollback
