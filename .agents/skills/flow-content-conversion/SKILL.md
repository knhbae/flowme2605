---
name: flow-content-conversion
description: Use when converting creator, official, blog, video, or experience content into FLOW items, including choosing structure type, destination, action count, source/risk separation, and export shape.
---

# FLOW Content Conversion

Use this skill when creating or revising Flow content.

## Required References

Read only the needed sections:

- `docs/flow-rules/product-principles.md`
- `docs/flow-rules/quality-rubric.md`
- `docs/flow-rules/content-conversion-playbooks.md`
- `docs/flow-rules/ux-copy.md`

## Workflow

1. Define the user need in this form: `As a..., I need to..., so that...`.
2. Identify the original content shape: single video, program, official guide, checklist, timeline, reference, habit, recipe, etc.
3. Choose primary destination: `calendar`, `sheet`, `memo`, `internal_check`, or `hybrid`.
4. Choose structure type only after the destination is clear.
5. Pick the closest playbook default, then state any exception.
6. Write the first action before supporting explanation.
7. Separate source facts, creator experience, and cautions.
8. Score the result with the quality rubric.
9. Revise the lowest scoring dimension before adding more content.

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
- Do not collapse complex real programs into one action if the user needs staged decisions.
- Do not use generic motivation copy to fill missing content.
- Do not treat creator experience as official guidance.
