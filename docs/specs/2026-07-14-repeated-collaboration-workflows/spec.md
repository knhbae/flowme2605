# Repeated Collaboration Workflows

## User Need

FlowMe work repeatedly performs the same orientation, request clarification, direction capture, verification, and handoff steps across Codex and Claude Code sessions. The repeated sequence should be discoverable and consistent without automating product judgment, interrogating clear requests, or creating another source of truth.

## Decision

Define four P0 workflows: Session Start, Request Interview, Direction Capture, and Work Closeout. Keep Request Interview conditional and bounded to material uncertainty. Keep the canonical procedures in `docs/workflows/`, expose them through canonical repo skills, and use dependency-free Node scripts only for deterministic read-only repo inspection. Reuse existing hooks, CI, verification commands, doc graph, and Notion projection.

## Scope

- Add canonical workflow documents and discovery index.
- Add a read-only `repo-workflow.mjs` reporter for session start and closeout.
- Add `flow-session-start`, `flow-request-interview`, `flow-direction-capture`, and `flow-work-closeout` skills.
- Synchronize Claude Code and optional Codex user-scope skill copies.
- Add package entrypoints and tests for deterministic classification.
- Link the workflow layer from the harness and spec index.

## Out Of Scope

- Automatic product decisions or backlog promotion
- Automatic Notion writes without an active human gate
- Automatic commits, pushes, PR merges, deploys, or destructive cleanup
- Replacing existing hooks, CI, release-readiness, UX-review, or content-conversion skills
- Building a general workflow engine or adding external dependencies

## Acceptance Criteria

1. `npm run workflow:session-start` reports repo identity, git state, changed-path groups, newest review artifacts, and reading order without writing files.
2. `npm run workflow:closeout` reports change groups, recommended verification commands, documentation checkpoints, and separate publish states without claiming checks ran.
3. Pure classification and verification selection have automated tests.
4. All four workflow skills validate and are identical under `.agents/skills/` and `.claude/skills/` after sync.
5. Parent-workspace Codex skill copies can be refreshed through the existing install command.
6. `npm run docs:check`, `npm test`, and `npm run build` pass, or any unrelated existing failure is explicitly isolated.

## Safety And Evidence Rules

- Dirty paths are evidence of change, not evidence of task ownership.
- Automated QA, preview smoke, deployment, and observed-user validation remain separate claims.
- The deterministic reporter never mutates repo or external state.
- Request Interview asks only questions whose answers can change the selected path, defaults to one round of at most three questions, and is skipped when ambiguity is non-material.
- The repo document graph remains canonical; Notion remains a selective projection.
