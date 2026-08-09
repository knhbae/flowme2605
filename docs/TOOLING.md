# FLOW Tooling Policy

Last updated: 2026-08-09

Status: P0 tooling and supported-runtime refresh applied; adaptive lean harness and selective Notion projection active.

This document turns the current tool and plugin review into day-to-day routing rules. The goal is not to install every useful tool. The goal is to make planning, design, implementation, QA, and PR work consistently choose the strongest available tool lane.

## Operating Principle

Use the smallest tool set that proves the work. Treat user comments as evidence and direction, not automatic commands. When a task touches product direction, UX, source conversion, frontend behavior, or release risk, route it through the relevant P0 lane below and record the outcome in the durable document graph.

## P0 Tool Lanes

| Lane | Use when | Required behavior |
|------|----------|-------------------|
| Runtime and supply-chain hygiene | Installing, building, releasing, or refreshing dependencies | Use Node.js 24, keep high-severity audit findings at zero, review remaining moderate findings, and let Dependabot propose bounded updates. Do not defer a known vulnerable runtime because tests pass. |
| FLOW repo skills | A task matches FlowMe-specific content, UX, release, memory, or conditional collaboration behavior | Load only the matching skill. Canonical skills live in `.agents/skills/`; `.claude/skills/` and optional Codex user-scope copies are generated and must not be edited directly. Skill availability does not make every skill a default phase. |
| Notion operations projection | Reviewing active human gates, direct user actions, high-level AI work packages, blockers, or handoff checkpoints | Use [00 FlowMe 운영 홈](https://app.notion.com/p/39ac0d8f693f81339a34fdb75552bc27) as a selective view only. Read and update the canonical repo first; update only touched rows. |
| Playwright and browser QA | Changing user-facing routes, HTML workboards, save/export behavior, calendar behavior, or responsive layout | Verify the real rendered surface. For UI work, capture at least the route-level behavior that changed; add mobile/desktop checks when layout or readability is affected. |
| GitHub workflow tools | Handling PRs, conflicts, review comments, CI failures, branch state, or release handoff | Prefer GitHub/gh-assisted inspection for PR state and checks. Keep commits scoped to the task unit and report verification evidence. |
| Figma and UX design tools | Defining or revising major screen boundaries, service IA, design systems, creator/public/My Flow separation, or design-to-code handoff | Use for screen-level product shape and design-system alignment. Do not spend Figma effort on small static doc edits unless the artifact is meant to become a shareable design reference. |
| Build Web Apps, Vercel, and shadcn | Building or refactoring actual frontend screens, prototypes, route behavior, component systems, or deployable previews | Follow existing app patterns first. Use shadcn only when adding or aligning a component system. Use Vercel previews as QA evidence, not as observed-user validation. |

## P1 Trigger-Gated Lanes

These are promising but should be adopted when a concrete repo problem appears.

| Candidate | Adopt when | First use |
|-----------|------------|-----------|
| PostHog | The first external cohort begins using URL intake, save, export, check, and return paths | Define the event contract, consent and data-retention boundary first. Prefer it as the first product-evidence candidate because it combines analytics, replay, flags, surveys, and error tracking. |
| Sentry | Production errors need a dedicated issue/stack-trace workflow beyond Vercel logs or PostHog error tracking | Create the Sentry project and privacy boundary first, then install the official read-only Codex skill and CLI. Do not add both Sentry and PostHog error tracking without separate ownership. |
| Promptfoo | A live AI URL-to-draft slice is approved and source fidelity needs regression tests | Start from a local golden set and pin data-egress behavior. Some red-team features have raised community concerns about remote generation, so prompts and source content must not leave the chosen boundary by accident. |
| Firecrawl or source extraction MCP | Source collection becomes a repeated bottleneck | Use only after source permission, quality, and risk gates are explicit. |
| Linear planning connector | The selective Notion projection and repo HTML workboards no longer support planning scale | Keep the repo docs canonical unless a separate decision deliberately changes the source of truth. |

## Active Selective Connector

- Operations home: [00 FlowMe 운영 홈](https://app.notion.com/p/39ac0d8f693f81339a34fdb75552bc27)
- Work-item data source: `collection://4946eb61-01b1-49e8-929e-82b118740310`
- Project only active human gates, high-level AI work packages, blockers, checkpoints, completion conditions, and repo evidence links.
- Give every projected item a `제품 방향` and keep the home-level `사용자가 챙길 것` summary focused on the user's current decisions, direct actions, external preparation, and result reviews.
- When a substantial review artifact is finished, add it to the top feedback queue only if the user still owes a decision, feedback, or external action; put durable watchpoints in `계속 주지할 것` and keep AI-owned cleanup out of the human queue.
- Show a direct `Repo 근거` link on human-facing views. For local uncommitted HTML or Markdown, attach a dated review snapshot to the work-item page and keep the repo-local path visible until the canonical GitHub link is available.
- Keep full specs, decisions, implementation detail, tests, and history in the repo. On mismatch, update the repo first and mark the Notion row stale.
- During routine work, update only rows touched by the task; do not mirror the entire backlog.

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
| Runtime, dependency, or release-tooling change | `npm run security:audit`, `npm run docs:check`, `npm test`, `npm run build`, and CI-config review |
| Frontend behavior or route change | `npm run docs:check`, `npm test`, and route-appropriate browser or E2E verification |
| Layout, responsive, or HTML artifact change | Browser visual check when the artifact is meant for human review; add screenshots when practical |
| Source-to-FLOW conversion | FLOW content conversion skill plus source/risk review; add tests when code transforms data |
| PR conflict, CI, or review response | GitHub/gh inspection plus the failing check reproduced or explained |
| Deployment or shareable preview | Build and preview/deploy verification; label it QA evidence unless observed users validated it |

## Automation Gates

Use repository-level automation before tool-specific runtime hooks.

| Gate | Scope | Command |
|------|-------|---------|
| Local pre-commit hook | Fast docs and skill drift check before each commit | `npm run docs:check` |
| Local pre-push hook | Core code confidence before publishing a branch | `npm run verify` |
| GitHub CI core job | Pull requests and pushes to `main` | `npm run verify` |
| GitHub CI dependency gate | Pull requests and pushes to `main` | `npm run security:audit` blocks high-severity findings |
| GitHub CI E2E job | Pull requests and pushes to `main` | `npm run build`, `npx playwright install --with-deps chromium`, `npm run test:e2e`, then retain report/test artifacts |

Install local Git hooks with:

```powershell
npm run hooks:install
```

The hooks use native Git `core.hooksPath` and do not add a package dependency. Use `FLOW_SKIP_HOOKS=1` only for emergency bypasses, and record why verification was skipped.

## Skill Discovery And Sync

Canonical skills are grouped by trigger:

| Group | Skills | Policy |
| --- | --- | --- |
| FlowMe domain | `flow-content-conversion`, `flow-ux-review`, `flow-release-readiness`, `flow-direction-capture` | Keep because they encode project-specific product, source/risk, validation, or memory boundaries. Load the one relevant to the task. |
| Conditional workflow | `flow-session-start`, `flow-request-interview`, `flow-knowledge-maintenance`, `flow-work-closeout` | Use only for the trigger stated in each skill; they are not a mandatory lifecycle. |
| Optional editorial | `flow-copy-editor`, `humanize-korean` | Use only for explicit copy/naturalness work. Do not load for normal implementation or planning. |

Use these commands after changing a canonical skill:

```powershell
npm run skills:sync
npm run skills:install:codex
npm run skills:check:codex
```

`skills:sync` refreshes Claude Code copies inside the repo. `skills:install:codex` refreshes same-named canonical skills under the current user's Codex home, which helps tasks opened from the workspace parent. Other user skills are left untouched.

## Current Capability Inventory

Already available: FLOW repo skills, Korean naturalness review, Figma design and Code Connect skills, frontend app building, Playwright and in-app browser control, GitHub PR/CI workflows, Sites, Vercel deployment, the selective Notion operations projection, and security review/threat-model skills.

Do not duplicate these with similarly named curated skills merely because a catalog command reports the standalone package as uninstalled. Capability availability, not package-name equality, is the check.

Use the current [OpenAI Plugins repository](https://github.com/openai/plugins) and [plugin build guide](https://learn.chatgpt.com/docs/build-plugins) when checking official examples. The former `openai/skills` catalog is deprecated, so do not treat its popularity or inventory as proof that a skill is current.

Intentionally not installed by default: Expo/native mobile, Linear planning, office/calendar connectors, Sentry, PostHog, Promptfoo, and source extraction MCPs. Their triggers are listed above.

## Community Skill Adoption Gate

Use this gate before adding a skill, plugin, MCP, hook bundle, or design harness
found through a community post or registry:

1. Count independent usage reports separately from author launch posts,
   cross-posts, generated catalog entries, cumulative stars, and self-scored
   demos.
2. Compare the candidate with built-in and already installed capabilities. A
   new package must close a concrete gap, not duplicate a familiar name.
3. Read `SKILL.md`, executable scripts, hooks, network calls, install targets,
   auto-update behavior, and home-directory writes before running an installer.
   Do not pipe a remote installer directly to a shell without reviewing the
   downloaded source.
4. Trial one candidate at a time in a disposable branch or worktree. Start with
   a read-only critique or manual check, keep automatic hooks off, and compare
   the same bounded task against the current baseline.
5. Promote the candidate only when the trial improves a recorded outcome enough
   to justify context, maintenance, security, and workflow cost. Remove it when
   the result is neutral or conflicts with project rules.

Dynamic registries such as UI skill catalogs are discovery tools, not trusted
runtime dependencies. Inspect and pin or copy the exact reviewed skill before
using it in a sensitive repository.

## Supported Runtime

- Node.js: `24.x` through `package.json` and `.node-version`.
- Vercel: follows the `package.json` engine override.
- CI: Node.js 24 with npm cache, high-severity audit gate, core verification, and Playwright artifacts.
- Dependency updates: weekly npm and GitHub Actions checks through `.github/dependabot.yml`; patch updates are grouped, while larger upgrades remain reviewable.

## Related Documents

- [Tooling/plugin review](./content-audit/2026-07-02-tooling-plugin-review-ko.html)
- [2026-07-10 tooling, skills, and settings refresh](./content-audit/2026-07-10-tooling-skills-settings-refresh-ko.html)
- [2026-08-09 community planning, UX, UI, and design skill research](./content-audit/2026-08-09-community-planning-ux-ui-skill-settings-research-ko.html)
- [Backlog HTML workboard](./content-audit/2026-07-02-backlog-workboard-ko.html)
- [Service structure](./SERVICE_STRUCTURE.md)
- [Decision log](./DECISIONS.md)
- [Harness README](./harness/README.md)
