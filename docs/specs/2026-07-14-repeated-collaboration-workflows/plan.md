# Plan

1. Define the four workflow contracts under `docs/workflows/`.
2. Add a dependency-free read-only reporter with pure exported classification helpers.
3. Test status parsing, path grouping, and verification recommendation.
4. Add four concise skills that route agents to the canonical workflow documents.
5. Add package and harness entrypoints without changing existing hook or CI behavior.
6. Sync and validate skills, then run docs, test, and build gates.

## Commit Boundary

Keep this workflow/harness slice separate from current product, content, dependency, and UX worktree changes. Do not commit or publish unrelated files.
