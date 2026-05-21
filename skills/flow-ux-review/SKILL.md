---
name: flow-ux-review
description: Use when reviewing FLOW pages, creator channels, exports, or content for user journey quality, cognitive load, portability to calendar/sheet/memo, and whether users can actually execute the Flow.
---

# FLOW UX Review

Use this skill for review, not initial generation.

## Required References

- `docs/flow-rules/quality-rubric.md`
- `docs/flow-rules/quality-gate.md`
- `docs/flow-rules/ux-copy.md`

## Review Passes

1. **User journey pass:** Start from the page top. Identify the first action, target tool, completion signal, and next step.
2. **Portability pass:** Check what becomes calendar, sheet, memo/notion, and internal check state.
3. **Cognitive-load pass:** Count competing cards, tabs, repeated buttons, and explanation blocks. Remove UI that exists only because the generic component supports it.
4. **Content fidelity pass:** Compare actions with the source shape. Flag generic filler or lost source-specific context.
5. **Copy pass:** Repair weak language using `docs/flow-rules/ux-copy.md`.
6. **Safety/source pass:** Verify source, creator experience, and risk are separated.

## Output Format

```md
Findings:
1. [Severity] [Area] Problem and user impact.

Rubric:
- User Need Fit:
- Execution Clarity:
- Content Fidelity:
- Portability:
- Cognitive Load:
- Copy Specificity:
- Source/Safety:
- Accessibility/Operability:

Recommended fixes:
1. ...
```

## Severity

- **Blocking:** User may misunderstand, unsafe claim, wrong destination, or source/risk mixing.
- **High:** User can proceed but likely cannot execute or export cleanly.
- **Medium:** Copy/load issue that adds friction.
- **Low:** Polish.
