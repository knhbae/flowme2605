# Design fidelity ledger v1

Final Gallery SHA-256:
`021667d19d042a5dfd418f3dbcbf553fd871a08b0fd47703fe716538419aaf56`

This ledger compares the generated visual concepts with the implemented local
prototype. It is design QA evidence, not observed-user validation.

| # | Concept intent | Implemented result | Fidelity / deliberate change |
|---|---|---|---|
| 1 | Keep a three-pane desktop workbench: navigation, corpus list, working surface, evidence/review rail. | Desktop keeps the left rail and content list, a wide execution surface, and a right source/loss/review rail. | High fidelity. The right rail stays empty until a content is selected so an unreviewed result is not implied. |
| 2 | Put real content before architecture definitions. | The first screen opens 41 Product candidates and leads with 110 normal/structure contents, 893 Items, 1,172 SourceRows and 550 projection cells. | High fidelity. The above-fold copy is now “설명보다 실제 Flow 110개를 먼저 봅니다” instead of an architecture-first explanation. |
| 3 | Make source facts, personal overlay and projection loss visually distinct. | Source/provenance, personal pacing, generated occurrence and projection loss use separate labels and surfaces in Flow, pacing, event and lineage views. | High functional fidelity. Color is intentionally quieter than the concept so status text remains primary evidence. |
| 4 | Preserve all review functions on small screens. | Tablet/mobile keep Gallery, full Item detail, five projection tabs, source dialog, review dialog, next-unreviewed navigation and a filter drawer with focus restoration. | High functional fidelity, lower spatial fidelity. The desktop side rails become a drawer and bottom actions instead of being squeezed into one screen. |
| 5 | Show the canonical lineage as a spatial data graph. | The lineage view exposes the current content’s SourceRow→Item→Step→Flow→Bundle→UserFlowCopy→Occurrence→Projection nodes and actual JSON/provenance. | Medium visual fidelity, high data fidelity. A readable selectable chain replaces the more decorative graph concept on mobile. |
| 6 | Compare Calendar, Checklist, Todo, Sheet and Memo from one canonical source. | Every normal content exposes all five tabs with recommendation, availability, fidelity, record counts, preserved fields, losses and fallback. | High fidelity. A format can remain visible while being explicitly `not_recommended` or blocked rather than being presented as equally good. |
| 7 | Let undated content become a personal plan without rewriting source truth. | WEB1 and 52 other pacing routes support start/end policy, weekdays, rest dates, time/all-day, bundle mode and Todo-due versus Calendar preview. | High fidelity. Source schedule and user overlay remain separately labeled and no preview is treated as confirmed source data. |
| 8 | Treat events as Series/Edition/Occurrence plus user intent. | Event views show windows, ticket/booking milestones, occurrence status and intent-specific VEVENT/VTODO preview. | High functional fidelity. First-click default intent, date-only windows and milestone provenance were corrected during browser QA. |
| 9 | Do not ask the user to re-enter facts already present in the source. | Twenty source-provided values render as source facts, while `minimumInputs` contains only genuine user overlays. | High fidelity. This normalization was regenerated after the independent review and was therefore rechecked through the final Gallery route audit rather than attributed to that review. |

## Final screenshots

- `visual-evidence/gallery-desktop-1440x900-final.jpg`
- `visual-evidence/gallery-tablet-768x1024-final.jpg`
- `visual-evidence/gallery-mobile-390x844-final.jpg`
- `visual-evidence/gallery-mobile-detail-top-390x844-final.jpg`

The older `*-v1.png` files are superseded visual drafts. Final browser QA and
the validation report reference only the `*-final.jpg` evidence above.
