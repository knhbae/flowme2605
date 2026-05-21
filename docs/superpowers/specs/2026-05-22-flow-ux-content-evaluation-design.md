# Flow UX and Content Evaluation Design

## Purpose

Create a reusable persona-based process for evaluating whether FLOW routes are understandable, useful, and low-friction for real users. Then use that process to evaluate representative Flow content, plan improvements, implement fixes, re-evaluate, and deploy to Vercel when the final quality gate passes.

The core question is not only "does the feature work?" It is: can a person use the app in the middle of a real life task and understand what to do, why it matters, what to trust, and what to do next?

The evaluation must not assume unusually high user patience, intelligence, or domain fluency. It should explicitly account for a spectrum of users: low-context users who skim and need plain language, average users who know the goal but not the steps, and confident users who want speed and detail.

## Approved Approach

Use persona-based simulation as the default evaluation method.

The evaluation starts with 5 representative Flows and expands up to 8 if coverage is insufficient. For each Flow, the evaluator reads the source URL, creates a realistic persona, opens the actual app screen, walks through the key execution path, scores the experience, and records concrete findings.

This approach is heavier than a quick heuristic review but still practical before real user interviews. It directly tests FLOW's current Stage 0 priorities: open, anchor input, copy/export, check, and source/risk confidence.

Each round must include at least one low-context or average persona. For health, finance, legal, administrative, and safety-adjacent Flows, the default persona should be low-context unless there is a clear reason to test an expert user.

## Reusable Harness

The reusable process lives at:

- [UX and Content Evaluation Harness](../../harness/UX_CONTENT_EVALUATION.md)

It defines:

- Sample selection rules.
- Source review requirements.
- Persona format.
- Comprehension spectrum lanes.
- Screen simulation path.
- 0-3 scoring checklist.
- Findings format.
- Priority rules.
- Pass criteria.
- Iteration loop.

## Initial Evaluation Sample

Start with these 5 Flows:

| Flow | Type | Evaluation reason |
| --- | --- | --- |
| `moving-d30-basic` | timeline | Low-risk D-day execution, Stage 0 candidate |
| `baby-food-menu-recipe` | phase / meal plan | Health-sensitive source trust, reaction logging, recipe detail |
| `running-5k-4week` | routine | Repetition, missed-session recovery, exercise caution |
| `national-health-checkup-d7` | timeline / official | Official medical-sensitive preparation |
| `year-end-tax-docs` or `overseas-travel-d14` | checklist/timeline | Finance/admin or travel safety trust and export behavior |

Expand to as many as 8 Flows if the first sample does not cover a changed structure type, source type, risk level, or user journey.

## Evaluation Outputs

Create an evaluation report under `docs/superpowers/specs/` for the current round. The report should include:

- Selected Flow list and why each was chosen.
- One persona per Flow.
- The comprehension lane for each persona.
- Source review summary for each source URL.
- Screen simulation notes and screenshots where useful.
- Score table using the harness checklist.
- Findings grouped as strengths, friction, content risks, and required changes.
- A fix list with `P0` through `P3` priority.
- Re-evaluation results after fixes.

## Improvement Planning

After the first evaluation report, create an implementation plan under:

- `docs/superpowers/plans/2026-05-22-flow-ux-content-evaluation.md`

The plan should only implement findings supported by the evaluation. It may include:

- UX copy changes.
- Layout or visual hierarchy changes.
- Source/risk/caution separation improvements.
- Seed Flow content edits.
- Additional representative Flows if coverage is weak.
- Image or visual asset work only if it directly improves comprehension or trust.
- Updates to `agent.md`, `docs/harness/`, or `docs/REFERENCE.md` if the evaluation reveals a reusable rule.

Do not add heavyweight integrations, login, AI automation, or native health/calendar permissions as part of this loop.

## Testing and Verification

The implementation must preserve the existing quality gates:

- `npm run docs:check`
- `npm test`
- `npm run build`
- `npm run test:e2e`

For visual/frontend changes, inspect the local app in a browser or with Playwright screenshots. Record any browser limitations in the evaluation or final report.

The evaluation is not complete until the affected Flows are re-run through the harness and no open `P0/P1` findings remain.

## Deployment

After the final evaluation and tests pass, deploy to Vercel. The deployment step must happen after, not before, the re-evaluation pass.

Deployment readiness requires:

- No open `P0`.
- No unresolved source/risk separation problem.
- No accepted `P1` unless explicitly approved.
- Passing automated checks.
- Fresh visual or Playwright evidence for changed screens.

## Open Risks

- Source URLs may change or be difficult to inspect consistently. If a source cannot be read, record that as an evidence gap and prefer official references for sensitive claims.
- Persona simulation is still a proxy for real users. It can catch obvious friction but cannot prove demand.
- The sample may miss a UX issue in another structure type. Expand the sample when the changed surface is broader than the initial five Flows.

## Next Step

Review this design. Once approved, write the implementation plan and start the evaluation loop using the reusable harness.
