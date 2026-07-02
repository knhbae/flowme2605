# FLOW Tooling Policy

Last updated: 2026-07-02

Status: P0 tooling applied as operating policy.

This document turns the current tool and plugin review into day-to-day routing rules. The goal is not to install every useful tool. The goal is to make planning, design, implementation, QA, and PR work consistently choose the strongest available tool lane.

## Operating Principle

Use the smallest tool set that proves the work. Treat user comments as evidence and direction, not automatic commands. When a task touches product direction, UX, source conversion, frontend behavior, or release risk, route it through the relevant P0 lane below and record the outcome in the durable document graph.

## P0 Tool Lanes

| Lane | Use when | Required behavior |
|------|----------|-------------------|
| FLOW repo skills | Converting source content, reviewing FLOW UX, editing FLOW microcopy, or making Korean output less generic | Read the relevant skill before acting. Canonical skills live in `.agents/skills/`; `.claude/skills/` is generated and must not be edited directly. |
| Playwright and browser QA | Changing user-facing routes, HTML workboards, save/export behavior, calendar behavior, or responsive layout | Verify the real rendered surface. For UI work, capture at least the route-level behavior that changed; add mobile/desktop checks when layout or readability is affected. |
| GitHub workflow tools | Handling PRs, conflicts, review comments, CI failures, branch state, or release handoff | Prefer GitHub/gh-assisted inspection for PR state and checks. Keep commits scoped to the task unit and report verification evidence. |
| Figma and UX design tools | Defining or revising major screen boundaries, service IA, design systems, creator/public/My Flow separation, or design-to-code handoff | Use for screen-level product shape and design-system alignment. Do not spend Figma effort on small static doc edits unless the artifact is meant to become a shareable design reference. |
| Build Web Apps, Vercel, and shadcn | Building or refactoring actual frontend screens, prototypes, route behavior, component systems, or deployable previews | Follow existing app patterns first. Use shadcn only when adding or aligning a component system. Use Vercel previews as QA evidence, not as observed-user validation. |

## P1 Candidate Lanes

These are promising but should be adopted when a concrete repo problem appears.

| Candidate | Adopt when | First use |
|-----------|------------|-----------|
| PostHog or analytics | FLOW needs real usage evidence for saves, completions, exports, revisits, or drop-off | Define the event contract before installing analytics. |
| Langfuse, OpenAI Evals, or DeepEval | Source-to-FLOW conversion quality needs repeatable AI evaluation | Start with a small golden set from accepted source-backed Flow examples. |
| Firecrawl or source extraction MCP | Source collection becomes a repeated bottleneck | Use only after source permission, quality, and risk gates are explicit. |
| Linear or Notion MCP | Repo HTML workboards no longer support planning scale | Keep the repo docs canonical; external tools can mirror or summarize. |

## P2 Hold Lanes

Do not promote these until the trigger is visible.

| Lane | Hold reason | Trigger |
|------|-------------|---------|
| Supabase or durable DB tooling | Local and static data are still enough for many Stage 0 checks | Account-backed persistence, collaboration, or cross-device saved Flow data becomes committed work. |
| Expo/native mobile | The current product still needs web route and service IA proof | Native-only interaction, app-store distribution, push notifications, or device-calendar integration becomes required. |
| Slack, Drive, Docs, or office connectors | Team collaboration is not yet the main product bottleneck | Feedback and source docs start living outside the repo by default. |
| Marketplace, payment, token, or creator monetization tooling | Creator-market signals are not yet strong enough | Creator supply, publish workflow, or paid distribution becomes a committed spec. |

## Task Routing Checklist

Before starting non-trivial work, answer:

1. Which P0 lane should guide this task?
2. Which document is the durable source of truth for the decision, spec, status, or idea?
3. Does a human need an HTML workboard or dashboard view to understand the result?
4. Which verification path proves the claim: docs check, unit test, build, E2E, browser QA, content audit, PR check, or deploy preview?
5. Does the work change `SERVICE_STRUCTURE.md`, `DECISIONS.md`, `STATUS.md`, `IDEAS.md`, or a spec folder?

## Verification Defaults

| Work type | Minimum verification |
|-----------|----------------------|
| Docs-only policy, idea, or harness change | `npm run docs:check` |
| Frontend behavior or route change | `npm run docs:check`, `npm test`, and route-appropriate browser or E2E verification |
| Layout, responsive, or HTML artifact change | Browser visual check when the artifact is meant for human review; add screenshots when practical |
| Source-to-FLOW conversion | FLOW content conversion skill plus source/risk review; add tests when code transforms data |
| PR conflict, CI, or review response | GitHub/gh inspection plus the failing check reproduced or explained |
| Deployment or shareable preview | Build and preview/deploy verification; label it QA evidence unless observed users validated it |

## Related Documents

- [Tooling/plugin review](./content-audit/2026-07-02-tooling-plugin-review-ko.html)
- [Backlog HTML workboard](./content-audit/2026-07-02-backlog-workboard-ko.html)
- [Service structure](./SERVICE_STRUCTURE.md)
- [Decision log](./DECISIONS.md)
- [Harness README](./harness/README.md)
