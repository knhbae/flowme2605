# P25-02A Audit

## Root Cause

The service had two different mental models after save. The first-save panel showed a static full list, while returning My Flow led through Today summaries, status cards, and a separate inventory. A saved Flow could therefore look complete at save time but collapse back to one next item later.

## Implemented

1. One effective-row outline groups a Flow by its visible sections.
2. Post-save uses that outline and keeps exact row counts.
3. `내 Flow 열기` opens the saved Flow itself.
4. A selected or single returning Flow renders the complete interactive outline instead of a duplicate next-item card.
5. Local navigation now reads `지금 / 내 Flow / 완료`.
6. `완료` keeps a persistent route to cancel completion.

## Current Browser Evidence

| Scenario | Viewport | Result |
| --- | ---: | --- |
| Moving post-save | 390x844 | complete 5-row artifact visible |
| Moving returning Flow | 390x844 | complete 5-row interactive outline visible |
| Completion then reopen | 390x844 | completed count 1 -> 0 |
| Moving returning Flow | 1024x768 | same outline contract and 5 rows visible |

## Residual P25-02B Finding

The wide screen still inherits a card-grid width intended for multi-Flow summaries. The complete outline is correct but visually occupies only the left third of the canvas. This is a High responsive-composition gap, not a data or projection defect.

No actual user observed this build. Screenshots and Playwright assertions are automated browser evidence only.

