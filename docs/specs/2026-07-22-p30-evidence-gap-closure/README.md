# P30 Evidence Gap Closure

**Date:** 2026-07-22  
**Status:** Planning approved, implementation not started  
**Baseline:** `3c7b59e` (`afe834a` 이후 앱 코드는 동일하며 Claude Design standalone HTML만 추가됨)  
**Observed-user sessions:** `0`

## 한 줄 판정

P29의 제품 구조와 데이터 계약은 유지한다. P30은 production에서 재현된 모바일 중첩 상태 오류를 먼저 고친 뒤, Claude Design이 제안한 저장 전·My Flow·Calendar 위계 보정을 제한적으로 적용하는 **interaction correctness and evidence closure** 프로그램이다.

## 왜 이 순서인가

두 독립 검토는 결론보다 증거 방식이 달랐다.

- Codex 검토는 production을 직접 조작해 export panel과 fixed layer의 실제 겹침, 모바일 DOM focus 순서를 좌표와 상태 전이로 재현했다.
- Claude Design 검토는 current source와 screenshot package를 바탕으로 저장 전 결정 영역, My Flow 보조 command, Calendar picker/월간 셀의 밀도를 평가했다. production 하위 route 직접 조작은 제한돼 일부 상태를 `not_tested`로 남겼다.
- 따라서 P30-01/P30-02의 동작 오류를 먼저 닫고, P30-03~P30-06에서 composition을 보정하며, P30-07은 evidence가 충분할 때만 legacy branch를 정리한다.

## 우선순위

| 순서 | Slice | 판정 | 목적 |
| --- | --- | --- | --- |
| 1 | P30-01 | High | public/My Flow 모바일 export와 fixed UI 겹침 제거 |
| 2 | P30-02 | High | 모바일 header/main/bottom-nav keyboard focus 순서 교정 |
| 3 | P30-03 | Medium | 저장 전 결정 영역과 24개 긴 Flow 조정 밀도 정리 |
| 4 | P30-04 | Medium | My Flow detail command를 next action 중심으로 재정렬 |
| 5 | P30-05 | Medium | Calendar undated evidence, 50+ scope, 월간 compact identity 마감 |
| 6 | P30-06 | Low/Medium | routine advanced setting의 밀도와 문구 정리 |
| 7 | P30-07 | Low | 사용되지 않는 legacy composition을 증거 기반으로 정리 |
| 8 | P30-08 | Release gate | nested-state 독립 검토와 production closeout |

권장 dependency:

```text
P30-01 -> P30-02 -> (P30-03 || P30-04 || P30-05) -> P30-06 -> P30-07 -> P30-08
```

P30-03~05는 P30-02가 production에서 확인된 뒤 병렬로 진행할 수 있다. P30-06은 routine evidence가 실제 문제를 뒷받침할 때만 구현하고, P30-07은 사용 중인 route가 발견되면 삭제하지 않고 보류한다.

## 정본 자료

- [Claude Design P29 standalone review](https://github.com/knhbae/flowme2605/blob/main/claude_work/FlowMe%20P29%20%EB%8F%85%EB%A6%BD%EA%B2%80%ED%86%A0%20(standalone).html)
- Codex local review package: `D:\flowme2605\flow-mvp\docs\content-audit\2026-07-22-flowme-p29-independent-production-review`
- [P29 final review package](../../content-audit/2026-07-22-p29-final-review-package/README.md)
- [P29 coordinated surface reset](../2026-07-22-p29-coordinated-surface-reset/plan.md)
- Production: <https://flowme2605.vercel.app>

## 이 패키지

- [feedback-reconciliation.md](./feedback-reconciliation.md): 두 검토의 공통점, 차이, evidence weighting
- [spec.md](./spec.md): P30 제품·기술 계약과 범위
- [plan.md](./plan.md): 실행 wave, dependency, rollback
- [tasks.md](./tasks.md): P30-01~08 상세 backlog
- [qa.md](./qa.md): nested-state QA와 screenshot matrix
- [goal-prompts.md](./goal-prompts.md): 단계별 복붙용 `/goal`

## 지금 할 일

다음 구현은 **P30-01만** 시작한다. P30-01의 production evidence가 없으면 P30-02로 넘어가지 않는다. 이 문서 작성 단계에서는 앱 코드, persistence, export builder, 4탭 IA를 변경하지 않는다.

