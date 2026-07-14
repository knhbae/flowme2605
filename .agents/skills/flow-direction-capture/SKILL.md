---
name: flow-direction-capture
description: Classify and record FlowMe product, UX, data, content, source-risk, process, and planning direction discussed during a task. Use when the user or agent settles a rule, raises a deferred idea, approves multi-step work, changes current status, or mentions important direction mid-implementation that must not remain only in chat.
---

# FLOW Direction Capture

1. Read [the canonical workflow](../../../docs/workflows/capture-direction.md) and the current repo memory layer relevant to the statement.
2. Treat user comments as evidence of context, discomfort, or desired direction unless they are explicit instructions or confirmed decisions.
3. Check for an existing decision or idea before adding another entry.
4. Route once: settled rule to `DECISIONS`, deferred direction to `IDEAS`, approved multi-step work to `specs`, active blocker/state to `STATUS`, route ownership to `SERVICE_STRUCTURE`, release fact to `HISTORY`/PR history, and source/review evidence to `content-audit`.
5. Record rationale, affected surfaces, uncertainty, and a concrete reopen/revisit trigger. Link related documents instead of duplicating them.
6. Project only active human gates to Notion, with an exact ask, recommendation, answer format, checkpoint, and openable artifact. The repo remains canonical.
7. Run `npm run docs:check` after repo documentation changes.

Do not promote a passing idea into the roadmap or infer product validation from implementation and QA evidence.
