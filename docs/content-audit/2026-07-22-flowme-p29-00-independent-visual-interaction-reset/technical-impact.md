# P29 technical impact and contract boundary

## 결론

P29는 데이터 모델 프로젝트가 아니다. current source는 visual reset에 필요한 projection과 identity를 이미 제공한다. 주 변경은 component composition과 ephemeral interaction state이며 migration은 필요하지 않다.

## 변경 분류

| 분류 | 필요한 변경 | 대표 파일 | Migration | 회귀 위험 |
| --- | --- | --- | --- | --- |
| CSS-only | type scale, density, divider, semantic states, focus ring | `app/globals.css`, `components/flow/flow-ui.ts` | 없음 | 낮음 |
| Component composition | artifact-first order, one outline, contextual inspector, distinct receipt | `FlowSaveBeforeFrame.tsx`, `FlowArtifactDataPreview.tsx`, `FlowExecutionPrimitives.tsx`, `SourceBackedFlowMapPage.tsx`, `PostSaveDecisionHub.tsx` | 없음 | 중간 |
| Interaction state | preview/adjust/saved, routine compact/expanded, scope sheet, focus return | `RoutineScheduleEditor.tsx`, `CalendarFlowScopePicker.tsx`, `CalendarUnscheduledTray.tsx`, `AppClient.tsx` | 없음 | 중간 |
| Derived presentation | recommendation reason, result delta/loss, recent/active grouping | `lib/flow/flow-experience-projection.ts` 또는 별도 UI VM | 없음 | 낮음~중간 |
| Stable contract | source/personal/run/occurrence/export identity | 기존 consumer 전부 | **변경 금지** | 높음 |

## Current source가 이미 제공하는 것

- `FlowSaveBeforeFrame`: identity, schedule intent, outline, artifact preview, setup/action slot
- `FlowArtifactDataPreview`: 실제 data row, primary/secondary eligibility, count
- `flow-experience-projection`: content role과 artifact shape projection
- `whole-flow-reading`: section/group/disclosure projection
- `effective-routine-projection`: series/occurrence와 next occurrence
- `CalendarFlowScopePicker`: dialog, search, multi-select, focus trap/return
- `CalendarUnscheduledTray`: selected item, date placement, undo
- `PostSaveDecisionHub`와 `FlowReceipt`: saved state를 표현할 primitive

## 새로 필요한 UI-only contract

```ts
type ArtifactRecommendationVM = {
  primary: ArtifactShape;
  reason: string;
  scopeLabel: string;
  rowCount: number;
  secondary: Array<{
    shape: ArtifactShape;
    deltaLabel: string;
    lossLabel?: string;
  }>;
};

type ExperienceFrameMode = 'preview' | 'adjust' | 'saved';
```

두 값 모두 persistence 대상이 아니다. 기존 projection에서 계산하거나 page-local state로 관리한다.

## Stable identity invariants

1. source Flow id와 source URL은 visual frame에 따라 바뀌지 않는다.
2. personal copy id와 personal title/date/include overlay는 receipt/My Flow/Calendar/export에서 일치한다.
3. execution run completion은 source item을 mutate하지 않는다.
4. routine occurrence completion은 series definition을 mutate하지 않는다.
5. export snapshot은 scope와 personal overlay를 반영하되 source trace를 유지한다.
6. archive는 delete가 아니고 restore 가능하다.

## Focus/DOM 위험

- `AppClient`의 mobile fixed save CTA가 main보다 먼저 렌더되는 구조를 바꿔야 한다.
- bottom nav가 main controls보다 먼저 포커스되는 DOM 순서를 점검해야 한다.
- fixed visual placement와 DOM placement를 분리할 때 portal을 사용하면 reading order가 다시 어긋날 수 있다.
- sheet/dialog close 후 trigger focus restore를 P29 공통 primitive로 고정한다.

## Rollback 전략

- P29-01은 route-level opt-in으로 legacy composition을 보존한다.
- projection/persistence payload는 shared function을 그대로 쓴다.
- 새 UI-only VM은 기존 VM을 감싸고 source data를 mutate하지 않는다.
- legacy 삭제는 P29-08 full regression 이후 별도 변경으로 한다.

## Test matrix

| Contract | Unit | Targeted E2E | Full regression | Production capture |
| --- | --- | --- | --- | --- |
| artifact eligibility/count | 필수 | 필수 | 필수 | five-shape |
| save-before/receipt transition | 필수 | 필수 | 필수 | moving |
| focus order/return | 선택적 helper | 필수 | 필수 | 390 |
| routine series/occurrence | 필수 | 필수 | 필수 | routine |
| My Flow completion/reopen | 기존 유지 | 필수 | 필수 | 27 fixture |
| Calendar scope/undated | 필수 | 필수 | 필수 | 12 fixture |
| export identity/scope | 필수 | 필수 | 필수 | result receipt |
