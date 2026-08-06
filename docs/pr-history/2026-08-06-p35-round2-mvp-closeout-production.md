# P35 Round 2 MVP closeout production deployment

- Date: 2026-08-06
- PR: none; deployed before a PR was opened
- Source branch: `codex/p35-round2-correction-pprime2-20260805`
- Source SHA: `f97644abf379c46433847f44aa7bd4da7fadac4a`
- Merge: not performed
- Status: `Deployed`
- Deployment: `dpl_EBDr9CiRuwAUyjMcJwp7g6eBLpNk`
- Immutable deployment URL: <https://flowme2605-n6jddq8i9-flowme.vercel.app>
- Production alias: <https://flowme2605.vercel.app>

## Why

Close the bounded P35 Round 2 work as an MVP PoC after incorporating the
existing P′ Codex and Claude Design findings into P′′, verifying the exact
P′′ candidate, and accepting that another full independent P′′ Pass 1 and
Pass 2 would repeat the same review cycle without changing the approved MVP
scope.

## What changed

- Deployed the exact clean and pushed P′′ product candidate to Vercel
  Production by manual CLI deployment.
- Preserved the prior P′ review packages and `REVISE` verdicts as the finding
  provenance; those verdicts are not represented as a P′′ review result.
- Bound the release decision to the P′′ candidate evidence at BUILD_ID
  `T0QkChgscSgPog-0UdvY-` and candidate epoch
  `p35-r2-4fa6af1728eb5ca5`.

## Not done

- No fresh independent P′′ Codex or Claude Design Pass 1/Pass 2 was run. The
  Owner waived that repeated cycle for this MVP closeout.
- No PR was created or updated, and the branch was not merged to `main`.
- No production click-through smoke was run in this closeout. Vercel READY,
  build completion, and alias assignment were verified through the CLI.
- No observed-user validation; observed-user sessions remain `0`.
- Text-to-flow, the P2 follow-up candidates, actual browser 200% zoom,
  performance assessment, and external Calendar/VTODO round-trip remain
  outside this release evidence.

## Decisions

- Existing P′ reviews plus traceable P′′ corrections and candidate-bound
  regression evidence are sufficient for the current MVP PoC release gate.
- `P′′ independent review PASS` must not be claimed; the release is an Owner
  MVP risk acceptance over internal verification.
- A material runtime change, external launch requirement, observed-user
  finding, or request for independent P′′ certification reopens review.

## Important files

- `docs/DECISIONS.md`
- `docs/STATUS.md`
- `docs/ROADMAP.md`
- `docs/specs/2026-08-04-p35-round2-bounded-ux-correction/`

## Verification

- Candidate source SHA, upstream SHA, and remote SHA matched at
  `f97644abf379c46433847f44aa7bd4da7fadac4a`; the worktree was clean before
  deployment.
- Candidate-bound S01~S23 evidence was `23 / 23` accounted: S01~S21 were
  captured, S22 was `NOT_ASSESSED`, and S23 was
  `REVIEWER_CHOSEN_NOT_PRECAPTURED`. All three group manifests passed with
  recorded failures `0`.
- Published evidence verification passed `33` identity checks, `285` evidence
  files, and `556` raw URLs with failures `0`.
- Vercel built Next.js `15.5.21`, generated `18 / 18` static pages, reported
  deployment `dpl_EBDr9CiRuwAUyjMcJwp7g6eBLpNk` as `READY`, and assigned the
  canonical production alias.

## Risks

- The live source branch is not merged to `main`; a later `main` production
  deployment can replace this candidate.
- Production interaction behavior was not independently replayed after the
  alias move, so the recorded release gate is Vercel build/READY/alias plus the
  pre-deploy candidate-bound browser evidence, not a production smoke claim.
- Observed-user comprehension and external artifact round-trips remain
  unverified.

## Follow-ups

- If this source must become the durable Git production baseline, open and
  review a separate PR before merging it to `main`.
- Keep text-to-flow and the P2 mutation follow-ups as separate, explicitly
  promoted work; do not fold them into this completed MVP closeout.
