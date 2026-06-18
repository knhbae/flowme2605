# Source-To-Flow Conversion Gate

Date: 2026-06-17

This gate exists because a clickable Flow can still be a bad Flow. The 2026-06-16 ten-sample PoC rendered and clicked correctly, but user review showed a deeper product failure: multiple sources were blended, generic UI rules created fake checklists, and top-level inputs were added because the prototype shell supported them.

Use this gate before creating another representative source-to-Flow UI or seed.

## Professional Judgment

FLOW should not behave like an AI summary that invents a mini app around a topic. FLOW should behave like a lightweight transfer layer:

```text
one original source -> one user job -> one natural artifact -> minimal execution UI
```

The natural artifact should usually feel like one of these familiar tools:

- calendar event or timeline
- reminder/todo item
- checklist
- bucket list item
- memo/Notion note
- small sheet/table

If the result needs a custom multi-panel app to make sense, either the source is too broad or the conversion is wrong.

## Non-Negotiable Principles

### 1. One Primary Source Per Flow

A representative Flow must have one primary original source:

- one creator video
- one blog post
- one official page
- one downloadable guide
- one checklist article
- one source-defined table or plan

Supporting sources are allowed only for official boundary, safety, or utility links. They must not change the Flow structure.

Bad:

- Combine a creator blog, official guide, and unrelated YouTube video into one polished "complete guide."

Good:

- Use one creator's moving checklist as the Flow spine.
- Put an official or vendor link in the memo only when it helps execution.

### 2. Source Shape Before UI Shape

Do not choose the UI shell first. Read the source and identify the shape:

- one date
- D-day offsets
- source checklist rows
- source table rows
- repeat interval
- one follow-along video
- bucket/reference item
- procedure steps

The Flow structure must come from that shape. If the source has one checklist, do not split it into artificial sections just because the component supports tabs or cards.

### 3. Destination Before Components

Choose the destination before choosing UI components.

| Source/User Job | Natural Destination | UI Default |
|---|---|---|
| D-day preparation source | calendar / timeline | anchor date + dated items |
| visit/inspection source | checklist or one dated todo | one item with source checklist rows |
| official schedule table | calendar/table | prefilled source dates or age/phase rows |
| one follow-along video | repeated calendar item | video URL inside each execution item |
| printable/craft resource | bucket item + optional play date | saved resource, optional date, short prep checklist |
| maintenance with source-defined interval | repeated calendar item | fixed cadence from source, editable only as advanced |
| admin checklist | todo/checklist, sometimes deadline | one checklist item or short deadline sequence |
| setup/support procedure | ordered checklist | only if the user would actually reuse or hand off it |

### 4. No Fixed Checklist Count

Never force 3 tasks, 4 sections, or equal-sized cards. Action count is source-derived.

Allowed shapes:

- one dated item with 12 checklist rows
- one bucket item with 4 prep rows
- one video routine item with the source URL and stop condition
- five D-day items if the source has five real date offsets
- a table if the source already has rows

Hard fail:

- Every section gets exactly 3 checklist items even when the source did not.

### 5. Top-Level Inputs Must Be Earned

Top-level inputs are only for values required to generate the artifact.

Usually allowed:

- target date / start date / event date
- repeat start date
- source-required age/phase/round
- owned object only when the source changes by object, such as appliance model or plant name

Usually not top-level:

- source URL
- school guide URL
- product link
- vendor name
- memo
- method choice
- listing URL
- optional detail

These belong in item detail, memo, description, URL, or imported source metadata unless the user explicitly needs them to generate the Flow.

### 6. Preserve Familiar UX Patterns

The UI should look close to tools users already understand:

- calendar detail
- reminder detail
- checklist/todo detail
- bucket item detail
- memo detail
- small spreadsheet

Do not make a custom app surface unless the source genuinely requires it. If the screen starts to look like a survey, admin console, evidence tracker, or developer review tool, simplify.

### 7. Source Fidelity Beats Apparent Completeness

Do not fill gaps with AI generalities.

If the source does not contain a step, condition, repeat rule, item, or instruction:

1. leave it out,
2. move it to optional memo as a user note,
3. find a better source,
4. or park the candidate.

A sparse source-derived Flow is better than a complete-looking invented Flow.

### 8. Details Move Downstream

Primary screen:

- title
- date/repeat when needed
- source-derived action/check rows
- completion/hold state

Detail/memo/URL:

- original URL
- video URL
- method
- preparation
- caution
- creator note
- official boundary
- optional personal memo

Do not turn supporting detail into extra required setup fields.

### 9. Sensitive Sources Need Stronger Boundaries

For health, baby/family, legal, finance, vehicle safety, or remote-access/security content:

- use official facts only as official facts,
- keep creator experience separate,
- avoid outcome guarantees,
- include stop/consult/official-confirmation conditions,
- do not create a record-management app unless the source itself is a record template.

### 10. Batch Expansion Does Not Override Quality

Representative batches should cover multiple artifact types, but category coverage is not a license to keep weak candidates.

For each candidate:

- Keep if one source naturally becomes a calendar/checklist/sheet/memo/bucket item.
- Revise if the source is good but the destination or inputs are wrong.
- Replace if the topic is useful but the selected source is weak.
- Park if the source only proves a saved link, generic reminder, or app-specific workflow larger than FLOW.

## Pre-Build Gate

Do not build the UI until these questions have concrete answers:

```text
Primary source:
Source shape:
User job:
Natural artifact:
Top-level inputs:
Generated item title:
Generated date/repeat/deadline:
Source-derived rows:
Memo/detail/URL contents:
Completion or hold signal:
Do-not-build boundary:
```

If any answer requires guessing from general knowledge, the candidate is not ready.

## Hard Fails

Reject or redo the conversion when any of these are true:

- More than one source controls the Flow structure.
- Checklist rows are invented to fill a UI pattern.
- Every section has the same number of tasks without source evidence.
- User must enter details that should come from the source or memo.
- A one-off checklist is stretched into a multi-day timeline.
- A field checklist is split into artificial "view order" cards when one checklist would work.
- A repeat interval is presented as user choice when the source defines it.
- A health/safety/legal/security Flow implies judgment or interpretation by FLOW.
- The screen is understandable only with review notes or developer explanation.

## Applying The Gate To The 2026-06-16 Ten-Sample Feedback

| Flow | Judgment | Required Change |
|---|---|---|
| Moving D-30 | Keep | Remove unnecessary method setup unless the primary source branches by method. Keep one source spine. |
| Used car visit | Revise | Use one visit item with the source checklist rows. Do not force "볼 순서" sections with 3 tasks each. |
| Elementary entry | Keep/Revise | Keep timeline, but remove unnecessary guide URL input. Use one school/parent source spine and source-derived rows. |
| Infant health checkup | Revise deeply | Use official schedule/table logic. Consider prefilled future checkups instead of asking users to register each visit manually. |
| Passport/departure | Revise | Treat as one checklist/todo with optional deadline, not a large timeline unless the source provides real stages. |
| Home workout video | Revise | One video is one executable routine item. Put the video URL inside the item. Do not invent movement/check rows. |
| Squishy craft | Revise | Treat as bucket/resource item with optional play date. Do not require a date or URL field before saving. |
| Stuckyi watering | Revise | Use source-defined cadence as the default. Do not show arbitrary repeat options unless advanced editing is opened. |
| Remote support | Park | Weak representative candidate unless a specific source proves a reusable setup/handoff job. |
| Dorm move-in | Keep/Revise | Use one source checklist. Do not force a school guide URL input; keep source link and school-specific note in detail. |

## Figma/UI Pattern Decision

Figma can help after the content model passes this gate. It should not be used to make an incorrect conversion look more polished.

Use Figma for:

- reusable calendar/detail/checklist/bucket primitives,
- layout density comparison,
- interaction states for mobile,
- pattern library alignment.

Do not use Figma to decide:

- source shape,
- checklist count,
- destination,
- source fidelity,
- whether a candidate should be kept.

The sequence should be:

```text
source gate -> artifact model -> low-fidelity clickable HTML -> UX review -> Figma pattern refinement -> implementation
```

