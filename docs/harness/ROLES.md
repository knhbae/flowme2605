# Harness Roles

Roles are review lenses, not required agents or job titles. A capable model may perform several passes itself; use subagents only when independence or parallel evidence is worth the coordination cost.

## Four Core Passes

### 1. Orchestrate And Product-Frame

- Confirm the user-visible or process-visible goal, scope, and evidence needed.
- Read only task-routed context and protect unowned dirty paths.
- Check current Stage fit without confusing implementation with user validation.
- Select Minimal, Standard, or Full lane from [SDLC.md](./SDLC.md).

### 2. Implement

- Follow existing code and document patterns.
- Make the smallest coherent change and update affected tests.
- Preserve source facts, user state, and ownership boundaries.
- Run the smallest useful check before broadening verification.

### 3. Review

- Switch from author intent to failure-mode review.
- Look first for bugs, regressions, missing tests, unintended scope, stale docs, and unsupported product claims.
- Lead with concrete findings and file references.
- Treat no findings as a result while still naming residual risk.

### 4. Evidence And QA

- Run the verification lane justified by the changed surface.
- Inspect real browser behavior when the user-facing route or layout changed.
- Separate local edits, checks, commit, push, PR, merge, deploy, and observed-user evidence.
- Never upgrade automated evidence into user validation.

Small, clear tasks may combine all four in one session. Keep review distinct enough that it can contradict the implementation pass.

## Optional Specialist Lenses

| Lens | Add when | Main responsibility |
| --- | --- | --- |
| Product/UX | Navigation, execution flow, information architecture, or product priority changes | First useful action, cognitive load, familiar-tool portability, and Stage fit |
| Content/source/risk | Source-to-Flow conversion or sensitive claims | Source fidelity, provenance, omissions, cautions, and natural artifact fit |
| Visual/browser | Layout, responsive behavior, HTML boards, or interactive controls | Hierarchy, overflow, state feedback, screenshots, console and browser behavior |
| Architecture/security | Shared contracts, persistence, auth, external input, dependencies, or trust boundaries | Ownership, migration, failure modes, data exposure, and rollback |
| Validation/release | Readiness scores, CI, deployment, external cohorts, or observed sessions | Operational evidence, release state, and QA-versus-validation boundaries |
| Memory/spec | A durable rule, deferred direction, multi-step initiative, or route ownership changes | Write once to the correct canonical document and link instead of duplicating |

Do not add a specialist merely because its title matches the task. Add it when omitting that lens creates a concrete risk.

## Typical Selection

| Work | Passes |
| --- | --- |
| Typo or small local fix | Implement, Review, targeted Evidence |
| Multi-file behavior change | All four core passes |
| Source conversion | Core passes plus Content/source/risk |
| User-facing UX or HTML | Core passes plus Product/UX and Visual/browser |
| Architecture, security, or release | Core passes plus the matching specialist; use Full lane when blast radius is broad |
