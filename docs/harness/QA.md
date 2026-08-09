# QA Checklist

Use the smallest sufficient verification set, then broaden based on risk.

## Required By Change Type

| Change Type | Required Checks |
|-------------|-----------------|
| Pure docs | Inspect changed docs; run `npm run docs:check` |
| Harness/process docs | Inspect changed docs; run `npm run docs:check`; confirm `docs/specs/README.md` still matches [SDLC.md](./SDLC.md) |
| Skill source or discovery | Validate changed `SKILL.md`; run `npm run skills:sync`, `npm run docs:check`, and `npm run skills:check:codex` after installing user-scope copies |
| Spec-driven work | Confirm `docs/specs/YYYY-MM-DD-short-topic/` has `spec.md`, `plan.md`, `tasks.md`, and `qa.md`, or document why no spec was needed |
| Pure utility logic | `npm test` |
| App/runtime behavior | `npm test`, `npm run build` |
| Runtime, dependency, or CI tooling | Confirm supported Node version; run `npm run security:audit`, `npm run docs:check`, `npm test`, and `npm run build`; inspect workflow syntax and residual audit findings |
| User-facing flow | `npm test`, `npm run build`, `npm run test:e2e` |
| Visual layout | Browser inspection and screenshot, plus relevant automated checks; when fidelity is disputed, compare computed typography, spacing, color, border, and element bounds before the final pixel review |
| Sensitive content | Source/risk label review and wording review |

## Standard Commands

```powershell
npm run security:audit
npm run docs:check
npm test
npm run build
npm run test:e2e
```

Playwright uses `npm run start -- -p 3104` and verifies `/flows`.
CI retains `playwright-report/` and `test-results/` artifacts for 14 days when the E2E job runs.

## Report Format

When finishing work, report:

- Files changed
- Spec or PR history links when applicable
- Verification commands and results
- Skipped checks with reason
- Residual risk, if any
- Runtime version and remaining moderate-or-higher audit findings for release/tooling work

## Failure Handling

If a check fails:

1. Capture the failing command and relevant error.
2. Determine whether the failure is pre-existing or caused by the change.
3. Fix change-caused failures before completion.
4. Ask before spending significant time on unrelated pre-existing failures.

When CI-only E2E fails, inspect the retained Playwright report, traces, and screenshots before rerunning or changing selectors.
