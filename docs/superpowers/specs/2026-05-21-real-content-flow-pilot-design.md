# Real Content Flow Pilot Design

## Purpose

Validate whether real creator and official content can be converted into executable FLOW routes, starting from the B path: representative content converted into usable Flow objects before broader sourcing or creator operations work.

The pilot should answer three questions:

- Can practical content from different categories become a Flow without copying the original source?
- Does the converted Flow support immediate execution actions such as anchor input, checking, copy, export, or calendar use?
- Does the source naturally imply a creator portfolio model for managing multiple related Flows later?

## Scope

Build a focused pilot of 10 converted Flows:

| Category | Flow 1 | Flow 2 |
| --- | --- | --- |
| Appliance care | Samsung air-conditioner seasonal check Flow | Samsung washer filter and cleaning Flow |
| Car | TS vehicle inspection preparation Flow | Road Traffic Authority driver license renewal Flow |
| Exercise | ThankyouBUBU-style home workout routine Flow | Beginner running 4-week Flow |
| Certification exam | Q-Net application and exam-day preparation Flow | Sinagong-style computer skills D-30 study Flow |
| Diet | FITVELY-style diet meal and exercise tracking Flow | 2-week diet reset routine Flow |

The pilot does not add login, payments, AI auto-publishing, creator marketplace features, or persistent storage. It can reuse the existing seed Flow architecture and public Flow routes.

## Source Rules

Use real public sources from official websites, creator sites, YouTube channels, articles, or platform pages. Prefer official sources for procedural, legal, administrative, health, safety, or financial details.

Each converted Flow must:

- Preserve source attribution with title and URL.
- Separate official information from creator or user experience.
- Avoid copying source text as the Flow body.
- Convert source material into execution structure: steps, dates, phases, repetitions, checks, completion criteria, and cautions.
- Include risk metadata where the category is sensitive.

## Flow Conversion Model

Use the existing structure types:

- `timeline`: deadline or event-date driven content, such as exam day, inspection day, renewal deadline.
- `routine`: repeated execution, such as appliance care, exercise, diet tracking.
- `phase`: staged learning or adaptation, such as beginner training or study progression.
- `checklist`: unordered or sequence-light tasks, such as document preparation or one-time checks.

Each pilot Flow should include:

- A clear title and category.
- Source title and source URL.
- Structure type and anchor type.
- Items with executable wording.
- Item-level details where useful: why, how, completion criteria, caution, and links.
- Risk level and warning for health, safety, legal, administrative, or financial-sensitive content.

## Creator Portfolio Model

The pilot should keep creator grouping visible even before full creator operations are built.

Initial creator portfolio examples:

- Samsung Electronics Service: appliance maintenance Flows.
- Automotive official/creator group: inspection, license renewal, purchase, delivery, maintenance.
- Exercise routine creator group: home workout, beginner running, bodyweight routines.
- Certification study group: application prep, D-day study plans, exam-day checks.
- Diet routine group: meal planning, exercise tracking, short reset routines.

This model should support the later C path: a creator can manage multiple related Flows as a portfolio, not as isolated posts.

## Validation Criteria

A converted Flow is pilot-ready when:

- A user can understand the first action within 10 seconds.
- The Flow has checkable items with concrete completion criteria.
- A date, start date, phase, or repeat pattern is available when appropriate.
- At least two execution actions make sense: check, copy, Excel export, calendar export, or share text.
- Source and risk labels are present and not misleading.
- Official claims are not presented as creator experience, and creator experience is not presented as official guidance.

## Testing

Run the smallest sufficient test set after implementation:

- `npm test` for parser, seed, export, and content-lab integrity.
- `npm run build` for type and production route checks.
- `npm run test:e2e` after public Flow route or user-facing changes.

Add or update tests for:

- New seed Flows appearing in discovery.
- Risk/source metadata on sensitive or official Flows.
- Export behavior where new Flow types introduce dates, routines, or item details.
- Creator/lab grouping if the UI exposes the portfolio model.

## Open Risks

- Some creator content may be too video-specific to convert without over-interpreting the source.
- Diet and exercise content must avoid medical certainty and should include caution text.
- Official procedures can change, so source URLs and checked dates should be treated as maintenance data.
- A 10-Flow pilot may show category fit, but it will not prove market demand until users copy, export, check, or give feedback.

## Next Step

After this design is reviewed, write an implementation plan that sequences source selection, Flow data changes, UI/lab updates, tests, and QA as separate passes.
