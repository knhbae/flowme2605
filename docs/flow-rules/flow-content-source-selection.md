# Flow Content Source Selection Rules

Created: 2026-06-01

These rules capture the current working criteria for choosing original content that should become a FlowMe Flow. They are based on user review of 12 representative samples.

## Core Direction

FlowMe should not turn an article into a heavy internal app. It should extract the smallest useful execution layer from the original content:

- calendar dates
- repeat rules
- checklist rows
- simple memo
- source/video/product links
- optional export to calendar, sheet, or memo

The default action should feel close to a calendar, reminder, or checklist app. If a Flow requires more input than those apps, it is probably too heavy.

## Korean-First Source Rule

Prefer Korean original content for validation and seed Flow creation.

- Korean users can judge source quality, nuance, and usefulness faster.
- Korean calendar/checklist language exposes real UX copy problems earlier.
- English sources may be used only when the structure is unusually clear or no Korean equivalent is available.

## Representative Diversity Rule

Do not fill a review batch only with another set of high-fit household maintenance, moving, wedding, or used-car examples. A candidate can score well and still be unhelpful for platform learning if it repeats the same user moment and artifact shape.

For each representative review batch, include candidates across distinct user moments:

- travel setup or departure preparation
- creator video or recipe execution
- kids play, reading, or family activity
- household maintenance or care routine
- buying/inspection decision
- study, challenge, or curriculum progress
- official/admin checklist or deadline

The point is not category breadth for its own sake. The point is to test whether FlowMe's lightweight calendar/checklist/sheet/memo model still works when the source shape changes.

## Product/Business Connection Gate

Category diversity is a learning tool, not the goal. Do not keep a candidate only because it fills a category slot.

Before promoting a source into a representative Flow, answer:

- What business/product hypothesis does this candidate test?
- Would a real user save it after reading or watching the source, not merely find the topic interesting?
- Does the candidate show a serving path that FlowMe could plausibly use later, such as public search traffic, creator content, official/admin guidance, export utility, repeat use, or a creator/affiliate/source-link loop?
- Does the resulting artifact clearly become calendar, checklist, sheet, memo, or a very small hybrid without inventing a heavier app?
- Is the source strong enough that FlowMe can preserve its concrete execution cues instead of filling gaps with generic AI text?

If the answer is weak, replace the source or category. Mark it `backup` or `reject-for-representative` rather than forcing it into the current UI shell.

Examples:

- Keep or promote a moving checklist when it proves a date-based life transition Flow with clear search/use intent.
- Keep or promote a used-car visit checklist when it proves a field checklist with source-derived hold criteria.
- Reconsider a kids craft, plant, or home workout sample if the selected source only proves a generic saved link or reminder and does not show a stronger FlowMe serving/use case.
- Reject or park a source that mostly requires user inventory, private records, or app-specific management that is larger than the original content.

## Representative Coverage Axes

Use these axes when planning a source search, reviewing `/content-flows`, or deciding which candidates deserve a content-specific UI preview. A review set does not need every axis every time, but a representative batch should make it clear which axes are covered and which remain missing.

| Axis | Artifact Shape | Validation Question | Current Example Candidates |
|---|---|---|---|
| 반복 관리 | routine/calendar | Can a user save repeated care for an owned object without turning FLOW into a heavy log app? | `washer-tub-clean-monthly`, `monstera-care-routine`, `water-purifier-filter-cycle` |
| 생활 전환 | D-day timeline | Can a date-based life transition be split into short calendar items and checks? | `wedding-12-month-timeline`, `college-dorm-move-in-checklist`, `elementary-school-entry-d30` |
| 제작자 자료 | source link + checklist | Can FLOW preserve creator PDFs, videos, templates, or prompt cards without copying the source? | `kids-printable-squishy-craft`, `picture-book-reading-routine`, `banana-peanut-recipe-video` |
| 디지털 절차 | ordered checklist | Can a setup/activation procedure be followed without storing sensitive auth values? | `anydesk-remote-setup-check`, `alt-phone-sk7-self-activation`, `japan-esim-setup-before-departure` |
| 짧은 프로젝트 | D-3/D-1/day-of checklist | Can a weekend or one-off project show preparation, execution, and cleanup in one lightweight flow? | `self-wall-paint-weekend`, `kids-dino-footprint-art`, `banana-peanut-recipe-video` |
| 시트/재고 | small table | Can row-based objects show next dates/status without becoming a spreadsheet product? | `fridge-cleanout-weekly-plan`, `balcony-fall-vegetable-calendar`, `water-purifier-filter-cycle` |
| 서류/행정 | deadline checklist | Can FLOW handle document preparation and deadlines while leaving legal/tax/medical decisions to official or expert sources? | `freelancer-income-tax-docs`, `lease-contract-report-deadline`, `infant-health-checkup-prep` |

Use the coverage axes as a product-learning map, not as taxonomy decoration:

- If a new source only repeats an already covered axis and artifact shape, mark it `backup` unless it has much stronger source evidence.
- If a candidate opens a missing axis but has weaker source evidence, keep it as `P1 breadth candidate` and write the exact evidence needed before promotion.
- At least one candidate per active axis should have a content-specific preview in `/content-flows` or the static HTML review file before the axis is treated as reviewed.
- The visible UI must answer the axis question directly. For example, `서류/행정` must show official/expert boundary, not only a generic checklist.

### Anti-Repetition Batch Quota

Use this quota before starting a new 20-30 candidate source search. It prevents the review set from drifting back into the same strong but overused household/wedding/used-car examples.

Minimum slots per batch:

- 4 creator/user-interaction sources: Naver Blog, YouTube, cafe, or creator page with visible comments, views, downloads, source files, follow-up posts, or repeated reader questions.
- 4 life-event or official/admin sources: deadline, booking, submission, reissue, inspection, declaration, or appointment flows.
- 4 everyday hobby/family sources: kids play, recipe, home baking, plant/garden, pet, reading, craft, photo, writing, or weekend activity.
- 4 learning/progress sources: exam, curriculum, book list, chapter plan, challenge, or practice rounds.
- 4 maintenance/care sources: appliance, vehicle, plant, pet care, housing, or seasonal upkeep.

Maximum slots per batch:

- No more than 3 candidates from the same narrow topic cluster, even if they all score high. Examples: washer/aircon/purifier, wedding/moving, used-car/vehicle inspection, computer-skills exam.
- No more than 2 candidates with the same artifact shape and same user moment. Example: two monthly appliance cleaning routines are enough for one batch.
- If a new candidate only proves a pattern already proven by a stronger candidate, mark it as `backup`, not `representative`.

Promotion tie-breaker:

- When two candidates have similar fit scores, promote the one that expands user moment coverage, source format coverage, or artifact coverage.
- Do not promote a lower-diversity candidate just because the execution conversion is easier.
- If a source is weaker but represents an important new user moment, keep it as `P1 breadth candidate` and write the missing source evidence needed before promotion.

## Strong Source Candidates

Prioritize original content with one or more of these structures.

### 1. Calendar or D-Day Checklist

Use when the source already has dates, deadlines, phases, D-day steps, or preparation windows.

Good examples:

- wedding 12-month checklist
- moving checklist
- exam preparation schedule
- home appliance seasonal maintenance
- license renewal or administrative deadline

Flow shape:

- primary action: `내 캘린더에 저장하기`
- user inputs: start date or target date, optional repeat rule
- calendar title: short action title
- memo: method, preparation, source links, caution notes

### 2. Simple Repeating Maintenance or Care Routine

Use when the source says what to do repeatedly and how often.

Good examples:

- washing machine cleaning
- air-conditioner filter cleaning
- plant watering and leaf/soil observation
- water purifier or appliance care
- beginner exercise routine

Flow shape:

- primary action: `반복 일정으로 저장하기`
- user inputs: start date, repeat cycle, target item
- routine item: one visible action per occurrence
- memo: method, preparation, video link, product link

Do not add condition logs, photos, or evidence fields by default.

### 3. Source-Specific Checklist

Use when the source gives concrete checklist items and each item has a clear inspection/action target.

Good examples:

- used car inspection
- travel packing or pre-trip checklist
- vehicle long-distance driving check
- home safety inspection

Flow shape:

- primary action: `체크리스트로 저장하기`
- checklist items: source-derived rows only
- memo per item: warning, example photo/video link, source explanation
- optional decision state: buy, hold, reject, done

Photos and videos should be source/help links first. User-uploaded evidence is optional, not a default requirement.

### 4. Prompt or Challenge Calendar

Use when the source contains day-by-day prompts, assignments, or practice topics.

Good examples:

- 30-day writing challenge with prompts
- 30-day photo challenge with source prompts
- study challenge with actual chapter/task rows

Flow shape:

- calendar title: short recurring title such as `글쓰기`, `사진 연습`
- memo: today's prompt or assignment
- source link: original prompt page
- completion: done/not done

Do not invent detailed checklist rows if the source only provides a daily prompt.

### 5. Table, Menu, Curriculum, or Plan Rows

Use when the source has rows that naturally become sheet/calendar entries.

Good examples:

- baby food daily menu table
- exam curriculum table
- weekly meal plan
- plant care season table

Flow shape:

- primary action: `엑셀/캘린더로 받기`
- rows: source-derived table rows
- memo: preparation or source note
- minimal user inputs: start date, target age/week/chapter

If the source is medically sensitive or too complex, keep the Flow as a schedule/table export rather than a record-heavy tracker.

## Weak or Reject Candidates

Reject or deprioritize these, even if the topic sounds useful.

### 1. Creator or Business Meta Content Without General User Execution

Examples:

- creator content engine
- course launch business process
- broad blog operation strategy

Reason:

- often not for general users
- too much strategy text
- weak calendar/checklist transfer
- may require paid content or private expertise

### 2. Paywalled or Unreadable Sources

Do not create a representative Flow from content whose actual source details cannot be read.

Allowed:

- record as a search lead
- revisit after source access is available

Not allowed:

- infer a full Flow from title, marketing copy, or course sales page

### 3. Routine-Only Sources Without Detail

Example:

- 100-day coding challenge if the source only says "code every day and share progress"

Reason:

- repeat rule exists, but source-specific checklist is missing
- Flow becomes a generic habit reminder

Only use if another Korean source provides curriculum, chapter rows, or daily task prompts.

### 4. Complex Record-Keeping as the Main Job

Example:

- baby food reaction records when the source is broad and medically complex

Reason:

- FlowMe is not primarily a health record app
- too many fields overload the user

Better angle:

- age-based daily menu calendar
- weekly meal table export
- source/caution memo kept separate

### 5. Long Information Articles Without Clear Next Actions

Reason:

- users cannot tell what to save, check, or repeat
- conversion becomes summary writing, not execution support

## Conversion Rules

### Keep Inputs Small

Default user inputs should be at most 2-3 fields:

- start date or target date
- repeat cycle
- target item/category

Avoid requiring:

- detailed personal records
- photos
- long status logs
- multiple decision fields
- condition tracking

### Use Memo for Supporting Detail

Move supporting information into memo:

- method
- preparation
- source URL
- video URL
- product/purchase link
- caution note

Do not expose all of these as top-level UI fields.

### Calendar Titles Stay Short

Calendar titles should be action-first and short:

- `세탁기 청소`
- `식물 물주기`
- `글쓰기`
- `30일 초보 운동`
- `결혼 준비 체크`

Avoid:

- long source titles
- D-day explanations inside title
- why/how/completion labels

### Evidence Is Not Default

Do not ask users to save photos, proof, or detailed evidence unless the Flow truly depends on it.

Good optional use:

- used car condition photo reference
- contract or submission confirmation
- before/after appliance issue note

Bad default use:

- every checklist item asks for a photo
- exercise asks for condition records
- cleaning asks for evidence

### Source Links Matter

For many Flows, source links are more useful than internal explanation.

Use memo/link fields for:

- method video
- product/preparation link
- official guide
- creator's visual example

## Scoring Heuristic

Use this quick score before building a Flow.

| Dimension | Weight | Question |
| --- | ---: | --- |
| Source/creator context and user reaction | 30 | Does the source have visible creator continuity, official support context, comments, views, shares, community reaction, or other evidence that people actually use it? |
| User desire | 20 | Would an ordinary user want to save this after reading or watching it? |
| Execution structure | 20 | Does the source contain real dates, repeat rules, checklist rows, prompts, comparison criteria, or table rows? |
| Natural artifact fit | 15 | Does it clearly become calendar, checklist, sheet, or memo? |
| Input simplicity | 10 | Can the Flow run with calendar/reminder-level inputs such as start date, due date, repeat cycle, target item, or a short memo? |
| Reuse value | 5 | Is it likely to be reused, repeated, or revisited after the first save? |

Interpretation:

- 4.5-5.0: seed candidate
- 3.8-4.4: usable after simplification
- 3.0-3.7: narrow test only
- below 3.0: reject or find a better source

Do not score "sensitive or risky" as a separate selection dimension. FlowMe should still keep source links and source boundaries visible, but the initial representative-source ranking prioritizes whether the source is real, followed, actionable, and portable.

## Applying User Review Feedback

The reviewed samples imply these current decisions:

- Washing machine care: strong. Use calendar repeat plus memo for method/prep/video/product links.
- Used car inspection: strong but simplify. Checklist and cautions are enough; avoid mandatory photo/evidence capture.
- Plant care: promising. Use watering routine plus periodic leaf/soil observation and visual links.
- Baby food: only promising if converted to age-based menu calendar/sheet, not a complex reaction-record Flow.
- Writing challenge: promising if each day has a prompt in memo; no extra fields.
- Wedding preparation: very strong calendar/checklist content.
- Workout playlist: promising if it stays calendar/routine plus video URL; skip condition records for now.
- Coding challenge: weak unless the source includes actual curriculum/checklist rows.
- Paid course/business content: reject unless source details are readable and general-user execution is clear.

## 2026-06-02 Feedback Addendum

The review of `2026-06-01-korean-flow-content-30-review.html` added stricter source and UX rules:

- Prefer sources with visible human demand or interaction signals: creator continuity, comments, views, shared templates, downloadable checklists, or repeated search demand. A topic that sounds useful is not enough.
- Distinguish personal-user Flows from teacher/operator reference Flows. Kindergarten yearly/monthly plans can be useful, but they are not automatically good personal-user Flows.
- For children reading/play content, the better model is often `routine + rotating content card`: keep "weekend play" or "reading time" as the recurring Flow, then map a source-derived play/book checklist into that routine.
- Do not make "write a memo" the default completion criterion. Completion should usually be the real action: cleaned, read, played, booked, checked, bought/held/rejected, or saved to calendar.
- Manuals and support articles are weaker if they only answer a one-off issue. They become strong when they contain a clear repeat interval, replacement cycle, setup checklist, or QR/product onboarding moment.
- For plant, appliance, pet, and vehicle care, the Flow should often be tied to a user-owned object profile: plant name, appliance model, vehicle, pet. The profile changes repeat cycle and checklist rows.
- Source-derived Flow examples must be concrete enough to judge. Each candidate should show actual calendar/routine/checklist items, not only a conversion explanation.
- Sensitive areas such as baby food, pet health, finance, vehicle safety, and administration should stay schedule/checklist oriented and keep official/professional judgment separate.

## 2026-06-07 Weighted Source Addendum

The current representative-source review gives the strongest weight to source/creator context and user reaction.

- A topic that sounds useful is not enough; prefer Korean sources with visible creator context, official support data, comments, views, shares, or repeated community/blog/video usage.
- If a source lacks visible reaction data, it can remain a candidate, but should usually be `보류` until a stronger creator/blog/video source is attached.
- Risk or sensitivity is not a primary selection score. The conversion must still show the original source and avoid presenting FlowMe output as official advice.
- The first generated artifact should stay at calendar, checklist, sheet, or memo level. Timeline, routine, decision, evidence, and caution are internal patterns or memo details, not separate heavy input forms.
- The 2026-06-07 review artifact is `docs/content-audit/2026-06-07-weighted-korean-source-flow-review.html`, backed by `docs/content-audit/original-source-review/2026-06-07-weighted-korean-source-flow-candidates.json`.
