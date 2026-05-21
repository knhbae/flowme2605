# UX and Content Evaluation Harness

This document defines a reusable process for evaluating FLOW public routes from the perspective of real users trying to complete life tasks. Use it when changing public Flow UX, seed content, source/risk copy, exports, or onboarding.

## Goal

Verify whether a user can understand and use a Flow in a real-life situation without already knowing the original source content. The evaluation must account for different levels of domain knowledge, digital confidence, attention, and stress. The evaluation must find both strengths and friction: what helps the user act, what confuses them, what feels risky, and what needs to change.

## When To Run

Run this process when:

- Adding or changing public Flow execution pages.
- Adding, converting, or materially editing seed Flow content.
- Changing source, risk, caution, reminder, routine, calendar, copy, or export behavior.
- Preparing for a PR or deployment that affects user-facing execution.

## Sample Selection

Start with 5 representative Flows. Expand to as many as 8 if coverage is weak.

The sample should cover:

- At least one `timeline` Flow.
- At least one `routine` Flow.
- At least one `phase` or `meal_plan` Flow.
- At least one official or administrative source.
- At least one sensitive health, finance, legal, or safety-adjacent Flow.
- At least one creator-experience or reference-source Flow.

Default first sample:

| Flow | Why it is included |
| --- | --- |
| `moving-d30-basic` | Low-risk D-day timeline and strong Stage 0 candidate |
| `baby-food-menu-recipe` | Phase/meal plan, source trust, health-sensitive caution |
| `running-5k-4week` | Routine loop, missed-session recovery, exercise safety |
| `national-health-checkup-d7` | Official medical-sensitive preparation |
| `year-end-tax-docs` or `overseas-travel-d14` | Financial/administrative or travel safety execution |

Expand the sample if these five do not expose a content type, risk class, device layout, source type, or UX pattern touched by the planned change.

## Source Review

For each Flow, open the `source_url` before judging the app content.

Record:

- Source title, URL, source type, and checked date.
- What the original content is trying to help a person do.
- Which claims are official, creator experience, or general reference.
- Which steps are time-sensitive, safety-sensitive, or situation-dependent.
- What the Flow correctly converts into executable steps.
- What the Flow may omit, overstate, or blur.

Do not copy source text into evaluation artifacts beyond short labels. Summarize in your own words.

## Persona

Create one persona per Flow.

Each persona must include:

- Life situation and trigger: why they opened this Flow today.
- Goal: what concrete outcome they want.
- Constraints: time, money, confidence, device, deadline, family/work context.
- Comprehension lane: low-context, average, or confident.
- Trust need: what they must verify before acting.
- Success signal: what would make them feel ready to continue.

The persona should be realistic and specific enough to expose usability friction. Avoid generic "busy user" personas.

## Comprehension Spectrum

Do not assume users are highly analytical, patient, or already familiar with the domain. Every evaluated Flow must be checked through a low-context lens, even when the primary persona is average or confident.

Use these lanes:

| Lane | User profile | What the evaluation should stress-test |
| --- | --- | --- |
| Low-context | Little domain knowledge, may be anxious, may skim, may use mobile, may not understand official terms | Plain language, visible next action, forgiving defaults, source/caution clarity |
| Average | Knows the life event or goal but not all steps, willing to read short explanations | Sequencing, completion criteria, trust, export usefulness |
| Confident | Knows the domain or has done similar tasks before, wants speed and control | Fast scanning, shortcuts, exports, details on demand |

For sensitive Flows, bias toward low-context users because misunderstanding can create higher risk.

## First-Screen 10-Second Test

Every Flow must pass a strict first-screen test. Without opening details, source links, exports, or external explanations, a low-context user should be able to answer these questions within 10 seconds:

- What is this Flow for?
- What date, start point, or context do I need to enter?
- What should I do next?
- Is there any important caution or trust boundary?

If the primary action, required input, or major caution is not understandable from the visible screen, record at least a `P1` finding. If the screen could cause unsafe, medical, legal, financial, or official-procedure misunderstanding, record `P0`.

## No Added Explanation Rule

The evaluator must not rescue the interface by explaining it. If a persona would only understand the Flow because the evaluator inferred missing meaning, translated jargon, or mentally connected hidden details, record that as friction.

Allowed:

- Reading visible screen copy.
- Opening details as part of the task path.
- Opening the source URL when the persona would reasonably need verification.

Not allowed:

- Assuming the user knows the source content.
- Explaining domain terms that the screen does not explain.
- Treating hidden details as visible guidance.
- Ignoring confusing labels because the evaluator understands the product model.

## Screen Simulation

Run the Flow on the actual app screen whenever possible. Use desktop and mobile if the change affects layout.

Minimum task path:

1. Open `/flows` or direct route `/f/[slug]`.
2. Understand title, category, source, and risk within 10 seconds.
3. Enter the relevant anchor date or start date if the Flow uses one.
4. Identify the next action.
5. Open or inspect an item detail when a step is unclear.
6. Check one item.
7. Try at least one export or copy action that makes sense for the Flow.
8. Locate source/risk/caution information.
9. For routines, evaluate how a missed session is handled.
10. On mobile, verify that primary actions and text do not overlap or hide each other.
11. Re-read the first screen as a low-context user and note any term, label, or action that requires unexplained prior knowledge.
12. Apply the no added explanation rule: if the evaluator had to infer or explain meaning beyond the screen, record it as friction.

Capture screenshots for evidence when the finding is visual.

## Evaluation Checklist

Score each area from 0 to 3:

| Score | Meaning |
| --- | --- |
| 0 | Broken, misleading, or unusable |
| 1 | Usable only with effort or prior knowledge |
| 2 | Mostly clear, with fixable friction |
| 3 | Clear, useful, and confidence-building |

Evaluate:

- **Understanding:** Can the user tell what this Flow is for, why it matters, and what to do first?
- **Plain language:** Would a low-context user understand labels, warnings, and primary actions without knowing the source content?
- **First-screen clarity:** Can a low-context user answer the 10-second test questions from the visible screen?
- **Moment-by-moment guidance:** Does each screen state answer "what now" without making the user read everything?
- **Content fit:** Does the Flow match the source and persona goal without over-converting or under-explaining?
- **Actionability:** Are steps concrete, checkable, and sequenced realistically?
- **Anchor and timing:** Does date, phase, recurrence, or no-anchor behavior match the user's mental model?
- **Source and trust:** Are official info, creator experience, caution, and user action visually separated?
- **Safety:** Does sensitive content avoid medical, legal, financial, or safety certainty?
- **Exportability:** Does copy, Excel, calendar, or text export preserve enough context to act elsewhere?
- **Friction:** What is slow, hidden, ambiguous, visually cramped, or repetitive?
- **Recovery:** Can the user recover from missed tasks, uncertainty, or needing to verify externally?

## Findings Format

For each Flow, write:

```markdown
### [Flow Title] (`slug`)

**Persona:** [one paragraph]
**Source read:** [source title and URL, checked date]
**Scenario:** [what the user tries to do]

| Area | Score | Evidence |
| --- | ---: | --- |
| Understanding | 0-3 | [specific screen, copy, or behavior evidence] |
| Plain language | 0-3 | [specific unclear or easy-to-understand wording evidence] |
| First-screen clarity | 0-3 | [specific evidence from the 10-second test] |
| Moment-by-moment guidance | 0-3 | [specific screen, copy, or behavior evidence] |
| Content fit | 0-3 | [specific source/persona fit evidence] |
| Actionability | 0-3 | [specific step or completion evidence] |
| Anchor and timing | 0-3 | [specific date, phase, or recurrence evidence] |
| Source and trust | 0-3 | [specific source/risk separation evidence] |
| Safety | 0-3 | [specific sensitive-content evidence] |
| Exportability | 0-3 | [specific copy/export evidence] |
| Friction | 0-3 | [specific confusing or slow moment] |
| Recovery | 0-3 | [specific missed-task or uncertainty recovery evidence] |

**Strengths:**
- [what helped the persona understand or act]

**Friction:**
- [what blocked, slowed, or confused the persona]

**Required changes:**
- `[P0/P1/P2/P3]` [specific fix tied to evidence]

**Evidence:**
- Screenshot: [path or reason none was needed]
- Source note: [short source summary]
```

## Priority Rules

- `P0`: Unsafe, misleading, broken core action, or deploy blocker.
- `P1`: Prevents a likely user from completing the Flow confidently.
- `P2`: Noticeable friction or content gap with a clear fix.
- `P3`: Polish or future experiment.

Do not ship with open `P0` issues. Avoid deployment with open `P1` issues unless the user explicitly accepts the risk.

## Pass Criteria

A Flow is acceptable for the current iteration when:

- No `P0` findings remain.
- No unresolved `P1` finding from the 10-second first-screen test remains.
- No unresolved source/risk separation issue remains.
- The user can identify the next action within 10 seconds.
- A low-context user can understand the primary action and the most important caution without opening the source.
- The minimum score is at least 2 in every checklist area.
- Export/copy/check behavior works for the scenario.

The app-level evaluation is acceptable when:

- The sample covers the changed UX/content surface.
- Re-evaluation after fixes shows no new `P0/P1` findings.
- `npm run docs:check`, `npm test`, `npm run build`, and relevant E2E checks pass.
- Visual inspection has been done or the reason it could not run is documented.

## Iteration Loop

1. Select sample.
2. Review sources.
3. Create personas.
4. Simulate screen tasks.
5. Write evaluation report.
6. Convert findings into a fix list.
7. Write a modification plan.
8. Implement fixes with tests.
9. Re-run this process on the affected Flows.
10. If acceptable, prepare PR or deployment.

For Vercel deployment, run the full quality gate first and deploy only after the final evaluation pass is documented.
