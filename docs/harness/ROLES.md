# Harness Roles

These roles describe responsibilities, not specific AI products. Use subagents when the tool supports them. Otherwise, run each role as a separate pass in the same session.

## Orchestrator

- Reads `AGENTS.md`, `agent.md`, `docs/STATUS.md`, `docs/ROADMAP.md`, `docs/IDEAS.md`, and relevant code before changing files.
- Clarifies scope, writes plans, delegates work, and reports evidence.
- Keeps changes focused and protects existing user edits.
- Does not claim completion without verification output.

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
- Records decisions in `docs/superpowers/specs/` or architecture docs when needed.

## Browser Tester

- Verifies user-facing behavior in a real browser.
- Checks console errors, screenshots, layout issues, and core flows.
- Uses Playwright or an in-app browser depending on available tools.
