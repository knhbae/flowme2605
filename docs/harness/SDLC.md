# Development Cycle

This cycle mirrors the referenced harness guide while staying AI-agnostic.

## 1. Status

Start with the read-only repo report:

```powershell
npm run workflow:session-start
```

Read:

```powershell
Get-Content -Raw AGENTS.md
Get-Content -Raw agent.md
Get-Content -Raw docs/STATUS.md
Get-Content -Raw docs/ROADMAP.md
Get-Content -Raw docs/IDEAS.md
Get-Content -Raw docs/TOOLING.md
Get-Content -Raw docs/specs/README.md
git status --short --branch
node --version
```

Confirm current focus, branch, dirty files, and required verification.

## 2. Issue / Scope

For new work, define:

- User-visible goal
- Files likely to change
- Product constraints from `agent.md`
- Verification commands
- Runtime, dependency, data-access, and external-tool prerequisites
- Out-of-scope items
- Deferred ideas from `docs/IDEAS.md` that should influence or stay out of scope

Keep detailed specs in `docs/specs/` or a tracker issue. Keep `docs/ROADMAP.md` short.

When ambiguity could materially change the outcome, scope, risk, or success evidence, use the [Request Interview workflow](../workflows/request-interview.md) before fixing the scope. Inspect repo evidence first and ask only 1-3 high-information questions; skip the interview for clear or low-risk work.

If a useful idea appears during implementation but is not part of the current scope, append it to `docs/IDEAS.md` instead of expanding the task.

## 3. Spec Gate

Create a `docs/specs/YYYY-MM-DD-short-topic/` folder before implementation when the work is multi-step, user-facing, content/risk-sensitive, security-sensitive, deployment-sensitive, or changes the harness itself.

The folder should contain:

- `spec.md`: user need, Stage fit, scope, FlowMe gates, and acceptance criteria.
- `plan.md`: files, sequence, dependencies, and risk controls.
- `tasks.md`: executable checklist.
- `qa.md`: required checks and evidence table.

Tiny docs or local code fixes may skip a spec, but the final report should say why a spec was unnecessary.

If a tool-specific skill writes artifacts under `docs/superpowers/`, keep them there and link them from the relevant `docs/specs/` folder when the work becomes durable product direction.

## 4. Plan

For multi-step work, write a plan with:

- Parallel vs sequential tasks
- Exact files
- Tests to add or update
- Browser/manual checks
- Commit or PR boundary

Small documentation-only changes may use a short inline plan.

## 5. Implement

Follow existing patterns. Keep edits scoped. Preserve user changes.

For behavior changes:

1. Write or update a failing test where practical.
2. Implement the smallest change that passes.
3. Run targeted tests.
4. Run broader checks required by [QA.md](./QA.md).

For documentation/config-only changes, verify with file inspection and project commands that are relevant.
For agent or docs graph changes, run `npm run docs:check`.

## 6. QA

Use [QA.md](./QA.md). Do not move to PR/release until required checks pass or skipped checks are explicitly explained.

## 7. PR / Review

Run `npm run workflow:closeout` and inspect the scoped diff before choosing verification and commit boundaries.

Before opening a PR, create or update a PR history entry under `docs/pr-history/` using the naming pattern:

```text
docs/pr-history/YYYY-MM-DD-short-topic.md
```

Package changes with:

- Summary
- Related roadmap, `docs/specs/`, generated `docs/superpowers/`, or issue links
- PR history file link
- Test evidence
- Known risks
- Not-done items and follow-ups

Review independently. If the same AI implemented the work, switch to reviewer stance and look for failure modes first.

After the PR is opened, update the PR history entry with the PR URL/number. If the PR is deployed, merged, reverted, or materially rescoped, update its status, deploy URL, smoke-test result, risks, rollback notes, and follow-ups.

## 8. Release

On release:

1. Confirm clean working tree except intended release changes.
2. Confirm the active and configured Node.js version is supported by CI and the deployment target.
3. Run `npm run security:audit` and disclose any remaining moderate or higher finding.
4. Confirm tests, build, required browser checks, and downloadable CI failure evidence.
5. Keep automated QA, preview smoke, and observed-user evidence as separate claims.
6. Tag the release.
7. Update `docs/STATUS.md`, `docs/ROADMAP.md`, and `docs/HISTORY.md`.
8. Record user-facing changes, verification evidence, known risks, and rollback conditions.

## 9. Deploy

Before deployment:

- Confirm target environment and branch.
- Confirm the deployment runtime matches `package.json` and is not EOL.
- Run production build.
- Deploy.
- Smoke test the deployed URL.
- Record rollback notes when relevant.
- Update the matching `docs/pr-history/` entry with deploy URL, smoke-test evidence, and rollback notes.
