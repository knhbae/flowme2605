# Broad Source Route Review

Date: 2026-05-25
Scope: real-source routes whose current source is a channel, site, or broad reference rather than a route-level original.

## Decision

Broad source routes are not representative candidates. They can remain accessible for internal catalog review or direct QA, but they need either an exact source replacement or a narrower official reference before public MVP or representative framing.

This review does not mark any route validated.

## Review Rules

- A broad creator channel is not enough for an executable Flow. Pick the exact video, playlist, post, or program page first.
- A broad brand or creator site is not enough when the action depends on a specific routine, diet rule, measurement method, or study scope.
- A broad official portal can be used as a safety/reference entry point, but representative framing still needs route-specific official pages or destination-specific source links.
- Do not fill missing source detail with invented steps.
- If the source cannot support source-derived rows, use a memo, checklist, comparison table, routine, or log instead of a forced progress table.

## Route Decisions

| Route | Current source shape | Current UX risk | Decision | Required next source work |
|---|---|---|---|---|
| `real-thankyou-bubu-home-workout-starter` | ThankyouBUBU channel page | User knows the channel but not the exact starter workout to follow. | Keep out of representative/public MVP. | Replace with an exact starter video or starter playlist; preserve original video link, summary, guide, log, and stop condition. |
| `real-thankyou-bubu-20min-routine` | ThankyouBUBU channel page | "20 minutes" sounds executable, but the route does not identify which 20-minute source. | Keep out of representative/public MVP. | Replace with one exact 20-minute video or a source-defined routine playlist before scheduling. |
| `real-fitvely-diet-record-routine` | FITVELY site | A generic site does not tell the user which diet rule or record shape to apply. | Keep out of representative/public MVP. | Replace with an exact diet/log source; keep the artifact memo- or sheet-first and avoid outcome claims. |
| `real-fitvely-weekly-body-check` | FITVELY site | Measurement behavior needs a concrete source method and stop/consult boundary. | Keep out of representative/public MVP. | Replace with an exact body-check source; separate measurement row, observation note, and stop/consult condition. |
| `real-sinagong-computer-d30-study` | Sinagong site / broad study material | Study progress can look source-derived, but the route needs exact curriculum, exam scope, past-exam round, or weekly-plan links. | Keep as fix/catalog review, not representative. | Attach exact source rows before any stronger study-progress framing. |
| `real-pet-health-visit-routine` | Animal protection FAQ page | FAQ source is official-adjacent but not specific enough for a pet hospital visit execution memo. | Keep as fix/catalog review. | Replace or supplement with a route-specific official or veterinary visit-prep source; separate source facts, caregiver notes, and contact-professional triggers. |
| `real-mofa-overseas-travel-prep` | MOFA safety portal | Broad official portal is useful as a safety entry point, but destination-specific details are missing. | Allow as broad official reference only; do not promote. | Add country/page-specific MOFA links or travel-safety checklist pages before public MVP or representative framing. |

## Conversion Decisions

Conversion decision:
- User need: As a FLOW editor, I need broad-source routes separated from exact-source routes, so users are not asked to act on missing source detail.
- Content shape: channel pages, broad creator sites, broad official portals, and broad study material sites.
- Primary destination: depends on replacement source; do not choose a richer artifact until the source is exact enough.
- Structure: keep existing direct routes as catalog review/fix candidates.
- Action count: do not expand action count to compensate for missing source specificity.
- Playbook: creator channel collection, single fitness video, diet/body-composition, exam prep, health logistics, and official-service playbooks apply only after source narrowing.
- Exceptions: MOFA can remain a broad official reference entry point, but still needs route-specific links before promotion.
- Risk/source handling: source, creator experience, and cautions stay separate; broad sources cannot be treated as proof of execution clarity.

## Quality Notes

Findings:
1. High source fidelity risk: channel/site sources create the feeling of real provenance without telling the user which artifact to execute.
2. High execution clarity risk: workout, diet, study, pet health, and travel routes can look actionable while hiding source selection work from the creator.
3. Medium cognitive-load risk: adding more cards or explanation would increase work for the user without solving the missing source.

Recommended fixes:
1. Replace creator channel/site URLs with exact videos, posts, playlists, or program pages before promotion.
2. Add source-derived rows only when the exact source has rows.
3. Keep broad official portals as reference links, not representative evidence.

## Follow-Up Queue

1. Replace or demote the two ThankyouBUBU broad channel routes.
2. Replace or demote the two FITVELY broad site routes.
3. Attach exact curriculum/exam-scope links before using the Sinagong broad route as a study-progress example.
4. Re-source the pet-health visit route with a route-specific visit-prep reference.
5. Add destination-specific MOFA links before using the travel route beyond direct QA.
