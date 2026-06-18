# Flow Content Conversion Rules v2

Date: 2026-06-03

This rule set reflects the user review in `my_tests/260603_contents_check.md` and should be used before adding more Korean source candidates.

## Core Direction

FlowMe should not turn every useful article into a heavy app object. A good Flow content source already shows what the user can follow: dates, repeats, days, rounds, checklists, preparation items, submission, booking, or a clear decision point.

The default Flow object should stay close to calendar, reminder, and simple checklist app complexity.

## Source Selection

Prefer:

- Naver Blog, YouTube, creator blogs, or official/brand pages where a real author, channel, comments, likes, downloads, or follow-up posts are visible.
- Original content with obvious execution units such as day 1/day 2, D-30/D-7, 30-day challenge, round 1/round 2, preparation checklist, or booking/submission steps.
- Content where FlowMe can preserve the source link and make the execution lighter, not invent the plan.

Downgrade or hold:

- AI-like generic blogs with no author voice, no images, no comments, no user interaction, or too many broad explanations.
- Pages where the Flow-relevant part is a small fragment buried in a large article.
- Sources with ambiguous cycles like `3~6 months` unless the UI can choose a clear default and let the user edit it.
- Sensitive content that may look like medical, legal, financial, or safety advice unless official/source boundaries are explicit.

## Creator/User Interaction Gate

When searching for new Flow candidates, creator/user-interaction sources should be checked before generic information pages.

Prioritize sources where at least one strong interaction signal is visible:

- 댓글, 공감, 좋아요, 조회수, 구독자, 후속 질문, 오류 제보, 자료 요청, 다운로드 파일, 후속 글, 카페/오픈채팅/커뮤니티 운영 흔적
- YouTube videos where the user is clearly expected to follow along, repeat, submit, compare, or ask questions
- Naver Blog posts where readers ask for files, passwords, corrections, 후기, 준비물, 일정, or next-step help
- Creator series where multiple posts/videos form a curriculum, challenge, checklist, or preparation timeline

Score the interaction signal separately from source accuracy:

| Score | Interaction signal |
|---|---|
| 5 | 댓글/조회/자료 요청/후속 글이 strong, and the source has clear execution units. |
| 4 | Creator voice and user reaction are visible, with usable checklist/date/repeat structure. |
| 3 | Creator/authorship is visible, but user reaction is weak or execution units need trimming. |
| 2 | Generic article with little user response; use only as fallback or official boundary support. |
| 1 | No visible author/user reaction and no clear execution unit; do not use for representative Flow. |

Promotion rule:

- Representative candidates should normally have interaction score >= 4 or an official/brand source that supplies a uniquely reliable schedule/checklist.
- If a generic page and an interactive creator source cover the same topic, use the creator source for the Flow shape and the official/brand page only as source-boundary support.
- Do not infer interaction from platform alone. `네이버 블로그` or `유튜브` is not enough unless the content shows comments, views, downloads, follow-ups, or repeated user participation.

## Conversion Patterns

### Repeating Maintenance

Use one calendar/routine item for the repeated action. Put substeps inside the item.

Example:

- Calendar title: `에어컨 필터 청소`
- Repeat: `2주마다`
- Internal checklist: `필터 물세척`, `교체 필요 여부 확인`, `송풍 건조`
- Memo: original URL, video URL, model note, caution

Do not create three separate calendar items unless the original source needs separate dates.

### External Calendar Export

When exporting to Apple Calendar, Samsung Calendar, Google Calendar, or another calendar:

- The calendar event title should stay short.
- Internal checklist items should move into the event description/memo.
- Original URL and video URL should be included in the description.
- Completion state stays in FlowMe unless the target tool supports checklist state.

### Timeline Content

For wedding, moving, travel, exam, admission, vaccination, inspection, or administrative flows:

- Ask for the anchor date first.
- Generate dated items from source-defined offsets.
- Keep D-day labels out of the month grid title when possible.
- Put D-day, source rationale, official links, and notes inside the detail panel.

### Decision Content

For used car, self-repair, apartment inspection, or purchase/booking flows:

- Do not make `완료` the only outcome.
- Support `구매`, `보류`, `거절`, `업체 예약`, `공식 확인 필요`, or similar decision states.
- Photo/evidence fields are optional, not default.

### Study/Challenge Content

For exams, YouTube study series, or 30-day challenges:

- Use a progress table when the source has rounds, days, chapters, videos, or assignments.
- Use calendar events for today’s study block only.
- Keep material/source links in the item memo.
- Completion means a round/day/chapter has status, not that the user is guaranteed to pass or improve.

## Representative P0 Candidates

Updated 2026-06-07 after evaluating the current runtime candidates plus 8 creator/user-interaction candidates. Use these first when testing the UX with real Flow content:

1. `computer-skills-source-rounds`
2. `computer-skills-practical-5day`
3. `new-apartment-precheck`
4. `washer-tub-clean-monthly`
5. `lg-aircon-filter-biweekly`
6. `wedding-12-month-timeline`
7. `moving-d30-checklist`
8. `used-car-buying-check`
9. `japan-esim-setup-before-departure`
10. `dog-adoption-first-week`

Selection note:

- `computer-license-2nd-written` and `computer-skills-written-3day` should be merged into the broader computer-skills study cluster instead of occupying separate P0 slots.
- `travel-d7-checklist` remains useful, but the eSIM creator 후기 is more concrete for testing source-to-calendar conversion.
- `picture-book-reading-routine` remains P1 because the UI idea is good but the current source has weaker creator/user-interaction signal.
- `kids-dino-footprint-art` and `banana-peanut-recipe-video` are P1 diversity candidates. They should be used to test whether the same lightweight calendar/checklist/memo UX can handle kids play and creator recipe execution without turning into education records or diet tracking.

## 2026-06-04 Content Supply Conclusion

The current evidence supports this product hypothesis: Flow-able content is abundant, but the useful subset is narrower than "helpful information." FlowMe should prioritize content that already contains an execution shape, not content that merely explains a topic.

Strong supply clusters found so far:

- Study/certification content: rounds, chapters, past exams, videos, assignments, and exam dates are naturally portable to calendar plus progress table.
- Living-event content: moving, wedding, travel, apartment inspection, and administrative preparation already use D-day timelines and checklists.
- Home/appliance maintenance: washer, air conditioner, purifier, vehicle, and plant care work when the source has a clear repeat cycle and simple substeps.
- Creator resource posts: Naver Blog and YouTube posts with comments, downloads, password requests, corrections, and follow-up posts show real user demand and are better Flow candidates than generic blog summaries.

Containment rule:

- Put short actions, dates, repeats, and status in the primary Flow UI.
- Put source URL, method, preparation items, video links, purchase links, cautions, and creator notes in memo/detail.
- Keep evidence/photo fields optional. They should appear only when the Flow's real outcome requires comparison, submission, repair request, or before/after state.
- Use P0 candidates to test UX12 first. P1 candidates are useful for later breadth testing, but should not drive core UI complexity yet.

## UX Implications

- The source page should have a clear `내 Flow로 저장` or `내 캘린더에 저장` action.
- Save inputs should normally be 1-3 fields.
- Details should look closer to calendar event details than a long instructional article.
- Frequently used fields: title, date/repeat, checklist, memo, URL.
- Less frequent fields should stay behind more/advanced sections.
- `방법`, `준비물`, `주의`, `영상 링크`, and source notes usually belong in memo/detail, not the month grid.

## Next Source Search Rule

When adding new candidates, first search for creator/user-interaction versions of the same topic. Use generic informational pages only as fallback or official/source boundary support.
