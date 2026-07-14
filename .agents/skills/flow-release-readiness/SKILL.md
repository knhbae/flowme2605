---
name: flow-release-readiness
description: Use when reviewing FlowMe's overall completeness, MVP readiness, launch blockers, remaining backlog, project status, release readiness, or a Korean status briefing. Ground conclusions in the current repo, separate automated QA from observed-user evidence, and create a scannable Korean HTML workboard when the user needs a durable whole-project view.
---

# FLOW Release Readiness

Use this skill for evidence-backed review and release triage. Do not implement product features unless the user separately asks for implementation.

## Read Order

1. Read `AGENTS.md`, `agent.md`, and `docs/harness/README.md`.
2. Read `docs/STATUS.md`, `docs/SERVICE_STRUCTURE.md`, `docs/DECISIONS.md`, `docs/TOOLING.md`, and `docs/specs/README.md`.
3. Inspect the newest relevant files under `docs/content-audit/` and active specs. Prefer current worktree evidence over stale roadmap prose.
4. Inspect `git status --short --branch`, recent commits, `package.json`, CI, hooks, and the current dependency audit.
5. Run verification only to the depth needed for a current claim. Never reuse an old pass result as if it ran now.

## Review Dimensions

Score each dimension with a short evidence rationale and explicit remaining work:

- Core product loop: intake, save, execute, calendar, export, return.
- UX readiness: first action, mobile/wide behavior, state clarity, accessibility, and empty/error/offline handling.
- Content and source readiness: representative source quality, risk/source separation, and conversion fidelity.
- Engineering reliability: docs, tests, build, E2E, dependency health, CI, and rollback visibility.
- Production operations: supported runtime, deploy configuration, error observation, analytics contract, privacy, and support path.
- User evidence: observed use, save/export/check/return behavior, feedback quality, and untested assumptions.

Do not average unlike evidence blindly. A high automated-test score cannot compensate for missing observed-user evidence.

## Evidence Rules

- Label evidence as `current command`, `current repo`, `prior artifact`, or `assumption`.
- Treat screenshots, E2E, builds, and preview deploys as QA evidence, not user validation.
- Call a feature released only when the release/deploy record exists.
- Surface dirty worktree scope and unrelated changes without reverting them.
- Report local edit, verification, commit, push, PR, merge, and deploy status separately.
- For security or dependency findings, include severity, affected package, fixed version or mitigation, and whether the current audit still fails.

## Human Review Artifact

When the user asks to see the whole status, backlog, or launch readiness in one place, create one Korean HTML workboard under `docs/content-audit/YYYY-MM-DD-...-ko.html`.

The page should show:

- Current verdict and confidence.
- Dimension scores with visible rationale.
- `Now / Next / Later / Blocked / Done` work lanes.
- Every active item with owner surface, next action, done-when, verification, and source link.
- Separate sections for product PoC, research/planning PoC, production readiness, and observed-user validation.
- Current tool/runtime/dependency risks.

Keep the HTML self-contained, responsive, and readable at 390px and desktop widths. If the artifact is created, run `npm run docs:check` and inspect it in a real browser; report when browser verification was not possible.

## Minimum Verification

- Docs or policy review: `npm run docs:check` when files change.
- Current engineering readiness claim: `npm run security:audit`, `npm test`, and `npm run build` when practical.
- User-facing route claim: targeted or full Playwright E2E plus route-level browser inspection.
- Final readiness verdict: state every verification command actually run and every important gate not run.
