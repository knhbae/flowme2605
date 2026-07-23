---
name: flow-direction-capture
description: Record FlowMe direction that must survive the current task. Use for a confirmed durable rule, actionable deferred idea with a revisit trigger, approved multi-step initiative, active blocker, route contract, or release fact. Skip passing thoughts, duplicates, and implementation details already evident from the diff.
---

# FLOW Direction Capture

1. Read [the canonical workflow](../../../docs/workflows/capture-direction.md), search for an existing entry, and open only the repo memory layer relevant to the statement.
2. Treat user comments as evidence of context, discomfort, or desired direction unless they are explicit instructions or confirmed decisions.
3. Check for an existing decision or idea before adding another entry.
4. Route once: settled rule to `DECISIONS`, deferred direction to `IDEAS`, approved multi-step work to `specs`, active blocker/state to `STATUS`, route ownership to `SERVICE_STRUCTURE`, release fact to `HISTORY`/PR history, and source/review evidence to `content-audit`.
5. Record rationale, affected surfaces, uncertainty, and a concrete reopen/revisit trigger. Link related documents instead of duplicating them.
6. Project only active human gates to Notion, with an exact ask, recommendation, answer format, checkpoint, and openable artifact. The repo remains canonical.
7. Run `npm run docs:check` after repo documentation changes.

Do not promote a passing idea into the roadmap or infer product validation from implementation and QA evidence.
