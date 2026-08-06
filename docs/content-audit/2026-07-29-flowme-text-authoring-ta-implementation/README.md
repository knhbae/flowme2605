# FlowMe Text Authoring TA local implementation evidence

Initial date: 2026-07-29; current checkpoint: 2026-07-31
Worktree: `D:\flowme2605\flow-text-authoring-ta`
Branch: `codex/text-authoring-ta-implementation-20260729`
HEAD: `c09f859b30b854f6f897b8ec1eb781fd774fbeca`
Current local build ID: `dSlinwCU2I5e4VJl2kMKL`
Checkpoint status: canonical grammar v1, live authoring, representative examples, and short-screen goal complete/pass locally; the earlier Vercel Preview remains on its prior snapshot; production unchanged

## Claim boundary

This package records a local implementation checkpoint, not a release.

- The branch was created from `c09f859`, the current `origin/main` baseline at
  the start of this work.
- At this checkpoint the TA changes are uncommitted. They have not been pushed,
  opened as a PR, or merged. An authenticated Vercel Preview from the preceding
  snapshot is [READY](./vercel-preview-deployment-ko.md), but it does not claim
  the current live-authoring/example changes. Production was not changed.
- P35 remains the production baseline.
- Observed-user validation is excluded from this internal PoC and is not
  claimed.
- AI/provider behavior, accounts, cloud persistence or synchronization, OAuth,
  direct Calendar/Todo/Sheet writes, creator marketplace/publishing, and public
  publishing are outside this TA.
- Automated tests, screenshots, browser inspection, and build results are QA
  evidence only. They must not be described as observed-user validation.
- This checkpoint closes the bounded local Text Authoring v1 implementation,
  live preview and representative-example extension, scoped visual finish, P0
  hardening, and Codex lane with verdict
  `ready_for_three_party_internal_review`. It does not close the overall
  three-party gate, observed-user validation, or publication.

## Implemented product slice

### Route and responsive workspace

- `app/flows/new/page.tsx` defaults to `TextAuthoringWorkspace`.
- `components/flow/text-authoring/*` owns the Input, Structure, and Result
  workflow, the outline editor and contextual inspector, artifact preflight,
  draft library, recovery, and receipt surfaces.
- The intended responsive composition is staged at 390px, two-pane plus
  contextual drawer at 1024px, and source/outline/artifact at 1440px.
- The accepted Claude `0729_1412` reference contributes the responsive
  structure and interaction model, while color and component treatment remain
  in the existing FlowMe visual system. Desktop uses the three panes as its stage labels;
  tablet/mobile retain the three-stage navigation; and activating a mobile
  structure row opens the full-height Item inspector directly.
- `/flows/new?legacy=1` and `FLOWME_TEXT_AUTHORING_ENABLED=0` render the previous
  `NewFlow` path for rollback.
- The route keeps the existing `noindex` policy.

### Live preview, canonical grammar, and representative conversions

- First open preloads the title `제목입니다.`, source label
  `작성 형식 예시`, and a three-Item Markdown example. Across two Steps it
  demonstrates Flow/Step/Item headings, detail, completion, absolute and
  relative dates, time, timezone, duration, repeat, place, condition, resource,
  guide, caution, source, and an intentionally undated Item.
- Input keeps a collapsed `작성 형식 보기` guide for absolute and relative dates,
  repeat preservation, ordinary memo action boundaries, tab/CSV/Markdown
  tables, URL-only source-import state, and the additional labels.
- The visible grammar is `flowme-authoring-markdown-v1`: CommonMark/GFM-style
  headings, task Items, and links; `YYYY-MM-DD` and `HH:mm`; plus readable
  Korean `key: value` properties and familiar `D-3` / `D-Day` / `D+2`.
  Each meaning has one visible canonical label. The parser still accepts prior
  aliases and Step-title D-day inheritance as read compatibility, but examples,
  help, and writers do not teach or emit them.
- The title field and a pasted first `# 제목` are one value in both directions.
  Loading a legacy draft whose stored canonical title disagrees with its H1
  normalizes the in-memory document and subsequent save/export to the H1.
- Exported visible Markdown can be stripped of internal metadata and passed
  through the actual input parser while preserving supported Flow, Step, Item,
  explanation, completion, schedule, repeat, place, condition, and link
  meaning. Unknown property labels remain in the source as issues.
- Structure and Result are already synchronized on first open. Todo contains
  all three Items. Calendar contains only the absolute row until a relative
  anchor is entered and never invents a date for the undated Item.
- A compact top example switcher exposes source-backed representative paths:
  제주 ordinary memo -> Todo `5`, qualified AJD moving Markdown -> Calendar
  `27`, K-MOOC tab table -> Sheet `14`, and Allblanc video sequence ->
  Calendar `7`. The moving and Allblanc examples include preview-only anchor
  values so the converted Calendar rows are visible immediately.
- Repeat text remains editable canonical draft data, but the Result pane states
  that recurrence occurrences and ICS `RRULE` export are not generated.
  Mobile still opens on the Input stage.
- Title changes update immediately. Unprotected source/text changes run the
  deterministic parser after a short debounce while keeping the current stage.
  After completion the character-count row briefly confirms the current Item
  count. Choosing an example resets the input pane and textarea to their first
  line so its grammar can be compared from the beginning.
  Saved or corrected documents instead stage an incoming source comparison and
  never replace the active result or user-owned value automatically.
- Merely viewing Input, Structure, Result, or another seed example does not
  create a browser-local draft. Editing or explicitly saving starts the normal
  local draft path. Switching from dirty work to an example requires discard
  confirmation.
- `새 Flow 시작` clears the example. A top example button replaces the seed
  input and refreshes Structure and Result without changing the current stage.
- Ownership remains selectable while the initial input is being edited, then
  locks after parse, structured correction, explicit save, or opening an
  existing draft.

### Canonical authoring and deterministic mapping

- `lib/flow/text-authoring/types.ts` defines `TextAuthoringDocument`, captured
  blocks, mappings, issues, revisions, source rows/references, and canonical
  Flow/Step/Item data.
- `identity.ts`, `parser.ts`, and `validation.ts` provide stable deterministic
  identity, plain text/Markdown/table/URL/mixed-input parsing, source-range
  lineage, no-silent-drop accounting, and contract validation.
- `operations.ts` provides reversible split, merge, reorder, indent/outdent,
  role, include/exclude, property, and undo operations. Source values remain
  captured separately from creator/user overrides.
- This is a rule-based local parser. It does not call or simulate an AI
  provider.

### Issue decision and recovery

- Structure exposes three user decisions for a parser issue:
  `원문에만 남기기`, `할 일로 만들기`, and `나중에 정하기`.
- `keep_source_only` preserves the raw/source row and resolves the issue without
  creating an Item. `convert_to_item` creates exactly one stable Item linked to
  that source fragment.
- `hold` is not a resolved outcome. A held issue stays outstanding and retains
  its original blocking state.
- Issue decisions are revisioned, persisted in local drafts, recovered after
  reload, and undoable with their previous issue and Item-link state restored.

### Projection, loss preflight, and round-trip

- `flow-bundle-adapter.ts` adapts the authoring document into the existing Flow
  bundle boundary without mutating the captured source.
- `artifact-projection.ts` calculates Calendar, Todo, Sheet, and Memo
  eligibility, projected counts, and loss explanations. It recommends one
  eligible primary and at most two eligible secondary artifacts.
- Undated Items do not become Calendar events. Relative dates require an anchor
  before they are calculated as Calendar dates.
- A mixed dated/undated Todo now keeps Todo primary while exposing Calendar as
  a meaningful secondary result. Repeat definitions are preserved without
  claiming recurrence expansion or `RRULE` support.
- `markdown-roundtrip.ts` exports and checks the supported Markdown subset.
- `file-export.ts` creates real XLSX, plain-text, and ICS files.
- `receipt.ts` creates ownership-specific local save/export receipts only after
  the requested save or file generation succeeds. None of these modules writes
  to an external service.

### Local draft ownership and recovery

- `storage.ts` owns the isolated browser-local key
  `flow:text-authoring:drafts:v1`.
- The repository supports save, autosave recovery, list/search/filter,
  duplicate, archive/restore, revision history/restore, and ownership metadata.
- Creator, personal, and correction-suggestion values use separate write lanes.
  Unprotected raw-input edits refresh the deterministic projection after a
  short debounce. A saved/corrected document keeps the prior projection and
  stages a source comparison instead of losing corrections. Dirty reset and
  dirty-to-example switching require confirmation, while modal shortcut and
  inspector focus guards prevent background actions. Held issue state remains
  outstanding and recoverable rather than being counted as resolved.
- This store does not claim account-backed or cross-device recovery and does not
  replace existing released `flow:saved:*` storage.

### Rights, safety, and outward-action policy

- Creator and correction-suggestion lanes create explicit rights and safety
  requirements even when source metadata is absent. A personal lane keeps a
  safety requirement when its input contains an explicit caution boundary.
  Source wording alone never becomes an automated rights or safety judgment.
- Each gate is `required`, `evidence_recorded`, or `personal_only`. Local draft
  save remains available in every status. A required or personal-only gate
  blocks file export, creator review request, and suggestion submit.
- An evidence note records what the user says they checked. It is not FlowMe
  approval, legal review, safety certification, or moderation.
- Selecting personal-only from a creator/suggestion document creates a new
  personal document and revision with `forkedFrom`; the original document is
  not overwritten. Rights remain personal-only and safety remains explicit.
- Review status, actor, evidence, source references, receipt state, undo, and
  reload recovery persist in the browser-local draft namespace.

### Source update and conflict resolution

- A source update is staged when changed input belongs to an already saved
  local draft or a document with correction revisions. The short local debounce
  does not apply or merge that candidate. There is no external source watcher,
  crawler, remote version fetch, or fuzzy merge.
- Active and incoming source snapshots remain separate until apply or reject.
  `source_updated` identifies open source changes;
  `conflict_source_vs_user` identifies changes that conflict with owned values
  or structure.
- Compare retains old source, incoming source, and the active-lane value.
  Supported value fields are title, detail, completion, and schedule; support
  fields are resource, source, guide, and caution; structure fields are role,
  inclusion, nesting, order, and Step mapping.
- Item matching uses only stable entity identity or an explicit caller-provided
  match. Title similarity and order never match Items automatically.
- Changed, added, and removed entries require an explicit resolution. Apply,
  reject, undo, tombstone/previous-source retention, storage, and receipts
  preserve the selected boundary.

### Eight-case semantic and handoff evidence

- Each frozen source case now proves
  `input -> mapping/canonical -> artifact -> browser-local save/load ->
  save/export receipt parity`.
- The corpus covers moving 27 Items/6 Steps, vehicle 10 exact relative offsets,
  Allblanc 7 exact videos, K-MOOC 14 rows, LibriVox 38 chapters, new-car
  14 actions/8 Steps, official safety 4 actions with separate caution/source,
  and Jeju 5 source-linked Items with reversible corrections.
- This is source-backed automated evidence. It is not observed-user evidence,
  external Calendar/VTODO round-trip, account/cloud recovery, or proof of a
  real provider.

### Current direct-test standalone HTML evidence

- After the FlowMe visual-token restoration, `flowme-text-authoring-ta-test.html`
  was generated as a self-contained `2,073,658` byte browser artifact from the same
  `TextAuthoringWorkspace`,
  deterministic parser, operations, projection, receipt, and namespaced
  storage modules used by `/flows/new`.
- Its `문법 적용 예시 27개` grouped dropdown is synchronized from the passing grammar simulation:
  existing content `8`, condition changes `8`, compatibility `6`, and
  expected-review inputs `5`. The expected-review group demonstrates
  fail-closed issues rather than successful content generation.
- The default authoring view now makes the bounded hierarchy visible in all three
  representations: `##` starts a Step, `- [ ]` marks each Item, and a two-space
  `key: value` line belongs to the Item immediately above it. Item-to-Item nesting
  is not presented as a supported v1 operation; legacy nonzero nesting is flattened
  on canonical Markdown export and named in the round-trip loss receipt.
- The current artifact was served only from a loopback static server for browser
  automation because the CLI blocks `file://`. Fresh contexts at `1440x900`,
  `1024x768`, `390x844`, `390x600`, `360x640`, and `844x390` reported document
  horizontal overflow, external HTTP(S) requests, console warnings/errors, and
  page errors `0`.
- At 390px the example choices scroll inside their own top bar while the document
  remains exactly `390px` wide. The selected example stays visible, the current
  Input/Structure/Result stage is preserved, and the sticky action footer remains
  reachable. At short heights the pane keeps its minimum usable height while the
  authoring shell supplies the missing vertical scroll; `390x600`, `360x640`, and
  `844x390` reached the final Input option, Structure Item, and Result control
  fully above the footer. Example browsing alone left drafts and recoveries empty.
- The final subtraction pass puts the actual artifact before one compact
  rights/safety action instead of repeating three gate labels above the result.
- The same run proved a source edit changing the moving example from `27` to
  `28` Items without pressing a parse button, then required confirmation before
  discarding that edit for the K-MOOC example.
- The visual pass applies the accepted Claude structure only to the authoring
  shell while retaining the existing FlowMe palette and component treatment. It
  removes redundant desktop stage tabs and duplicated mobile
  editing steps, marks a stale outline after input changes, renders actual
  result shapes with distinct Todo/Calendar/Sheet/Memo treatments, and removes
  raw revision/Step/Item labels from the draft library. Storage, review,
  source-update, and export safety boundaries remain intact.
- All JavaScript and CSS are embedded. The artifact has no external script or
  stylesheet references, disables application navigation, and carries a
  `connect-src 'none'` Content Security Policy.
- Saves remain in the browser-local `flow:text-authoring:drafts:v1` namespace
  for this file origin. They are not written to an account, released Flow,
  external calendar, todo service, sheet, or memo service.
- It reflects the current local source checkpoint and build
  `dSlinwCU2I5e4VJl2kMKL`. Regenerate it after any implementation change with
  `npm run build:text-authoring-html`.

## Verification surfaces present

- Authoring unit suites:
  - `lib/flow/text-authoring/parser.test.ts`
  - `lib/flow/text-authoring/operations.test.ts`
  - `lib/flow/text-authoring/validation.test.ts`
  - `lib/flow/text-authoring/infrastructure.test.ts`
  - `lib/flow/text-authoring/review-policy.test.ts`
  - `lib/flow/text-authoring/source-update.test.ts`
  - `lib/flow/text-authoring/frozen-cases.test.ts`
  - `lib/flow/text-authoring/file-export.test.ts`
- Responsive route suite:
  - `tests/e2e/text-authoring.spec.ts`
- Dedicated command:
  - `npm run test:text-authoring`
- Repository verification now includes the dedicated authoring suite before the
  existing unit and build gates.

The frozen-case suite covers the eight design inputs represented in the
handoff: moving, vehicle management, Allblanc, K-MOOC, LibriVox, new-car
purchase, safety guidance, and the Jeju memo. Every case verifies exact
source-specific action/row identity, sequence, condition or schedule,
resource/caution separation, artifact count, browser-local save/load, and
save/export receipt parity.

## 2026-07-30 MVP PoC internal-review hardening

The internal gate is intentionally narrower than a full integration or
refactor. It verifies only:

```text
ordinary text -> source-preserved Flow -> one minimal correction
-> local save/reload recovery -> representative plain-text export
```

The four P0 boundaries are:

1. saved history and persisted revision caps with previous-save/current-edit
   preservation on storage failure;
2. merge limited to adjacent Items in the same Step;
3. unsupported source semantic changes and missing or inconsistent staged diffs
   rejected fail-closed rather than partly applied;
4. Text Authoring-owned TypeScript diagnostics `0` plus regression coverage.

My Flow/canonical integration, large-scale file decomposition, backend/cloud,
production deployment, and expansion to every export format are excluded. Use
the [owner, Claude Code, and Codex review kit](./mvp-poc-three-party-review-ko.md).

## Local verdict and remaining external decisions

- Local implementation, visual finish, and P0 hardening:
  `ready_for_three_party_internal_review`.
- `TA-01` through `TA-06`: green in the bounded local automated/browser gate.
- Claude structural comparison and FlowMe visual-system correction: complete as
  internal QA.
- Codex independent review: [complete/pass](./mvp-poc-codex-review-ko.md),
  unresolved in-scope Blocking/High `0`.
- Owner direct journey and Claude Code independent review: pending on the same
  branch, HEAD, build ID, and scope.
- The owner/Claude Code/Codex review remains internal PoC evidence and is not
  relabeled as user validation.
- Observed-user validation: excluded from this internal PoC and not claimed.
- Commit, push, PR, and merge: not performed. Vercel Preview:
  [deployed and READY](./vercel-preview-deployment-ko.md); Vercel Production:
  unchanged.

## Current local verification ledger

| Check | Current state | Claim allowed |
| --- | --- | --- |
| `npm run docs:check` after this documentation update | Passed: skill sync check and 14 required files / 3,660 local links | Documentation structure and links are green |
| `npm run test:text-authoring` | Passed `102 / 102` | Canonical root Item markers, two-space property ownership, explicit legacy nesting loss, canonical/legacy parsing, actual-parser Markdown re-import, 27-case demo-fixture parity, link labels, dates, repeat/export boundaries, MVP PoC P0 boundaries, and existing authoring regressions are green |
| Full `npm test` | Passed on the current worktree: pretest `100 / 100` and unit `594 / 594` (`694 / 694` total) | The existing unit baseline remains green with the current TA changes present |
| `npm run build` | Passed on the current TA implementation; Next.js compiled, type-checked, and generated `18 / 18` static pages | The current local implementation is production-buildable |
| Repo-wide `tsc --noEmit` | Current run is non-zero with diagnostics `190`; Text Authoring-owned paths have `0` | Keep the inherited repository boundary separate from the TA gate |
| `npm run security:audit` | Passed, vulnerabilities `0` | Current dependency audit is green |
| Documentation diff/whitespace check | Current `git diff --check` passed; only existing Windows LF/CRLF notices were printed | The tracked implementation/documentation diff has no whitespace error |
| `tests/e2e/text-authoring.spec.ts` | Passed `27 / 27`, clean | Live update, H1/title synchronization, legacy mismatched-title draft normalization, canonical/default and all-27 dropdown examples, same-example reset after structure-only edits, Check/Todo/Memo boundaries, short-viewport end reachability, responsive authoring, same-Step merge, storage failure preservation, source diff fail-closed, recovery/export, and existing regressions are green |
| Legacy `/flows/new?legacy=1` regression | Passed `2 / 2` at the current checkpoint | The explicit rollback still creates and edits legacy Flows |
| Current standalone visual QA | Route/standalone browser automation passes `11 / 11`; the default view shows three `- [ ]` Item markers, the Item-nesting controls are absent, the dropdown groups are `8 / 8 / 6 / 5`, the applied anchor result matches, and 390/1024/1440px plus `390x600`, `360x640`, and `844x390` have document horizontal overflow, console warnings/errors, page errors, and external HTTP(S) requests `0` | Current FlowMe palette plus Claude structure verified |
| `npm run build:text-authoring-html` | Passed with current artifact `2,073,658` bytes and SHA-256 `ceb9b04d9a6285cc987e1fc474567cf397e9dc097e6164090c36e0aba0c1fa31` | The standalone matches the current local source checkpoint |
| Standalone grammar smoke | Passed at `390x600`: canonical `##`/`- [ ]`/two-space-property guide and default example are visible, H1 -> title and title -> H1 synchronize, pane scroll reaches its maximum, document width equals viewport, console warning/error and external HTTP(S) request counts are `0` | Current standalone grammar and short-screen evidence |
| Observed-user validation | Excluded from this internal PoC and not run | Internal review cannot be reported as user validation |
| Commit/push/PR/merge/production deploy | Not performed | P35 production remains unchanged |
| Vercel Preview | Deployed and `READY`: `dpl_737mvF8W3haX63f49fFPGu4UKNgG` | Accessible internal-review environment; not release evidence |

## Screenshot and design comparison

Current FlowMe-visual-system standalone screenshots are under
`output/playwright/text-authoring-html/`:

- `flowme-restored-1440-input.png`
- `flowme-restored-1440-result.png`
- `flowme-restored-1024-input.png`
- `flowme-restored-1024-result.png`
- `flowme-restored-390-input.png`
- `flowme-restored-390-structure.png`
- `flowme-restored-390-inspector.png`
- `flowme-restored-390-result.png`
- `flowme-restored-390-library.png`
- `flowme-restored-visual-qa.json`

The current live-preview and representative-example screenshots are under
`output/playwright/text-authoring-live-examples/`:

- `default-1440x900.png`
- `moving-1440x900.png`
- `kmooc-1440x900.png`
- `default-1024x768.png`
- `default-390x844.png`
- `result-390x844.png`
- `allblanc-result-390x844.png`
- `final-default-1440x900.png`
- `final-default-390x844.png`
- `final-result-390x844.png`

The `polished-*` screenshots from the earlier black/gray/red pass are retained
only as rejected historical visual evidence. They are not the current design.

Earlier route screenshots remain under
`output/playwright/text-authoring/`:

- `ta-final-1440-result-latest.png`
- `ta-final-1440-receipt-latest.png`
- `ta-final-390-structure-latest.png`

Final TA-03 mobile decision screenshots are:

- `output/playwright/ta03-issue-decision-mobile.png`
- `output/playwright/ta03-issue-held-mobile.png`
- `output/playwright/ta03-issue-converted-mobile.png`

Current TA-05 screenshots are:

- `output/playwright/ta05-review-gate-390.png`
- `output/playwright/text-authoring-html/standalone-390-ta05-current.png`

Current date/repeat standalone screenshots are:

- `output/playwright/text-authoring-html/standalone-1440-date-repeat.png`
- `output/playwright/text-authoring-html/standalone-1440-date-repeat-guide.png`
- `output/playwright/text-authoring-html/standalone-1024-date-repeat.png`
- `output/playwright/text-authoring-html/standalone-390-date-repeat-input.png`
- `output/playwright/text-authoring-html/standalone-390-date-repeat-result.png`

Current information-density screenshots are:

- `output/playwright/text-authoring-html/standalone-1440-simplified.png`
- `output/playwright/text-authoring-html/standalone-1024-simplified-result.png`
- `output/playwright/text-authoring-html/standalone-390-simplified-input.png`
- `output/playwright/text-authoring-html/standalone-390-simplified-structure.png`
- `output/playwright/text-authoring-html/standalone-390-simplified-result.png`
- `output/playwright/text-authoring-html/standalone-390-simplified-file-result.png`

Older standalone HTML screenshots remain under
`output/playwright/text-authoring-html/`:

- `standalone-1440-result.png`
- `standalone-1440-receipt.png`
- `standalone-1440-export-receipt.png`
- `standalone-390-result.png`
- `standalone-1440-simple-example.png`
- `standalone-1024-simple-example.png`
- `standalone-390-simple-example-result.png`

Those older screenshots are retained as historical QA evidence. They do not
prove the complete interaction journey of the latest regenerated HTML.

Comparison against the accepted v1.1 desktop and mobile references:

1. The inspected 1440 source/structure/result hierarchy and 390 staged
   Input/Structure/Result views preserve the accepted reference composition.
2. The authoring module inherits FlowMe's warm background, white surfaces,
   black primary action, blue action, green positive, amber warning, subtle
   dividers, and rounded controls. Claude's black/gray/red, square-surface
   treatment is intentionally not used.
3. Desktop removes the redundant stage strip because all three panes are
   visible. Tablet/mobile keep numbered stages, and the mobile structure row
   opens the Item inspector directly instead of requiring a second edit action.
4. Todo, Calendar, Sheet, and Memo results share the same projection data but
   use distinct preview grammar. Repeat and loss/preflight detail remain
   collapsed and do not compete with the result rows.
5. The draft library uses `저장한 Flow`, Korean count/artifact labels, and
   `저장 기록`; it omits raw revision IDs and fits all filters at 390px.
6. The integrated product intentionally omits the Claude fixture switcher,
   A/B/C comparison, viewport controls, fixture IDs, local paths, and
   observed-user counters. Source preservation, review boundaries, local draft
   ownership, and rollback remain implementation-owned additions.
7. The mixed example correctly projects to Todo count `2` and Calendar count
   `1`; the second undated Item is excluded with an explanation, while the
   repeat definition is visibly preserved without implying recurrence support.

Visual fidelity ledger:

1. Palette: the accepted immediate prior FlowMe screenshot
   `desktop-simulation-01-input.png` and current
   `flowme-restored-1440-input.png` both use warm white, neutral hairlines,
   green selection, amber warning, and a black primary action.
2. Geometry: current controls again use the FlowMe 4/6/8px radius scale and
   1px dividers instead of the rejected zero-radius and 2px frame.
3. Structure: current 1440 keeps source/outline/result visible together while
   removing only the redundant desktop stage strip.
4. Responsive behavior: current 1024 keeps two panes and current 390 keeps
   numbered stages with direct row-to-inspector editing.
5. Copy and state: current library and receipts keep Korean user language,
   omit raw revision/Step/Item labels, and retain source/review recovery states.

## Next checkpoint and owner feedback

`TA-01` through `TA-06`, the bounded P0 hardening, the scoped product-level
visual finish, live preview, and representative-example goal are complete
locally. If the separate three-party internal gate is resumed, its remaining
work is:

1. the owner completes the fixed journey on build
   `dSlinwCU2I5e4VJl2kMKL`;
2. Claude Code completes the prompt in the
   [three-party review kit](./mvp-poc-three-party-review-ko.md);
3. the three records are reconciled into `continue / fix / stop`.

Commit, push, PR, merge, or production deployment remains a separate owner
decision. The requested earlier Vercel Preview is
[READY](./vercel-preview-deployment-ko.md), but the current changes remain
local-only.

This remains an uncommitted dirty-worktree checkpoint with one Preview
deployment. P35 stays production truth, no external source
watcher/account/cloud/direct integration exists, and no observed-user result is
implied.
