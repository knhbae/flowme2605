# FlowMe Cross-entry Canonical Flow Independent Review Handoff

작성일: 2026-07-24

검토 branch: `cross-entry-review-handoff-20260724`

Production: <https://flowme2605.vercel.app>

검토 기준 `origin/main`: `e491d99ca61ecae4fd0dd009f785e737b6a59516`

현재 production app release: `30281a7a8ea9bea1194b4104b5a49b6211c07e3b`

실제 관찰 사용자: `0`

앱 코드 변경: 없음

## 목적

Claude Design과 Codex가 [홈·찾기·저장 경로 정합성 감사](../2026-07-24-flowme-cross-entry-canonical-consistency-audit/README.md)를 독립적으로 재검토하도록 준비한 handoff다.

현재 감사의 가설은 다음과 같다.

- 같은 AJD 이사 원문이 Home, Find, URL lookup, direct alias에서 서로 다른 Flow로 열린다.
- 24-item public Flow와 5-item Flow Map이 별도 저장 객체가 된다.
- Find catalog의 first 5 route는 legacy hybrid, last 4 route는 artifact-first다.
- visible artifact choice가 moving/vehicle에서는 작동하지 않고 wedding/workout에서는 작동한다.
- P32 focused My Flow workspace는 downstream에서 작동하지만 upstream duplicate identity는 해결하지 못한다.

검토자는 이 가설을 그대로 반복하지 않는다. current production과 current source에서 각각 `confirmed / reframed / rejected / inaccessible`로 재판정한다.

## 역할

| 검토자 | 주 책임 | 필수 결과 |
| --- | --- | --- |
| Claude Design | 정보 구조, 시각 위계, entry별 mental model, interaction grammar, current/proposed wireframe, reference comparison | 390/1024 current-proposed, A/B/C 대안, recommended canonical journey |
| Codex | production 재현, source/route/storage identity, test gap, backward compatibility, migration·rollback 위험 | alias graph, storage conflict matrix, current command/browser evidence, bounded implementation slices |

공통 금지:

- 검토 중 앱 코드 수정
- 자동화·screenshot·agent simulation을 실제 사용자 검증으로 표현
- P32 My Flow workspace를 근거 없이 폐기
- source/personal/run/occurrence/export identity 전체 재작성
- fake usage count, rating, review를 해결책으로 추가
- 긴 설명을 추가해 interaction 문제를 덮기

## 정본 읽기 순서

1. [Production](https://flowme2605.vercel.app)
2. [cross-entry visual review](../2026-07-24-flowme-cross-entry-canonical-consistency-audit/review.html)
3. [cross-entry README](../2026-07-24-flowme-cross-entry-canonical-consistency-audit/README.md)
4. [cross-entry audit](../2026-07-24-flowme-cross-entry-canonical-consistency-audit/audit.md)
5. [cross-entry route evidence](../2026-07-24-flowme-cross-entry-canonical-consistency-audit/route-evidence.json)
6. [provisional P33 program](../2026-07-24-flowme-cross-entry-canonical-consistency-audit/next-program.md)
7. [P32 final package](../2026-07-24-p32-final-review-package/README.md)
8. [STATUS](../../STATUS.md), [ROADMAP](../../ROADMAP.md), [DECISIONS](../../DECISIONS.md)
9. current source와 tests

판단 우선순위:

`current production interaction -> current source -> current package screenshot -> structured evidence -> prior release evidence -> external reference pattern`

## 검토 시나리오

8 personas x 3 sessions = 24 journey cells를 사용한다.

1. Home-first moving
2. Find-first moving
3. URL-first moving source
4. Existing duplicate Flow returner
5. Vehicle checklist expectation
6. Recurring workout
7. Wedding positive control
8. Keyboard and responsive

상세 단계는 [review-scenarios-ko.md](./review-scenarios-ko.md)를 따른다.

## 필수 판정

Overall verdict:

- `audit_not_reproduced`
- `bounded_cross_entry_alignment`
- `canonical_flow_contract_reopen`
- `broader_discovery_experience_reopen`

각 finding:

- `confirmed`
- `reframed`
- `rejected`
- `inaccessible`

각 journey:

- `supported`
- `hidden`
- `partial`
- `missing`
- `blocked`

## 기대 산출물

- `README.md`
- `audit.md`
- `review.html`
- `cross-entry-invariant-matrix.json`
- `persona-journey-scorecard.json`
- `alias-storage-impact.json`
- `decision-matrix.json`
- `p33-recommendation.md`
- `screenshots/`

공통 형식은 [review-output-contract.json](./review-output-contract.json)을 따른다.

## 복붙용 파일

- [unified-review-prompt-ko.md](./unified-review-prompt-ko.md): 한 프롬프트를 두 검토자에게 전달할 때 사용
- [claude-design-prompt-ko.md](./claude-design-prompt-ko.md): Claude Design 전용
- [codex-independent-review-prompt-ko.md](./codex-independent-review-prompt-ko.md): Codex 전용

## 결정 gate

P33 구현은 두 검토 결과를 합친 뒤 다음을 확정해야 시작한다.

1. canonical Flow ID와 canonical user route
2. moving 24/5 item 정본
3. Flow Map의 public 역할
4. legacy saved record reconciliation 정책
5. artifact choice의 공통 interaction contract
6. Home example과 Find inventory의 포함 관계

이 handoff는 P33 구현 승인이나 실제 사용자 검증이 아니다.
