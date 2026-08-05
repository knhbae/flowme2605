# Codex Pass 1 findings — sealed

- review session: `cbfbea41-d6c7-436a-beb6-dd7d14a07761`
- candidate: `29cb03a65dd1037a3b813b7f43a5a095e4669dce`
- build: `V29H3kpreESrdkYwzy_q9`
- evidence A: `64d5651df657c91e793dd1212788e293d6937947`
- index B: `83e78f97ea443c93caeb3ffc4bd419a9caf7b849`
- observed users: `0`
- contamination: `BLIND_CLEAN`

## CX-001 — Flow Map stale-tab save silently overwrites the first tab's different selection

- severity: HIGH
- status: REPRODUCED
- scenario / route / state / viewport: S10 + S23 / `/flow-maps/middle-school-math-1` / two stale editors in one isolated BrowserContext / 390×844
- user task: Adjust a Flow Map in two already-open tabs, then save each edit.
- observed fact: Tab A saved title `Map Concurrent A` with 7 steps, excluding `math-prime-factorization`. A stale Tab B then saved title `Map Concurrent B` with 7 steps, excluding `math-integers-rationals`. Both actions showed success. The final `flow:map:persistence:middle-school-math-1` record contained only Tab B's title and step set; no conflict state was shown.
- expected invariant: A stale Flow Map save must not silently replace a newer saved map. It must reject the stale write, merge without loss, or require an explicit overwrite decision.
- reproduction:
  1. Open `/flow-maps/middle-school-math-1` in tabs A and B before either tab writes.
  2. In A, open `flow-map-adjust-save-mobile`, set title `Map Concurrent A`, exclude the first step, and apply.
  3. In B, set title `Map Concurrent B`, exclude the second step, and apply.
  4. Save A with `flow-map-save-all-mobile`, then save stale B.
  5. Read `flow:map:persistence:middle-school-math-1` and the success/alert UI.
- evidence IDs: `RT-S10-CONCURRENT-MAP-20260805`, `RT-S23-SAVED-CONFLICT-CONTROL-20260805`, `A/S10/state.json` SHA-256 `8e4c88ef738ec3dfc3a178d635132d9de83ec8b3bd2780e900f0e2063c741500`
- storage / payload / artifact trace: after A, map title `Map Concurrent A`, `savedAt=2026-08-05T09:50:56.762Z`, step IDs omitted `math-prime-factorization`; after B, title `Map Concurrent B`, `savedAt=2026-08-05T09:50:57.139Z`, step IDs omitted `math-integers-rationals`. The raw map record changed and only one saved map identity remained.
- alternative explanation tested: An identical two-tab save produced one saved identity and only refreshed timestamps. More importantly, the saved-plan editor on `/my` rejected the same stale-tab pattern with “저장된 계획이 다른 화면에서 바뀌었습니다,” preserved Tab A's title, and kept Tab B's dirty editor open. This isolates the failure to Flow Map persistence conflict handling rather than an unavoidable localStorage limitation.
- smallest correction boundary: Add an optimistic-concurrency token/version check to the atomic Flow Map persistence transaction and surface the same recoverable stale-write conflict used by the saved-plan editor. Preserve the losing tab's draft.
- not proven: Cross-device or remote-provider behavior; the internal source-level cause; automatic merge behavior for non-overlapping map edits.

## CX-002 — Persistent receipt does not identify the actual transported bytes with raw SHA-256

- severity: MEDIUM
- status: REPRODUCED
- scenario / route / state / viewport: S05, S09, S21, S23 / saved checklist transfer on `/my` / confirmation → clipboard → receipt → reload / 390×844
- user task: Copy a saved 24-Item checklist and use its receipt to verify exactly what was delivered.
- observed fact: The actual clipboard readback was 3,728 UTF-8 bytes with CRLF line endings and SHA-256 `fbb9f947f1bf4a3f8c40217d9b8a434bf3d55a5f504f3b1ae438d69759c505b2`. The persisted receipt recorded `payloadByteLength: 3658` and `payloadHash: c6bd6f30`, an 8-hex digest. Confirmation and receipt kept the same request ID, 24 ordered Item IDs, snapshot version/hash, format, and counts, but the receipt cannot verify the actual transported bytes.
- expected invariant: Preview/confirmation, actual artifact, and receipt must be comparable by ordered Item identity and a full raw SHA-256 of the bytes that were actually delivered (or by a clearly declared canonical-byte normalization that also hashes to SHA-256).
- reproduction:
  1. Save `/f/moving-d30-basic` without dates.
  2. On its `/my` detail, open `my-flow-export-entry`, choose checklist, and capture `my-flow-transfer-confirmation` attributes.
  3. Execute `my-flow-transfer-confirm`, read the clipboard bytes, and compute SHA-256.
  4. Parse `flow:export-receipts:v1`, then reload and confirm the receipt persists.
  5. Compare receipt artifact length/hash with the actual clipboard readback.
- evidence IDs: `RT-S05-CHECKLIST-TRANSPORT-20260805`, `RT-S21-RECEIPT-RELOAD-20260805`, `A/S21/transport-manifest.json` SHA-256 `846cb7beb87e430c30101168a29d32da9e861e2550c68b25408a6e9883284f92`, `A/S18/parser-result.json` SHA-256 `d885751e933a9d00d957688c27405977e8fbd10a54788f9e122459f32c402007`
- storage / payload / artifact trace: request ID stayed `saved_transfer::personal-copy:…::fbdca209-…`; receipt storage key `flow:export-receipts:v1`; ordered Item IDs and count 24 matched; actual clipboard line count 71. The 70-byte length delta is consistent with LF→CRLF transport normalization, but the receipt does not declare that normalization or store a full SHA-256.
- alternative explanation tested: Scope, Item IDs, counts, format, request ID, snapshot version, and persisted receipt identity all matched, so this is not an Item-set divergence. The allowlisted S18 TSV artifact independently passed full SHA-256 and CRLF/UTF-8 round-trip checks, showing that full raw-byte evidence is feasible.
- smallest correction boundary: Store `sha256` as a full 64-hex digest and `byteLength` for the final transported representation. If clipboard normalization is platform-dependent, store both canonical payload SHA-256 and observed transport SHA-256 with explicit newline policy.
- not proven: Semantic character loss in the copied checklist (none observed); clipboard bytes on non-Windows platforms; whether every download format has a byte-length mismatch.

## Review boundaries

- Performance: `NOT_ASSESSED`.
- Actual browser 200% zoom: `NOT_RUN — ACTUAL_ZOOM_NOT_ASSESSED`; 720×500 was used only as a reflow proxy.
- Screen-reader speech output was not captured; DOM name/role/relation, live regions, keyboard operation, focus trap/return, and reduced motion were assessed.
- Actual browser clock traversal across a DST transition was not claimed; commit-pinned deterministic ICS generation/parser evidence was checked.
