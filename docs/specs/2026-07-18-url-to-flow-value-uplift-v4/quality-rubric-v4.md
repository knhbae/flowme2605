# FLOW v4 quality rubric

Score each axis from 1 to 5. A high total cannot compensate for a failed critical axis.

| Axis | Critical | 1 | 3 | 5 |
|---|---:|---|---|---|
| Source fidelity and coverage | yes | unsupported or materially omitted | supported but coverage is unclear | complete/bounded coverage, traceable omissions, zero unsupported claims |
| User-job fit | yes | topic label only | related actions but weak finish state | one bounded job with a clear result and stop boundary |
| Action specificity | yes | `확인/준비/관리` without object/context | concrete object but weak trigger or condition | object + action + relevant trigger/condition/tool, readable at a glance |
| Completion observability | yes | checkbox with no definition | generic “완료” or inferred finish | visible done/hold/decision/record/resource-open criterion for every Item |
| Result promise and first action | yes | list appears without a promise | output or first action is named, not both | input/choice/no-input, result bundle, and first action are all visible |
| Artifact and projection fit | yes | wrong destination or lossy flattening | one usable destination | natural primary artifact plus loss-aware calendar/check/todo/sheet/memo projections |
| Cognitive compression | no | source copied or over-fragmented | shorter but context must be guessed | less reading while sequence, condition, caution, and source context remain available |
| Continuity and reuse | no | one-off view with no return state | completion can be saved | anchor/status/history or repeat/reuse state makes the Flow worth returning to |
| Portability | yes | content cannot leave FlowMe usefully | one basic export | stable IDs and useful calendar/check/todo/sheet/memo output preserve completion and source context |
| Source, user, and safety separation | yes | generated text looks like source fact | some labels exist | every claim is source-owned, product scaffold, user choice, or caution; sensitive boundaries are explicit |

## Hard fail codes

- `unsupported_domain_claim`
- `unaccounted_source_evidence`
- `source_scope_unverified`
- `opaque_resource_without_locator`
- `date_label_without_value_or_user_anchor`
- `generic_action_without_completion`
- `wrong_or_lossy_artifact`
- `sensitive_locale_unverified`
- `source_access_unavailable`
- `missing_result_promise`
- `missing_first_action`
- `projection_loss_unacknowledged`

## Generic copy linter

These words are not automatically wrong, but they fail when the object, trigger/condition, tool, or finish state is absent:

- 확인하기
- 준비하기
- 관리하기
- 진행하기
- 체크하기
- 기록하기
- 검토하기
- 알아보기

Examples:

| Weak | Better | Why |
|---|---|---|
| 여권 확인하기 | 여권 만료일이 귀국일 이후인지 확인 | object and comparison condition |
| 예약과 문진표 준비 | 검진기관 예약 완료 상태와 문진표 제출 여부 기록 | two observable states |
| Day 1 prompt 열어보기 | `Day 1` 실제 prompt로 사진 촬영 후 완료 표시 | requires the missing prompt text before compilation |
| 차량 상태 확인 | 사고·침수·성능점검 기록을 보고 구매/보류 이유 남기기 | decision inputs and finish state |

The “better” examples are output targets only when their details are supported by the source. Otherwise the correct result is `reextract_required`.

## Live-baseline capabilities

Every public candidate must expose all eight:

1. `job_title`
2. `input_choice_or_no_input`
3. `named_result_bundle`
4. `first_action_preview`
5. `item_count_and_destination`
6. `observable_completion_or_decision`
7. `source_trace_and_conversion_note`
8. `return_reuse_or_export_state`

Matching these capabilities is necessary, not sufficient. The pairwise gate still asks which version a user would rather save and execute.

## Pairwise reviewer protocol

Reviewers receive randomized A/B documents without version/model labels. For each pair they answer:

1. Which one can be started faster without reopening the source?
2. Which one makes completion or hold more observable?
3. Which one produces the more useful calendar/checklist/todo/sheet/memo artifact?
4. Which one preserves the source and cautions more reliably?
5. Which one is more likely to be revisited or reused?
6. Which one uses less generic copy?
7. Overall, which one would you save?

Valid choices are `A`, `B`, or `tie`, with one reason code. A candidate passes only when:

- candidate preference is at least 70% of non-tie judgments;
- no reviewer finds an unsupported or unsafe claim;
- no critical axis is worse than the baseline;
- at least two independent reviewer contexts agree on the overall direction.

