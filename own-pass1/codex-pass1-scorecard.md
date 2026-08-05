# Codex Pass 1 scorecard — sealed

- gate: `REVISE`
- contamination: `BLIND_CLEAN`
- observed users: `0`
- performance: `NOT_ASSESSED`
- actual browser 200% zoom: `NOT_RUN — ACTUAL_ZOOM_NOT_ASSESSED`

## Weighted score

| Category | Score | Weight | Weighted | Evidence summary |
|---|---:|---:|---:|---|
| State truth & lifecycle | 4/5 | 20 | 16 | Public/saved/execution/result, Back, reload, duplicate, retry, failure and stale saved-plan conflict were exercised. Flow Map stale-write loss prevents 5. |
| Action ownership & execution clarity | 4/5 | 15 | Plan edit, Item completion, save, transfer and receipt mutations were distinguishable. |
| Artifact projection & fidelity | 3/5 | 20 | Ordered IDs/counts/formats matched, but the persistent receipt did not contain the actual transport's raw SHA-256/byte length (`CX-002`). |
| Information architecture | 4/5 | 15 | Empty, 1/5/20-plan and detail/library states retained hierarchy across tested viewports. |
| Disclosure & safety | 4/5 | 15 | One-way and duplicate risk appeared before execution; errors preserved drafts and exposed recovery. |
| Terminology & copy | 4/5 | 5 | Current candidate separated public preview, saved plan, and result language; rollback flags restored legacy copy only under exact lowercase `off`. |
| Visual consistency & responsive behavior | 4/5 | 5 | 390×844, 1024×768, 1440×1000 and 720×500 proxy had no horizontal overflow or clipped interactive controls. |
| Accessibility & recovery | 4/5 | 5 | Keyboard, focus trap/return, labelled relations, alert/live region, and reduced motion passed; speech output was not assessed. |
| Total |  | 100 | **76/100** |  |

Stated Job Fit — internal heuristic: `4/5` (not weighted; deterministic reviewer simulation only, observed users 0).

## Gate evaluation

- hard fail: `YES — data loss through stale Flow Map overwrite (CX-001)`
- blocking findings: `0`
- weighted threshold: `PASS (76 ≥ 75)`
- required core subscore threshold: `FAIL — Artifact projection & fidelity is 3/5`
- chain of custody: `PASS`
- required scenario evidence: present; scenario-level revisions are listed below
- internal result: `REVISE`

## Scenario verdicts

| Scenario | Verdict | Runtime/static result |
|---|---|---|
| S01 | PASS | hit/review/miss/empty plus injected error evidence; public lookup persistent diff 0 |
| S02 | PASS | dated/undated/mixed capability states and effective counts checked |
| S03 | PASS | apply/cancel/Back/validation transaction evidence; public draft persistent diff 0 |
| S04 | PASS | destination identity, duplicate choice, atomic failure and retry checked |
| S05 | REVISE | preview/actual/receipt Item identity matched; raw transport receipt defect `CX-002` |
| S06 | PASS | 0/1/5/20 plan library and Today role evidence checked |
| S07 | PASS | completion wrote the checks owner, not the saved-plan record; reload preserved completion |
| S08 | PASS | cancel/error/reload byte preservation and stale-tab conflict recovery checked |
| S09 | REVISE | four formats/parsers checked; receipt raw-hash limitation `CX-002` |
| S10 | REVISE | choose-child/review-hold/atomic retry checked; stale Flow Map overwrite `CX-001` |
| S11 | PASS | closed/open disclosure, Enter/Space/Escape, focus return checked |
| S12 | PASS | pending lock, one artifact/receipt, reload, receipt-only retry and Back checked |
| S13 | PASS | legacy/malformed/missing-base reads preserved exact storage bytes |
| S14 | PASS | 1/8/24/50 Item density plus long Korean/emoji/special-character artifact checked |
| S15 | PASS | four required viewports/reflow proxy passed; actual 200% subcheck remains NOT_RUN |
| S16 | PASS | keyboard, DOM screen-reader relations, alert, focus and reduced motion checked |
| S17 | PASS | six flag cases; exact lowercase `off`, uppercase control, routes and zero writes verified |
| S18 | PASS | TSV tabs/quotes/newlines/UTF-8/CRLF/emoji full SHA-256 and parser round-trip checked |
| S19 | PASS | timezone/DST deterministic ICS, overdue and undated omission checked; actual browser DST traversal not claimed |
| S20 | PASS | Item 1 / series 1 / VEVENT 1 deterministic units and current 3/1/1 cross-check kept separate |
| S21 | REVISE | filename/MIME/download/clipboard captured; receipt raw-hash limitation `CX-002` |
| S22 | NOT_ASSESSED | no approved performance budget/trace; no PASS/FAIL inferred |
| S23 | REVISE | cross-surface concurrency exploration reproduced `CX-001` and controlled against saved-plan conflict handling |

## Identity and evidence gate

- candidate HEAD/upstream: `29cb03a65dd1037a3b813b7f43a5a095e4669dce` / clean / dirty false
- BUILD_ID: `V29H3kpreESrdkYwzy_q9`
- current `/flows`: HTTP 200, 12,274 bytes, SHA-256 `aa01ee57169181479af3053fda3be374d879d0fada0c024410fbf505cee22f52`, BUILD_ID present
- asset A: `64d5651df657c91e793dd1212788e293d6937947`
- index B: `83e78f97ea443c93caeb3ffc4bd419a9caf7b849`
- allowlist verification: 283/283 rows, 26,924,227 fetched bytes, zero byte/hash/product/build mismatches
- allowlist statuses: READY 274; CODEX_ONLY_READY 7; NOT_ASSESSED_ALLOWED 1; REVIEWER_ACTION_REQUIRED 1

