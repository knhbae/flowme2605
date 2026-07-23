# Adaptive Lean Agent Harness QA

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run skills:sync` | Pass | Generated `.claude/skills/` from the canonical tree. |
| Changed-skill `quick_validate.py` | Pass | All four changed canonical skills reported `Skill is valid!`. |
| `npm run docs:check` | Pass | Skill sync check and 2,387 local documentation links passed. |
| `npm run skills:install:codex` | Pass | Refreshed nine generated user-scope FlowMe skills. |
| `npm run skills:check:codex` | Pass | Nine user-scope skills match the canonical tree. |
| `node --test scripts/workflows/repo-workflow.test.mjs` | Pass | Five workflow tests passed, including adaptive context routing. |
| `npm test` | Pass | 519 tests passed. |
| Scoped `git diff --check` | Pass | No whitespace errors in task-owned paths. |

## Review Notes

- Product constraint review: Product behavior and Stage claims are unchanged.
- Source/risk review: Existing FlowMe source/risk skills and rules are retained.
- Browser or screenshot review: Not applicable; no user-facing surface changes.
- Residual risk: Behavioral benefit requires repeated task-level comparison, not only static line-count reduction. No build or browser run was needed because runtime and user-facing app behavior did not change.
