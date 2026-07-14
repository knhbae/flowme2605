---
name: flow-content-conversion
description: Use when converting creator, official, blog, video, or experience content into FLOW items, including choosing structure type, destination, action count, source/risk separation, and export shape.
---

# FLOW Content Conversion

Use this skill when creating or revising Flow content.

## Required References

Read only the needed sections:

- `docs/flow-rules/product-principles.md`
- `docs/flow-rules/source-to-flow-conversion-gate.md`
- `docs/flow-rules/flow-content-source-selection.md`
- `docs/flow-rules/study-progress-tables.md` when the source is study or curriculum content
- `docs/flow-rules/quality-rubric.md`
- `docs/flow-rules/content-conversion-playbooks.md`
- `docs/flow-rules/ux-copy.md`

## Workflow

1. Define the user need in this form: `As a..., I need to..., so that...`.
2. Identify the original source shape: single video, resource library, official guide, checklist, timeline, table/file, reference, habit, recipe, etc.
3. Apply the Source-to-Flow Conversion Gate before choosing a playbook.
4. Identify the source row unit: article/video row, D-day offset, table row, row group, month-age row, lesson row, or checklist row.
5. If source rows are insufficient, mark the candidate as `Park`, `hold`, or `source_import_required` instead of filling Items from general knowledge.
6. Choose primary destination: `calendar`, `sheet`, `memo`, `internal_check`, or `hybrid`.
7. Choose structure type only after the destination is clear.
8. Pick the closest playbook default, then state any exception.
9. Split content into Item / Field / Memo:
   - Item: source-derived checklist-level action worth checking.
   - Field: value needed for scheduling, sorting, filtering, export, repeat generation, or future Step generation.
   - Memo: details, links, quantities, subjective notes, exceptions, and freeform user notes.
10. Write the first action before supporting explanation.
11. Separate source facts, creator experience, and cautions.
12. Score the result with the quality rubric.
13. Revise the lowest scoring dimension before adding more content.
14. For catalog expansion, record `lifeArea`, `planningPattern`, `portfolioRole`, and the pre-app promotion state separately from the single-source conversion decision.
15. Before handoff, keep user-facing `contentBundles` separate from internal review records and attach a comment to every score.
16. For sparse official lifecycle sources, allow one primary Item only when the source defines the due window and conditional next step; do not pad the Flow with agency-internal phases.
17. For creator/operator templates, require a complete reusable row set and a natural destination. Reject broad strategy text that still makes the user design the plan.
18. For translated sensitive sources, verify that the care, insurance, legal, document, or administrative context applies to the target locale before promotion.

## Output Shape

When reporting conversion decisions, use:

```md
Conversion decision:
- User need:
- Content shape:
- Primary destination:
- Structure:
- Action count:
- Playbook:
- Exceptions:
- Risk/source handling:
```

## Guardrails

- Do not create extra actions to look thorough.
- Do not split source details into many Items when one checkable action plus memo/detail is enough.
- Do not collapse complex real programs into one action if the user needs staged decisions.
- Do not use generic motivation copy to fill missing content.
- Do not treat creator experience as official guidance.
- Do not promote a candidate from scores alone when source rows, omission reasons, export mapping, or rights/risk boundaries are missing.
- Do not reject a useful official lifecycle merely because it has one real action, and do not add low-value actions to raise the count.
- Do not treat translation as localization evidence for health, hospital, legal, or administrative content.
