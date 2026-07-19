# P25 Requirement Completion Audit

## Findings

No unresolved automated Blocking or High finding remains in the current P25 branch. The first P25-08 wide Calendar capture exposed a High one-character title wrap; the integrated branch fixes it and guards the title width in E2E.

The final regression pass also found one source-backed date-free ordering defect: rows without a personal order rank fell back to lexicographic IDs, which could hide the first source item from the visible date-free execution list. The resolver now falls back to immutable source-row order, and the product IA journey verifies `1. 소인수분해` as the first executable row. This correction preserves source objects and personal/run ownership.

Three Medium hypotheses remain:

1. Public routine preview copy may still be longer than needed.
2. The 1024px Calendar queue/grid/agenda composition works but is dense.
3. Advanced personal-draft schedule editing remains a long path despite progressive disclosure.

They are bounded P26 inputs. None breaks source/personal/run ownership, destination parity, reversibility, or the primary P25 model.

## Acceptance Criteria

| P25 requirement | Result | Evidence |
| --- | --- | --- |
| Undated work has a coherent job | supported | My Flow executes it; Calendar exposes selection-only placement; list export includes it; ICS excludes it |
| Post-save shows the whole effective Flow | supported | First-save and returning whole-Flow browser journeys |
| Default editing stays bounded | supported | Title/date/memo first; advanced schedule collapsed with truthful summary |
| Batch adjustment is source-safe | supported | Selection mode, impact preview, date move/clear, export preselection, recoverable removal |
| All consumers share effective identity/count | supported | Routine projection parity, memo accepted/saved/reloaded parity, export scope planner |
| Completion is reversible | supported | Immediate undo and persistent completed-view reopen; one control per executable level |
| Public save-before is one artifact | supported | Read-only preview, distinct inclusion control, one save decision surface |
| 390/1024 share one hierarchy | supported | P25-08 browser captures; overflow and console/page errors `0` |
| Source/personal/run stay separate | supported | Canonical projection, personal overlay, and execution-state tests |
| Simulated evidence is not called user validation | supported | Every P25 package records observed users as `0` |

## Nine-Surface Decision

Option B remains the P25 internal release baseline for save-before, post-save, My Flow, whole Flow, Calendar, item adjustment, batch adjustment, completion/reopen, and export. The user's instruction to finish P25 authorizes implementation, while P25-08 verifies internal integration. It does not prove first-use comprehension or repeated-use value.

## Keep

- Complete personal Flow as the saved object.
- `지금 / 내 Flow / 완료` as My Flow local hierarchy.
- My Flow execution versus Calendar placement boundary.
- Mobile drill-in and wide workspace composition.
- Progressive single-item adjustment and temporary batch mode.
- Immediate undo plus persistent reopen.
- Export scope and expected count before format.
- Source, personal overlay, execution run, and occurrence identities as separate owners.

## Change In P26

- Compare shorter public artifact framing with the current copy.
- Compare two wide Calendar density frames without changing its role contract.
- Measure and prototype a shorter advanced-editor route without exposing more fields by default.

## Defer

- Actual participant observation until the owner explicitly reopens it.
- Account/database/cloud sync, AI provider, OAuth, direct external integrations, fifth tab, and Studio promotion.
- Creator/update platform, ratings, review delivery, and marketplace work.

## Release Checks

P25-08 current-worktree results remain integration evidence: representative journeys `9 / 9`, related regression `81 / 81`, screenshots `36`, downloads `5`, overflow `0`, errors `0`. The final clean-worktree release verification is now complete: unit `526 / 526`, Playwright `285 / 285` across `8` files, docs `14` required files and `2527` local links, production build `18 / 18` pages, high/critical audit findings `0`, and diff-check errors `0`. Two moderate nested Next/PostCSS findings remain disclosed; no force upgrade was applied. Production smoke evidence is recorded only after deployment.
