---
name: flow-ux-review
description: Review drafted FlowMe UX and remove unnecessary controls, cards, labels, and explanations before checking journey quality, cognitive load, and executability.
context: fork
---

# FLOW UX Review

Use this as a distinct review pass after initial generation, not as the first
ideation step. Prefer subtraction and clearer hierarchy before adding guidance.

## Required References

- `docs/flow-rules/quality-rubric.md`
- `docs/flow-rules/quality-gate.md`
- `docs/flow-rules/ux-copy.md`

## Review Passes

1. **Subtraction pass:** Inventory every visible control, card, badge, heading, helper sentence, and status label. Delete anything that does not change the next action, prevent a material error, reveal necessary state, or enable recovery.
2. **User journey pass:** Start from the page top. Identify the first action, target tool, completion signal, and next step.
3. **Portability pass:** Check what becomes calendar, sheet, memo/notion, and internal check state.
4. **Cognitive-load pass:** Count competing cards, tabs, repeated buttons, and explanation blocks. Remove UI that exists only because the generic component supports it.
5. **Content fidelity pass:** Compare actions with the source shape. Flag generic filler or lost source-specific context.
6. **Copy pass:** First test whether copy can be deleted. Repair only necessary language using `docs/flow-rules/ux-copy.md`.
7. **Safety/source pass:** Verify source, creator experience, and risk are separated.

## Subtraction Gate

For each element, ask:

1. Does the user need it in the current decision, or can it appear on demand?
2. Does it add information not already expressed by layout, label, value, or state?
3. Would removing it block the primary scenario or create a meaningful error?
4. Is it user language, or internal product structure exposed as explanation?

Delete by default:

- descriptions that restate a heading, button, selected value, or visible state;
- generic value propositions, motivation, and feature explanations inside an operational screen;
- duplicate actions, repeated status labels, decorative badges, and cards used only to group one simple row;
- instructions that merely narrate a familiar control;
- advanced options shown before they affect the current task.

Keep or progressively disclose:

- accessibility names and operability cues;
- source attribution, caution, irreversible consequence, privacy, and safety boundaries;
- error, empty, loading, permission, recovery, undo, and destructive-action states;
- information needed to choose between materially different outcomes.

Use one primary action per local decision context. An explanation earns permanent
screen space only when it communicates a consequence, exception, risk, or
recovery path that the control itself cannot express.

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

Subtraction:
- Removed:
- Kept because:
```

## Severity

- **Blocking:** User may misunderstand, unsafe claim, wrong destination, or source/risk mixing.
- **High:** User can proceed but likely cannot execute or export cleanly.
- **Medium:** Copy/load issue that adds friction.
- **Low:** Polish.
