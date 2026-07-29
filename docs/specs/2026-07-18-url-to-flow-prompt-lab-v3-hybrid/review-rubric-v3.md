# FLOW v3 compiled-proposal blind review rubric

You receive only opaque SourceOwnership, opaque SourceRows, and a final compiled proposal. You do not evaluate the compiler implementation, model quality, URL page, hidden expected answer, case identity, or business readiness.

## Item verdict

Review every positive proposal Item exactly once.

- `keep` / `supported_as_written`: source-grounded, executable as written, and correctly bounded.
- `edit`: the Item spine is usable but wording, intent, or completion needs a bounded correction.
- `remove`: the Item invents an action/fact/schedule/resource content or should have been omitted.

The Item keep rate is `keep / all reviewed Items`. Internal compiler metadata is not shown and receives no quality credit.

## Unsupported signals

Record every unsupported signal with class `action`, `date`, `repeat`, or `fact`, a real JSON path inside `compiledProposal`, and a literal quote at that path. Licensed surface grammar (`확인하기`, `완료하기`, `열어보기`) is not an unsupported action by itself. A resource Item may only open the named resource; it may not claim unseen contents or outcomes.

Any unsupported signal is a hard gate failure.

## Seven axes

Score each of the ten positive proposals from 1 to 5 and write a concrete comment for every axis.

1. `userNeedFit`: the bounded Items form a coherent narrow job without invented context.
2. `executionClarity`: actions and completion behavior are understandable.
3. `contentFidelityCoverage`: every SourceRow is represented or explicitly omitted without distortion.
4. `portability`: the proposed calendar/checklist/todo/sheet/memo target fits the Items and literal schedule evidence.
5. `cognitiveLoad`: the proposal avoids padding, duplication, and unnecessary structure.
6. `copySpecificity`: titles use concrete source words and minimal licensed grammar.
7. `sourceSafetySeparation`: supporting/reference boundaries, unseen resources, missing dates, and uncertainty are explicit.

Score anchors: 5 strong/no meaningful correction; 4 usable/minor wording improvement; 3 usable/material friction; 2 substantial correction; 1 unsafe or unusable.

## Case verdict

- `pass`: unsupported count is zero and every Item can be kept.
- `revise`: bounded edits are needed but the proposal remains usable.
- `fail`: unsupported or structurally wrong content makes the proposal unsafe or unusable.

Allowed `topIssueCode`: `null`, `generic_copy`, `classification_overreach`, `projection_mismatch`, `missing_uncertainty`, `row_policy_mismatch`, `unsupported_content`, `accounting_problem`, `wrong_insufficient_boundary`.

Return only the required review JSON array. Do not infer original URLs, hidden page content, provider/model quality, price, latency, or readiness.
