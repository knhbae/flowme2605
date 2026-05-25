# Broad Source Route Review

Date: 2026-05-25
Scope: real-source routes whose current source is a channel, site, or broad reference rather than a route-level original.

Update: `real-thankyou-bubu-home-workout-starter`, `real-thankyou-bubu-20min-routine`, `real-fitvely-diet-record-routine`, `real-sinagong-computer-d30-study`, `real-pet-health-visit-routine`, and `real-mofa-overseas-travel-prep` received exact source replacements later on 2026-05-25. `real-fitvely-weekly-body-check` moved to hidden broad-source decision because no exact FITVELY weekly body-check/check-in source was confirmed. The current active broad-source guard queue is 0 routes.

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
| `real-thankyou-bubu-home-workout-starter` | Exact ThankyouBUBU video assigned after this review | User no longer has to choose the video, but the route still needs exact-video first-screen reshaping. | Keep out of representative/public MVP. | Reshape around original video, execution summary, condition log, and stop condition. |
| `real-thankyou-bubu-20min-routine` | Exact ThankyouBUBU video assigned after this review | The repeated video is now identified, but high-intensity routine guidance still needs clearer rest/stop hierarchy. | Keep out of representative/public MVP. | Reshape around original video, weekly routine calendar, adjustment memo, and stop condition. |
| `real-fitvely-diet-record-routine` | Exact FITVELY nutrition video assigned after this review | The source is now exact, but the route still needs a tighter spreadsheet-first diet log and stop/consult condition. | Keep out of representative/public MVP. | Reshape around selected source rule, one application, one observation row, and stop condition. |
| `real-fitvely-weekly-body-check` | FITVELY site; exact search did not confirm a matching weekly check-in source | Measurement behavior would require invented measurement/photo/adjustment rules. | Hide/remove candidate until matching source exists; keep out of representative/public MVP. | Do not rewrite from the broad site. Restore only if an exact FITVELY body-check source is found, then separate measurement row, observation note, and stop/consult condition. |
| `real-sinagong-computer-d30-study` | Exact Gilbut/Sinagong book page assigned after this review | The source boundary is now exact, but the route still needs source-derived progress rows and score/wrong-answer rows. | Keep as fix/source review, not representative. | Reshape or merge with the existing `computer-skills-d30-study` representative-eligible route. |
| `real-pet-health-visit-routine` | Exact 서울시 우리동네 동물병원 official page assigned after this review | The source now supports designated hospital visit, required documents, and essential treatment fields, but it is region/eligibility-limited. | Keep as fix/catalog review. | Reshape around Seoul eligibility, designated hospital, required documents, essential treatment items, visit result memo, and professional-contact triggers. |
| `real-mofa-overseas-travel-prep` | Exact 외교부 베트남 국가/지역별 정보 page assigned after this review | The source now supports country-specific warning level, safety notices, embassy contacts, and local emergency numbers, but the route still needs country-check UX. | Keep as reshape, not public MVP/representative. | Reshape around country confirmation date, safety notice check, embassy/emergency card, and family-share memo. |

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

1. Reshape the two ThankyouBUBU exact-source replacements before any representative/public MVP framing.
2. Keep `real-fitvely-weekly-body-check` in hidden broad-source decisions until a matching measurement/check-in source is found, or remove the route.
3. Reshape or merge the Sinagong exact-source route before using it beyond direct QA.
4. Reshape the pet-health visit route around the 서울시 support-program source before any stronger exposure.
5. Reshape the MOFA travel route around the country-specific source before using it beyond direct QA.
