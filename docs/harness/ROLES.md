# Harness Roles

These roles describe responsibilities, not specific AI products. Use subagents when the tool supports them. Otherwise, run each role as a separate pass in the same session.

Roles are review lenses, not job titles. Most tasks should use only the roles needed for the risk and scope; do not create every role for every small change.

## Orchestrator

- Reads `AGENTS.md`, `agent.md`, `docs/STATUS.md`, `docs/ROADMAP.md`, `docs/IDEAS.md`, and relevant code before changing files.
- Clarifies scope, writes plans, delegates work, and reports evidence.
- Keeps changes focused and protects existing user edits.
- Does not claim completion without verification output.

## Product Planner

- Defines why the work belongs in the current FlowMe stage before implementation starts.
- Identifies the first user action, completion signal, and measurable behavior such as open, anchor input, copy/export, check, or feedback.
- Protects Stage 0 from premature platform expansion, account systems, integrations, monetization, and broad marketplace features.
- Names what is explicitly out of scope for the current task.

## Flow Content Planner

- Judges whether a source or topic can become a useful FLOW route before conversion work starts.
- Chooses the likely artifact destination first: calendar, sheet, memo, internal check state, or hybrid.
- Checks whether the source has real execution structure such as dates, repeats, rows, checklist items, preparation steps, or decision points.
- Rejects topics that need generic filler, invented steps, or heavier input than a normal calendar, reminder, checklist, sheet, or memo.

## Source Scout

- Finds original content candidates, prioritizing Korean sources when validation users are Korean.
- Looks for creator/user interaction signals such as comments, views, downloads, follow-up posts, corrections, or repeated user questions.
- Separates source discovery from source accuracy, risk review, and Flow conversion.
- Reports only candidates with source links, visible execution shape, and a short note on why each candidate is worth or not worth converting.

## Flow Converter

- Converts approved sources into FLOW structure after source fit is established.
- Keeps the primary artifact destination visible while choosing structure type, action count, item shape, and export behavior.
- Writes action-first items and moves supporting method, preparation, source links, video links, purchase links, cautions, and creator notes into memo or detail where appropriate.
- Preserves source facts and creator experience without presenting either as guaranteed outcomes.

## UX Designer

- Designs or reviews the user journey from entry to first action, artifact preview, copy/export, check, and feedback.
- Keeps artifact-first layout decisions visible, especially on mobile where screen density can hide the first useful action.
- Checks whether controls lead to predictable destinations such as calendar, sheet, memo, checklist, or item detail.
- Removes UI that exists only because a generic component already supports it.

## UI Designer

- Reviews visual hierarchy, layout density, spacing, state feedback, and responsive behavior.
- Keeps cards, chips, badges, rails, panels, and tabs subordinate to the user's execution artifact.
- Checks that mobile and desktop views remain readable without overlapping text, clipped controls, or competing primary actions.
- Uses screenshots or browser inspection when visual changes are user-facing.

## Content Designer

- Writes and reviews UI copy, action titles, completion labels, warnings, empty states, and export labels.
- Replaces vague labels with concrete destination or action language, such as calendar save, sheet export, memo copy, or current item completion.
- Keeps sensitive content calm and precise without outcome guarantees or advice-like certainty.
- Ensures source facts, creator experience, user notes, and cautions are not blurred by copy.

## Source/Risk Steward

- Reviews official facts, creator experience, user-editable notes, and cautions as separate layers.
- Flags medical, health, legal, finance, family, vehicle, safety, and official-document risks before public or representative framing.
- Prevents unverified claims, validation language without user behavior evidence, and source/risk mixing.
- Requires weaker wording, removal, or explicit source notes when a claim cannot be verified.

## Developer

- Implements scoped changes following existing code style.
- Writes or updates tests for behavior changes.
- Runs the smallest useful test first, then broader verification.
- Reports changed files and commands run.

## Code Reviewer

- Reviews for bugs, regressions, missing tests, security risks, and product constraint violations.
- Leads with findings and file references.
- Treats "no findings" as a meaningful result but still notes residual risk.

## Architect

- Evaluates tradeoffs before larger structural decisions.
- Keeps Stage 0 constraints visible and rejects premature platform expansion.
- Records durable decisions in `docs/specs/` or architecture docs when needed.

## Spec Steward

- Promotes committed work from `docs/IDEAS.md` or user requests into `docs/specs/YYYY-MM-DD-short-topic/`.
- Checks that each spec names Stage fit, first user action, artifact destination, source/risk boundary, natural artifact, and verification.
- Links generated `docs/superpowers/` artifacts from the durable spec when a tool-specific workflow is used.
- Keeps `docs/ROADMAP.md` short and prevents specs from becoming unbounded backlog dumps.

## Browser Tester

- Verifies user-facing behavior in a real browser.
- Checks console errors, screenshots, layout issues, and core flows.
- Uses Playwright or an in-app browser depending on available tools.

## Release Readiness Steward

- Checks that the configured local, CI, and deployment runtimes are supported and consistent.
- Reviews dependency audit output, Dependabot coverage, CI gates, Playwright failure artifacts, deployment smoke evidence, and rollback notes.
- Separates green automated QA from real observed-user validation and blocks unsupported certainty in readiness scores.
- Reports local changes, verification, commit, push, PR, merge, deploy, and remaining operational risk as separate states.

## Validation Observer

- Plans and records observed user sessions without treating internal QA, screenshots, or green tests as validation.
- Captures factual behavior across open, setup, artifact understanding, copy/export, outside-use intent or real use, completion/update, and return signal.
- Uses non-validated labels such as `no signal`, `friction`, and `candidate signal` until repeated target-user behavior supports stronger language.
- Keeps participant notes factual and avoids storing sensitive personal data.

## Evidence & Memory Steward

- Records durable process, product, UX, technical, and safety decisions in the right document before session end.
- Keeps settled decisions in `docs/DECISIONS.md`, deferred ideas in `docs/IDEAS.md`, committed multi-step work in `docs/specs/`, current health in `docs/STATUS.md`, PR evidence in `docs/pr-history/`, and observed sessions in `docs/validation-sessions/`.
- Links generated tool artifacts from durable specs instead of duplicating long content across documents.
- Prevents chat-only memory from becoming the only record of important direction changes.
