---
name: flow-request-interview
description: Clarify a FlowMe request with a short evidence-based interview before execution. Use when the user explicitly asks to be interviewed to refine a request, or when a request is broad, ambiguous, high-impact, framed as a situation/discomfort/desired change, or has multiple plausible interpretations that would materially change product policy, UX, architecture, scope, or success evidence. Skip clear low-risk work and questions the repo can answer.
---

# FLOW Request Interview

1. Read [the canonical workflow](../../../docs/workflows/request-interview.md) and inspect relevant repo evidence before asking the user for information already available.
2. Restate the user's observed situation, discomfort, desired change, and inferred goal. Mark inference as inference rather than turning it into a requirement.
3. Interview only when unresolved ambiguity could materially change the result. Otherwise state the assumption and proceed.
4. Ask one round of 1-3 high-information questions. Put the recommended default first and explain the consequence of each answer. Ask a second round only when the first answer reveals a new blocking ambiguity.
5. Prefer questions about user/context, desired outcome, success evidence, constraints, and current scope. Do not ask the user to choose implementation details that repo evidence or engineering judgment can decide.
6. Consolidate the answers into: problem/context, desired outcome, deliverable, success evidence, constraints, current scope, deferred items, and named assumptions.
7. Confirm only decisions that change product direction or work scope. Proceed under explicit defaults for non-blocking uncertainty.
8. Apply `flow-direction-capture` when the interview settles durable direction, creates a deferred idea, approves multi-step work, or changes active status.

Avoid generic questionnaires, leading questions, solution-first framing, and repeated confirmation. Stop when one implementation path and its verification boundary are clear, the user declines further questions, or more detail would not change the work.
