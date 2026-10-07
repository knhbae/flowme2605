# Task-first mixed writing local candidate

Status: approved local implementation; not published or Alpha-bound.
Baseline: 76e833002d2c5714c085ab6fb1fbbb34e93d6cb3 / To6Pk38m21YLMbg5AFsmN.

The user's 2026-10-07 goal adopts the intake findings and requests an implemented local journey: write ordinary text and todos without choosing a title or filing location; explicitly classify and date individual tasks; execute them and return to the same writing; connect a memo only when needed.

Use the existing permanent document and Item storage. Explicit writing entry creates one visible `작성한 글`, reuses only the current eligible blank writing, and remembers its ID. Saving and view switching never create documents. This is an entry UX change, not a claim that the underlying document model has been removed.

Classification is an explicit local command for one ordinary canonical personal Item. Do not infer a new class from editing surrounding text or moving a document. Keep all other Item owners, dates, notes, records, and source/reference IDs. The authenticated Alpha shell must not expose this command until its server contract is separately supported.

Keep the native textarea and raw character geometry during active editing. In live document mode a decoration may paint a checkbox or folder cue, but it must preserve the first raw Text node, caret, selection, wrapping, and native history. Preserve native IME painting where transforming it cannot be shown safe; real OS IME validation remains separate from synthetic composition checks.

Primary controls are the visible current view, new writing, add, and input Undo. Raw and management actions live in existing disclosures, with visible focus return targets.

Excluded: existing-data migration/reclassification, deletion policy, editor rewrite, real account writes, Alpha switching, public commit/push/PR/CI, and operations changes. Reopen the server-classification contract and full transformed IME only as separately scoped work after local findings.
