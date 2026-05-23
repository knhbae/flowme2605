# 2026-05-23 Source Risk Representative Review

This pass reviews the first three routes from the PR #25/#26 source-risk hardening work. It does not change public representative exposure.

## Decisions

| Flow | Decision | Reason | Current hold |
| --- | --- | --- | --- |
| `computer-skills-d30-study` | Representative candidate | Low risk, exact source, clear D-30 anchor, calendar plus score/error logs, and item copy tied to study artifacts. | Needs mobile first-screen QA and export preview review before actual allowlist/source-fit promotion. |
| `new-car-delivery-check` | Public MVP candidate | The evidence table is concrete and useful, but the route involves money-at-risk signing decisions. | Keep out of representative exposure until field/evidence UX is manually checked. |
| `diet-habit-2week` | Public MVP candidate | Sheet-first observation and stop conditions are now explicit, but the route is medical-sensitive. | Keep out of representative exposure until warning hierarchy and first-screen load are manually checked. |

## FLOW UX Review

Findings:
1. **Medium / Promotion Queue:** The three routes were indistinguishable from the broader fix bucket even after PR #25/#26, so operators could not see which route should be reviewed first.
2. **Medium / Risk Boundary:** `new-car-delivery-check` and `diet-habit-2week` are stronger than the rest of the fix queue, but representative labels would overstate readiness without usage evidence.
3. **Low / Operability:** `computer-skills-d30-study` is the only low-risk route in this pass and has the clearest path to representative status.

Rubric:
- User Need Fit: computer 4, new-car 4, diet 4
- Execution Clarity: computer 4, new-car 4, diet 4
- Content Fidelity: computer 4, new-car 4, diet 4
- Portability: computer 4, new-car 4, diet 4
- Cognitive Load: computer 3, new-car 3, diet 3
- Copy Specificity: computer 4, new-car 4, diet 4
- Source/Safety: computer 4, new-car 3, diet 3
- Accessibility/Operability: computer 3, new-car 3, diet 3

Recommended fixes:
1. Surface the three-route readiness queue in Flow Lab.
2. Keep all three lifecycle classifications as `fix` until final page QA.
3. Promote `computer-skills-d30-study` first only after mobile/desktop screenshots and export copy pass.

## Next Promotion Gate

- `computer-skills-d30-study`: candidate for the next final promotion PR.
- `new-car-delivery-check`: public MVP candidate after evidence-table QA.
- `diet-habit-2week`: public MVP candidate after warning/card priority QA.
