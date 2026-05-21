# Preview-First Flow Setup Design

## Problem

The public Flow detail page made users configure dates and rhythm before they could see what the Flow becomes. For exercise and diet content, that made the service feel abstract: users saw settings, but not the calendar, checklist, or memo they would actually use.

## Root Cause

- Flow titles and source metadata explain the content, but the setup UI did not immediately show the destination artifact.
- Exact video flows were simplified to one execution item, but the time placement moved into exports and was not visible enough on the page.
- Repetition was treated as a configuration step instead of a preview users can adjust.

## UX Principle

Show the generated destination first, then let the user adjust it.

The page should answer, in order:

1. What original content is this?
2. Where did FLOW place it: calendar, checklist, memo, or sheet?
3. When will it appear?
4. What can I lightly change?
5. How do I take it out to my tool?

## Initial Scope

Apply the pattern to exact fitness video flows first.

- Workout video: calendar preview, default rhythm `주 3회`, editable start date and weekdays.
- Diet principle video: daily checklist preview, default rhythm `매일`, editable start date and application weekdays.
- Workout-plan video: weekly sheet-style preview, default rhythm `주 3회`, editable start date and weekdays.

## UI Shape

The first post-header section is `내 도구에 들어간 모습`.

It contains:

- Destination-specific heading
- Recommended rhythm
- Preview surface
- Lightweight adjustment controls
- Export/copy actions

The old 1-2-3 setup cards are hidden for exact video flows because they force users to read instructions before seeing the result.

## Non-Goals

- Do not build a full calendar product.
- Do not expose RRULE or advanced recurrence editing.
- Do not require the original content to have exact dates.
- Do not turn one exact video into many independent checklist items.

## Test Expectations

- Workout exact video shows calendar-first preview.
- Diet exact video shows checklist-first preview.
- Old setup labels such as `1. 요일 정하기` are absent for exact videos.
- Copy-to-edit still preserves the execution item.
