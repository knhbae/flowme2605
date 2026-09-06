# FlowMe Preservation And Work Register

**Captured:** 2026-09-07 KST  
**Release baseline:** `origin/main@db74a36cbf2325573b2d696589daa659619e50f2`  
**Maintenance worktree:** `D:\flowme2605\flow-workspace-maintenance-20260829`  
**Publish state:** local documentation changes only; no commit, push, PR, merge, or deployment

## Verdict

The released baseline, unpublished implementations, design work, and review candidates are all preserved, but they are not one release line. Production still ends at PR #195. Personal Workspace and Text Authoring continue in isolated worktrees, while the 2026-09-06 vision review and the completed local 2026-09-07 core-journey wireframe package are product-review inputs. This register does not promote any of them into the active Production gate.

## One Work Register

| Area | Location and owner | Git / publication state | What is complete | What remains |
| --- | --- | --- | --- | --- |
| Production baseline | `origin/main` and maintenance worktree | `db74a36c`; PR #195 merged and deployed; maintenance diff is local | Flow Entry and Preview Clarity release evidence is reconciled | Canonical Production smoke and observed-user validation remain not run / 0 |
| Root planning evidence | `D:\flowme2605\flow-mvp`; planning and policy sessions | branch `agent/flow-entry-preview-clarity@7650faa2`; dirty and unpublished | 2026-09-06 vision/journey gap review exists; the 2026-09-07 wireframe folder is a complete local design package with HTML, README, implementation map, QA, simulator, results, exports, and captures; simulator `65/65` | Preserve ownership; Owner review and any implementation gate are separate, and commit, push, PR, merge, deployment, real-device checks, and observed-user validation remain unperformed |
| Personal Workspace development PoC | `D:\flowme2605\flow-personal-workspace-v4-1-poc-20260901`; Development 3 | remote checkpoint `6e4b44fe`; later work is dirty, local, and has no PR | K1-K3 bounded implementation/verification and K4-D design package | Next recorded slice is K4-A1 pure read-preview. Actual K4 persistence, Undo, legacy compatibility, and UI remain gated and unimplemented |
| Text Authoring reference stack | PR #184 -> #185 -> #186 -> #187 | Draft chain; #184 conflicts with `main`; #185-#187 are clean against their feature bases | Historical P0/P1 design and implementation evidence | Owner must choose whether it is still a baseline; do not merge by default |
| Text Authoring Flow View stack | PR #197 -> #198 | Draft feature-to-feature chain; both CI runs fail and are not diagnosed in this maintenance pass | Isolated Flow View and hybrid UX candidates exist | Diagnose CI and compare against older stack before closure or publication decisions |
| Text Authoring unified guidance | PR #199 | merged as `89890840` into the hybrid feature branch, not `main` | Feature-branch guidance PoC merge | It is not a Production release and does not resolve #197/#198 CI |
| Dependency maintenance | PR #188-#193 | open against `main`; mixed green and failing checks | Individual automated update proposals exist | Review as one controlled dependency batch; no automatic merge |
| Local preservation | `D:\flowme2605\workspace-preservation\2026-09-07-workspace-backlog-maintenance` | local-only recovery package | patches and selected untracked archives for maintenance, planning, five Text Authoring worktrees, and Personal Workspace; ignored QA hash manifest | Requires a separate decision before any backup is published or removed |

## Personal Workspace State

The canonical progress record is outside `main` at:

`D:\flowme2605\flow-personal-workspace-v4-1-poc-20260901\docs\specs\2026-09-05-flowme-integrated-poc-gap-implementation-v1\progress.md`

- Remote branch checkpoint: `6e4b44fe2f61b7086b8bbc61c30b5aa39dd4390e`.
- Current local state: `129` tracked changed paths and `1,374` non-ignored untracked paths.
- Git-ignored QA originals: `2,183` files, `208,484,344` bytes under `output/poc-gap-implementation`.
- K1-K3 are complete only within their documented bounded implementation and verification scope.
- K4-D is a completed design and simulation package, not a completed K4 product feature.
- K4-A1 pure read-preview is the next recorded development slice. The 2026-09-06 UX review does not cancel or replace it.
- Android/iOS real-device checks, assistive-technology checks, Preview, Production, and observed-user validation remain separate and unperformed as recorded by Development 3.

## Planning And UX Review State

- Existing vision review: `D:\flowme2605\flow-mvp\docs\content-audit\2026-09-06-flowme-vision-journey-gap-review-ko.html` with its QA record. It is local, untracked, and backed up; it is not implementation approval.
- Completed local journey package: `D:\flowme2605\flow-mvp\docs\content-audit\2026-09-07-flowme-core-journey-wireframes\`. Open `index.html` for the two interactive journeys, `qa.md` for the evidence boundary, and `implementation-map.md` for implementation candidates. `simulate.js` and `simulation-results.json` record `65/65` PASS across 1440x900, 1194x834, 1024x768, and 390x844, with page/console errors `0` and external requests `0`.
- Completion here means design simulation and artifact QA only. Product tests, real-device checks, observed-user validation, product implementation, implementation approval, commit, push, PR, merge, and deployment remain unperformed.
- The planning lane owns that folder. This maintenance lane does not modify it or the 2026-09-06 report.
- Preserved direction: lightweight TXT-style personal schedules and notes, wiki-like shared knowledge, and community contribution all remain product directions. Export-first is the initial validation priority, not the whole product definition.

## GitHub Dependency Map

```text
main@db74a36c
  ├─ #184 -> #185 -> #186 -> #187 -> #197 -> #198
  │    conflict                    CI fail  CI fail
  ├─ #188 ... #193  dependency proposals
  └─ no Personal Workspace PR

#199: merged into the #198 feature branch lineage, not into main
```

No PR was created, edited, closed, merged, or rebased during this maintenance pass.

## Preservation Result

- Registered worktrees: `28`; none removed in this pass.
- Existing 2026-08-29 maintenance work was reused and backed up before further edits.
- Dirty worktrees remain in place. No bulk staging or ownership claim was made.
- Local recovery package contains binary-capable tracked patches, selected untracked archives, key Development 3 records, and SHA-256 inventories.
- Environment files, credentials, browser profiles, and personal browser data were excluded.

## Human Decisions Still Needed

1. Review the completed two-journey package and its QA/implementation map; decide separately whether either journey should be revised, held, or considered for a later product gate.
2. Keep Development 3 on its recorded K4-A1 slice unless the Owner explicitly changes that sequence.
3. Decide which Text Authoring stack is the retained baseline only after comparing the candidates and diagnosing #197/#198 CI.
4. Authorize separately if these maintenance documents should be committed, pushed, opened as a PR, or merged.

## Evidence Boundary

This register uses local Git/filesystem evidence and live GitHub PR metadata. It does not claim that local PoCs are released, that automated checks are observed-user validation, or that the completed local wireframe package is an approved implementation spec.
