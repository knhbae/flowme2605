# QA

| Check | Command | Expected |
| --- | --- | --- |
| Session report | `npm run workflow:session-start` | Markdown report, no file mutation |
| Session JSON | `npm run workflow:session-start -- --json` | Parseable JSON with git and path groups |
| Closeout report | `npm run workflow:closeout` | Verification recommendations and publish ledger |
| Scoped closeout | `npm run workflow:closeout -- --scope=docs/workflows,scripts/workflows` | Recommendations exclude unrelated dirty paths |
| Request interview boundary | Review explicit-request, material-ambiguity, and clear-low-risk scenarios | Interview is bounded to the first two and skipped for the third |
| Workflow unit tests | `node --test scripts/workflows/repo-workflow.test.mjs` | All tests pass |
| Skill validation | `python .../quick_validate.py .agents/skills/<name>` | All four workflow skills valid |
| Claude sync | `npm run skills:sync` then `node scripts/sync-skills.mjs --check` | No differences |
| Codex user sync | `npm run skills:install:codex` then `npm run skills:check:codex` | All canonical skills match |
| Documentation | `npm run docs:check` | Required docs and local links pass |
| Project tests | `npm test` | Test suite passes |
| Production build | `npm run build` | Build succeeds |
| High-severity dependency gate | `npm run security:audit` | Exit 0; high or critical findings fail the gate |

The reporter must not modify tracked or untracked files. Compare `git status --porcelain` before and after smoke runs, allowing only files intentionally created by this implementation.

## Current Evidence

Verified on 2026-07-14 from `D:\flowme2605\flow-mvp`.

| Check | Result |
| --- | --- |
| Session and scoped closeout smoke | Pass; Markdown and JSON reports rendered, and scoped output excluded unrelated dirty paths |
| Read-only mutation check | Pass; `git status --porcelain` was identical before and after both reporters |
| Workflow unit tests | Pass; 4 of 4 |
| Request interview boundary | Pass; explicit requests and material ambiguity trigger one bounded interview, while clear low-risk work skips it |
| Skill validation | Pass; all four canonical workflow skills valid |
| Claude and Codex sync checks | Pass; generated Claude copies and 9 user-scope FLOW skills match canonical sources |
| Documentation | Pass; 14 required files and 2,219 local links |
| Project tests | Pass; 480 of 480 |
| Production build | Pass; optimized build, type checks, and route generation completed |
| Dependency gate | Pass at `high`; npm reports 2 transitive `moderate` PostCSS findings under Next.js |

The suggested `npm audit fix --force` would install an incompatible Next.js version, so it was not applied. No browser E2E run was required because this change adds repository workflow infrastructure and does not alter runtime UI behavior.

## Publish Ledger

- Local edit: complete in the current worktree.
- Verification: complete for the checks listed above.
- Commit: not created for this work.
- Push, PR, merge, and deploy: not performed.
- Unrelated concurrent worktree changes: left untouched.
