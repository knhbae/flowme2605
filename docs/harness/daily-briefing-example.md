# Daily Briefing Example

This is an example format for a daily or session-start briefing. It is not the current project state.

Visual version: [daily-briefing-example.html](./daily-briefing-example.html)

Use this when a future agent needs to summarize the repo before planning work. The briefing should treat the user's comments as situated claims and discomfort signals, not automatic instructions. It should separate evidence, assumptions, and proposed next actions.

## Input Sources

Read in this order before writing the briefing:

1. [AGENTS.md](../../AGENTS.md)
2. [agent.md](../../agent.md)
3. [docs/harness/README.md](./README.md)
4. [docs/STATUS.md](../STATUS.md)
5. [docs/ROADMAP.md](../ROADMAP.md)
6. [docs/PRODUCT_PRINCIPLES.md](../PRODUCT_PRINCIPLES.md)
7. [docs/DECISIONS.md](../DECISIONS.md)
8. [docs/IDEAS.md](../IDEAS.md)
9. Recent relevant files under `docs/content-audit/`
10. `git status --short` and recent `git log --oneline`

## Example Briefing

### 1. Current Read

Today the strongest confirmed signal is:

- Stage 0 remains the operating frame.
- Do not call anything validated unless there is real user behavior evidence.
- Current repo state has several uncommitted product/content changes, so any new work must avoid broad cleanup or unrelated staging.

Evidence:

- `docs/STATUS.md` says the active state is still pre-observation / no-signal unless a newer committed file says otherwise.
- `docs/DECISIONS.md` is the source for settled product, UX, and process rules.
- `git status --short` shows whether the workspace is clean or mixed.

### 2. User Signal Interpretation

User comment:

> "This feels too AI-like. I want it to feel more like a real daily briefing."

Interpretation:

- This is a discomfort signal, not a final implementation command.
- The likely problem is not just tone. It may involve evidence selection, ordering, density, missing uncertainty, and whether the briefing names the next concrete action.
- The agent should compare at least two approaches before editing files.

Assumptions to verify:

- Does the user mean prose style, information architecture, visual layout, or all three?
- Is the briefing for the user, another agent, or a team member?
- Should it be a reusable template, a generated daily artifact, or a product feature concept?

### 3. Objective Assessment

What a useful briefing must do:

- Preserve evidence boundaries.
- Say what is known, unknown, blocked, and next.
- Avoid pretending every user idea is approved roadmap.
- Make unstated risks visible before proposing work.
- Keep the output short enough to read before starting the day.

What would be weak:

- Listing every file touched yesterday without priority.
- Treating unverified docs as validation.
- Turning user discomfort into an immediate command without checking cause.
- Adding more process docs when the real blocker is user observation.

### 4. Recommended Plan

1. Refresh current evidence from `STATUS`, `DECISIONS`, `IDEAS`, and `git status`.
2. Identify what changed since the previous session.
3. Write a short briefing with four sections: `Now`, `Evidence`, `Risks`, `Next`.
4. If the briefing implies a new decision or product direction, record it in `DECISIONS` or `IDEAS` according to the harness rules.
5. Run `npm run docs:check` after documentation changes.

### 5. Example Output Shape

```md
# FLOW Daily Briefing - YYYY-MM-DD

## Now
- Current operating frame:
- Active product constraint:
- Workspace state:

## Evidence
- Confirmed from docs:
- Confirmed from git:
- Not yet proven:

## Risks
- Product risk:
- Process risk:
- Evidence gap:

## Next
1. First action:
2. Verification:
3. What not to do yet:
```

## Notes For Agents

- If facts conflict, name the conflict and say which file or git signal you trusted.
- If the user states a preference, treat it as evidence to evaluate, not as a command to obey blindly.
- If the user asks for "more natural" writing in Korean, consider the `humanize-korean` skill after the substance is correct.
- Do not use this example as current truth. It is only a briefing pattern.
