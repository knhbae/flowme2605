# Request Interview Workflow

## Trigger

Use when the user explicitly asks to be interviewed to refine a request, or when the request is broad, ambiguous, consequential, or expressed primarily as a situation, discomfort, or desired change, and different interpretations would materially change product policy, UX, architecture, scope, cost, risk, or success evidence.

Skip when the request is clear and low-risk, the answer is available in current repo evidence, or a reasonable assumption would not change the result. Do not interrupt momentum merely to make the prompt more complete.

## Inputs

- The user's exact statement and recent conversation context
- Current repo decisions, ideas, specs, status, implementation, and evidence relevant to the request
- Known constraints, publish boundary, and task risk
- Explicit facts separated from agent inference

## Steps

1. Rewrite the current understanding as four distinct parts: observed situation, user discomfort, desired change, and inferred underlying goal.
2. Inspect repo evidence before asking anything the project already answers.
3. Identify only ambiguities whose answers would change the chosen solution, scope, risk control, or verification.
4. If no material ambiguity remains, state the assumptions and continue without an interview.
5. Otherwise ask one round of 1-3 short questions. Put the recommended default first, name its tradeoff, and use mutually exclusive options when they make answering easier.
6. Ask questions in this priority order:
   - affected user and usage context
   - desired outcome or behavior change
   - evidence that would count as success
   - hard constraints or unacceptable outcomes
   - what belongs in the current task versus later
7. Ask a second round only when an answer creates a new blocking ambiguity. Never use a standing questionnaire.
8. Consolidate the result into a compact request brief:
   - Problem/context
   - Desired outcome
   - Deliverable
   - Success evidence
   - Constraints and non-goals
   - Current scope and deferred items
   - Explicit assumptions
9. Confirm only product or scope decisions that the user must own. Use stated defaults for non-blocking engineering details and proceed.
10. Apply the Direction Capture workflow if the interview settles durable direction, creates a deferred idea, approves multi-step work, or changes active status.

## Human Gate

The user owns priorities, unacceptable outcomes, and product-direction choices. The agent may recommend a default with evidence, but must not convert a user's situational claim, discomfort, or tentative preference into a settled requirement.

## Outputs

- A concise request brief in chat or the active spec
- Explicit assumptions and deferred items
- At most the minimum follow-up questions needed to choose an execution path
- Optional canonical direction update through the Direction Capture workflow

## Verification

- Each question changes a real decision or is removed.
- The final brief distinguishes user statements from agent inference.
- Success evidence is observable and does not confuse automated QA with user validation.
- The interview does not ask the user to decide implementation details already covered by repo evidence or established engineering practice.

## Memory Update

Do not save the entire interview transcript. Save only settled direction, approved work, active state, or deferred ideas in the canonical repo layer selected by the Direction Capture workflow.
