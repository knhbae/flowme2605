# Adaptive Development Cycle

Choose the lightest lane that can support the final claim. Escalate when scope or risk grows.

## Lane 1: Minimal

Use for a clear answer, typo, isolated documentation edit, or low-risk local code fix.

1. Read `AGENTS.md`, `agent.md`, and the directly relevant files/tests.
2. Inspect Git state before editing and exclude pre-existing changes.
3. Make the scoped change.
4. Review the diff from a failure-mode perspective.
5. Run the targeted verification required by [QA.md](./QA.md).

Skip Session Start, a durable spec, role delegation, Notion projection, and Work Closeout unless the task reveals a reason to escalate.

## Lane 2: Standard

Use for multi-file work, FlowMe product/content work, or user-facing behavior with bounded scope.

1. Run Session Start only when resuming context or ownership is mixed.
2. Add the relevant product, architecture, tooling, decision, or spec document through the routes in `AGENTS.md`.
3. Select the matching FlowMe skill and write a short plan.
4. Perform the four core passes in [ROLES.md](./ROLES.md), combining them in one agent when appropriate.
5. Run targeted checks, then broaden according to blast radius.
6. Capture only material decisions, deferred directions, or changed current truth.

A short inline plan is enough when the work is coherent and reversible. Create a durable spec only when another session must inherit the contract before implementation completes.

## Lane 3: Full

Use for broad or ambiguous work, mixed ownership, architecture/security changes, deployment/release work, product-wide review, or a committed initiative that spans multiple passes or verification modes.

1. Run `npm run workflow:session-start` and inspect request-relevant diffs and evidence.
2. Create or update `docs/specs/YYYY-MM-DD-short-topic/` with scope, plan, tasks, and QA evidence.
3. Use only the specialist lenses justified by concrete risk.
4. Implement in reviewable units with targeted tests first.
5. Run broad verification, browser evidence, security checks, or external-state inspection as required.
6. Run scoped Work Closeout before handoff or publication.
7. Update PR history and release documents only when the corresponding event actually exists.

## Spec Gate

Create a durable spec before implementation when the work:

- Changes a user-facing flow or shared data/ownership contract across multiple modules.
- Is source/risk-sensitive, security-sensitive, deployment-sensitive, or difficult to reverse.
- Changes automatic agent entry, skill discovery/sync, verification enforcement, or other harness behavior future sessions must follow.
- Requires more than one session, owner, implementation pass, or verification mode.

Skip a spec for a small wording fix, isolated test correction, reversible local refactor, or investigation that commits no durable direction.

## Common Scope Rules

- Define the user-visible or process-visible goal, affected files, verification, and explicit non-goals.
- Use Request Interview only when unresolved ambiguity materially changes the result; inspect repo evidence first.
- Keep good but uncommitted ideas out of the implementation scope. Record them only when they have durable value and a revisit trigger.
- Preserve user changes and never infer ownership from modification time alone.
- Prefer existing patterns and structured APIs over new abstraction.

## Common QA And Review

- Use [QA.md](./QA.md); do not claim a command passed unless it ran in the current worktree.
- For behavior changes, update tests where practical and run the smallest useful test first.
- For docs, policy, harness, or skill changes, run `npm run docs:check`.
- For user-facing changes, verify the actual rendered surface and relevant state transitions.
- Review independently. When one agent authored and reviewed, explicitly switch to a failure-mode pass.

## Publish, Release, And Deploy

Publication is never implied by local completion.

1. Inspect the scoped diff and verification evidence.
2. Create intentional commit groups and a PR history entry for PR-sized work.
3. Push, open/merge a PR, or deploy only when requested.
4. Verify each external state directly.
5. Record deploy smoke evidence and rollback notes when relevant.
6. Report automated QA, preview smoke, and observed-user evidence separately.
