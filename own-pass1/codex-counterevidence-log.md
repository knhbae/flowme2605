# Codex counterevidence log — sealed

- session: `cbfbea41-d6c7-436a-beb6-dd7d14a07761`
- runtime: `http://127.0.0.1:3114`
- observed users: `0`

| Hypothesis challenged | Attempt | Result | Evidence / boundary |
|---|---|---|---|
| Editing cancel does not change canonical plan or source | Changed a public-plan title, invoked cancel/Back dirty handling, and compared storage; checked allowlisted S03 before/after records. | NOT_REPRODUCED | Dirty cancel/Back required discard confirmation; public persistent storage stayed byte-equal. Apply changed only the in-memory public draft. Source link stayed the same. |
| Save routes to the current plan detail | Saved an undated public plan and inspected the destination URL/storage identity. | NOT_REPRODUCED | Routed to `/my?view=flows&flow=personal-copy:…`; the query identity matched `flow:saved:personal-copy:…` and the detail showed 24 Items. |
| Item completion is a different mutation from plan edit save | Completed the first Item in a 10-Item personal copy, reloaded, then compared storage owners. | NOT_REPRODUCED | Saved-plan record SHA stayed unchanged; `flow_builder_mvp_checks_personal-copy:…` added the Item completion; reload showed 1/10. Reopen removed the check without editing the plan record. |
| Same scope/format preview and actual artifact use the same Item set | Captured saved checklist confirmation attributes, clipboard, receipt and reload state. | NOT_REPRODUCED for Item identity; separate transport defect found | Ordered 24 Item IDs, count, scope, format, request ID and snapshot matched. Actual clipboard raw bytes were not verifiable from the receipt (`CX-002`). |
| Duplicate/retry does not duplicate saves or receipts | Repeated public save to reach the explicit existing-copy decision without writing; checked allowlisted S12 synchronous double-click and receipt-only retry. | NOT_REPRODUCED | Second public save wrote nothing until overwrite/new-copy choice. S12 recorded one clipboard write, one success, one request-ID receipt, and receipt-only retry after persistence failure. |
| Reload does not mix saved and unsaved state | Reloaded completed Item and successful receipt; compared persistent records. | NOT_REPRODUCED | Completion stayed checked after reload; receipt registry was byte-preserved; unsaved public draft had no persistent write. |
| Material risk is discoverable before action | Opened quick/saved transfer confirmation and warning help by keyboard. | NOT_REPRODUCED | One-way and duplicate-risk text appeared before execute; Enter opened the explanation, Escape returned focus. |
| Undated Items are not invented into calendar events | Used an undated 24-Item plan and inspected transfer options plus S19 raw parser evidence. | NOT_REPRODUCED | Calendar was unavailable with 0 dated / 24 undated; S19 explicitly omitted the undated Item; no VEVENT was invented. |

## Additional counterevidence and free exploration

### CE-009 — Saved-plan stale-write control

- choice recorded before execution: same personal-copy route in two tabs, 390×844; edit titles A/B from the same starting record; save A then stale B.
- result: stale B was blocked with a recoverable conflict alert, A remained canonical, and B's dirty editor stayed open.
- use: This falsified the explanation that browser-local persistence cannot support concurrency checks and became the control for `CX-001`.

### CE-010 — Flow Map stale-write comparison

- route/seed: `/flow-maps/middle-school-math-1`, two tabs opened before either save.
- A: title `Map Concurrent A`, first step excluded; save produced 7 steps.
- B: title `Map Concurrent B`, second step excluded; stale save also reported success and replaced A.
- result: REPRODUCED `CX-001`.

### CE-011 — Receipt hash alternative explanation

- confirmation/receipt Item IDs, counts, request ID, snapshot version and format were compared and matched.
- clipboard readback: 3,728 UTF-8 bytes, 71 lines, CRLF, SHA-256 `fbb9f947f1bf4a3f8c40217d9b8a434bf3d55a5f504f3b1ae438d69759c505b2`.
- receipt: 3,658 bytes, 8-hex `c6bd6f30`.
- conclusion: likely pre-transport LF hashing versus Windows clipboard CRLF normalization; this explains the 70-byte delta but does not satisfy raw transport SHA-256 identity.

## Runtime and evidence controls

- Current runtime identity: `/flows` HTTP 200; 12,274 bytes; SHA-256 `aa01ee57169181479af3053fda3be374d879d0fada0c024410fbf505cee22f52`; BUILD_ID present.
- Public lookup hit/review/miss/empty each preserved the same persistent-storage hash; expected Next/RSC prefetch aborts were classified separately from unexpected failures.
- Public quick checklist: exactly zero localStorage writes before and after execute; 24 IDs in confirmation and success.
- Public save one-shot storage failure: byte-equal storage, visible role=alert recovery, retry control preserved.
- Reduced motion: `prefers-reduced-motion: reduce` true; dialog animation/transition duration `0.00001s`.
- Keyboard/focus: help trigger → Enter → close button; Tab trapped; Escape returned focus; error exposed role=alert.
- Reflow: 390×844, 1024×768, 1440×1000 and 720×500 each had document width equal client width and no horizontally clipped interactive controls.
- S17: all six default/exact-lowercase-off/uppercase-OFF public and `/my` cases preserved sentinels and produced zero unexpected writes.
- Evidence transport: all 283 allowlist rows re-fetched and verified for declared byte length, SHA-256, product SHA and BUILD_ID; failures 0.
- Performance remained `NOT_ASSESSED`; actual browser 200% zoom remained `NOT_RUN — ACTUAL_ZOOM_NOT_ASSESSED`.

