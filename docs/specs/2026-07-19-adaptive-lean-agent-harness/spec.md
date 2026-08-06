# Adaptive Lean Agent Harness Spec

**Date:** 2026-07-19
**Status:** Implemented
**Owner:** Codex
**Related roadmap:** Process-only change; no product backlog promotion

## Goal

Reduce custom agent context and procedural overhead while preserving FlowMe-specific product knowledge, source/risk boundaries, dirty-worktree protection, and deterministic verification.

## Evidence Baseline

- `AGENTS.md` and `agent.md` total 406 lines before this change, and the entry path asks every coding task to read ten documents.
- `docs/harness/ROLES.md` defines 17 lenses even though most tasks need only implementation, review, and evidence passes.
- Session-start, direction-capture, closeout, verification, and Notion rules repeat across the entry guide, harness, workflows, tooling policy, and skills.
- Skill metadata is useful for discovery; the larger cost comes from broad triggers and unconditional document loading, not from the existence of a task-specific skill alone.
- GPT-5.6 Sol Ultra already coordinates multiple agents, while current harness evaluations show that model-harness pairing and task horizon matter more than instruction volume alone: [OpenAI GPT-5.6](https://openai.com/index/gpt-5-6/), [Harness-Bench](https://arxiv.org/abs/2605.27922), [Agents' Last Exam harness analysis](https://agents-last-exam.org/blogs/harness-matters), and [Latch harness ablation](https://blog.latch.bio/p/why-an-open-source-harness-outperforms).

## Scope

In:
- Replace unconditional reading with task-routed context.
- Define minimal, standard, and full verification lanes.
- Collapse default role orchestration to four core passes and keep specialists optional.
- Narrow workflow and skill triggers without deleting FlowMe domain knowledge.
- Keep generated Claude/Codex skill copies synchronized.

Out:
- Product behavior, runtime code, seed/content work, hooks, CI, or deployment changes.
- Removal of FlowMe content, UX, release, or direction-capture domain knowledge.
- Claims that the lean harness is behaviorally superior before repeated task evidence exists.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | Ask Codex or Claude Code to perform a normal repo task without manually naming harness documents. |
| Completion signal | The agent loads only task-relevant context, protects unrelated changes, and runs the matching verification lane. |
| Artifact destination | Repo entry docs, harness docs, workflows, and discoverable skills. |
| Source/risk boundary | Product and source-risk rules remain canonical; only duplicated operating instructions are reduced. |
| Natural artifact | A short entry guide that routes a small fix differently from product review or release work. |
| Verification | Skill synchronization, docs link checks, scoped diff review, and later task-level ablation. |

## Acceptance Criteria

- `AGENTS.md` no longer requires ten documents for every task.
- `agent.md` becomes a concise project guardrail and document router instead of a second product archive.
- Four core role passes cover normal work; specialists are opt-in.
- Session Start, Request Interview, Direction Capture, and Work Closeout remain available but have explicit conditional triggers.
- Git hooks, CI, and risk-based verification remain unchanged.
- `npm run docs:check` and `npm run skills:check:codex` pass after synchronization.

## Evaluation Rule

Do not infer a quality win from reduced line count. Compare minimal, adaptive, and full modes across at least two small fixes, two FlowMe product/content tasks, and two repo-wide or release tasks. Track first-pass correctness, unintended files, verification retries, user corrections, elapsed time, and token use when available.

## Static Result

- Automatic entry plus expanded guardrail (`AGENTS.md` + `agent.md`) changed from 402 to 138 physical lines, a 66% reduction. `AGENTS.md` gained explicit routing while `agent.md` dropped historical product duplication.
- Default role and SDLC guidance (`ROLES.md` + `SDLC.md`) changed from 259 to 136 physical lines, a 47% reduction.
- Seventeen named roles became four core passes plus six opt-in specialist lenses.
- The Session Start report now prints two core documents and six request-specific routes instead of a ten-document reading order.

These are context and maintenance measurements only. They do not establish behavioral superiority.

## 2026-08-04 Behavioral Check

Six representative tasks were run once against both the current and a lighter read-only snapshot: two micro fixes, two FlowMe domain tasks, and two status/release tasks. All 12 runs completed without modifying either snapshot, and manual pair review found no material loss in conclusion, ownership boundary, or required verification.

The lighter variant reduced aggregate input tokens by 16.8%, output tokens by 15.8%, elapsed time by 19.0%, and tool calls by 40.0%. This is not a stable cost claim: uncached input increased by 7.6%, and the two micro tasks did not consistently improve. Adopt only the conditional `agent.md` entry and shorter skill discovery descriptions. Keep skill bodies, hooks, CI, workflows, and canonical documents unchanged, then recheck normal-task behavior before any further pruning.

Evidence: [A/B evaluation ledger](../../content-audit/2026-08-04-flowme-harness-lightweight-ab-evaluation-v1.json) and [Korean visual review](../../content-audit/2026-08-04-flowme-agent-harness-skill-lightweight-trend-review-ko.html).
