# User-Reviewed Flow Content Criteria

Date: 2026-06-01

This document records the user's direct review of 12 representative Flow content samples and the resulting criteria for future Korean-first source selection and Flow conversion.

## Review Summary

| Sample | User Score | User Feedback | Resulting Rule |
| --- | ---: | --- | --- |
| Washing machine cleaning/care | 5 | Add `내 캘린더에 저장하기`. Let user set start date and repeat cycle. Put method, preparation, video link, and product link in memo. | Strong seed. Calendar repeat plus memo/link is enough. |
| Creator content engine | 1 | Not enough information for ordinary users to follow. Content type does not fit. | Reject creator/business meta content unless it has concrete, general-user execution rows. |
| Used car inspection | 4 | Checklist plus per-item cautions works. Photos/video links can help, but requiring detailed info and user photos may make the app heavy. Current Flow draft needs improvement. | Strong but simplify. Use checklist, item memo, source visuals; evidence is optional. |
| Online course launch | 1 | Paid content, source details likely unreadable, unclear why it was selected. | Reject paywalled/unreadable sources as representative samples. |
| Beginner plant care | 4 | Topic is good. Use watering-cycle routine and periodic leaf/soil observation. Add photo/video links. | Promising routine Flow when source has care cycles and visual examples. |
| Baby food reaction record | 2 | Original source is too complex. FlowMe is not mainly for this kind of memo. Better if it is an age-based daily baby-food menu calendar or Excel export. | Reframe complex sensitive records into schedule/table export if used at all. |
| 30-day writing challenge | 4 | Good topic. Calendar title can be `글쓰기`; memo should contain the day's prompt. Nothing else is needed. | Strong if source has day prompts. Keep extremely light. |
| Wedding 12-month preparation | 5 | Perfect as a calendar checklist. Apply the same simplification principles. | Very strong seed. D-day/calendar checklist. |
| 30-day beginner workout playlist | 4 | Calendar or routine with checklist is enough. Title can be `운동 - 30일 초보`; memo has method and video URL. No condition record or stop/adjust judgment for now. | Promising if it stays routine plus video link. Avoid extra tracking. |
| Blog start operation | 3 | Too much content; unclear whether it belongs now. | Narrow test only. Needs clear checklist or publishing calendar rows. |
| 100-day coding challenge | 2 | Only routine exists, no detailed checklist because the source lacks it. | Weak unless paired with actual curriculum/chapter/task source. |
| 30-day photo practice | 3 | Simple and okay, but score is lower if there are no related photo/example links for details. | Usable only if source provides actual prompts/examples. |

## Main Insight

The best Flow content is not the broadest or most impressive content. It is the content that already has an execution skeleton:

- dates
- D-day steps
- repeat cycles
- checklist rows
- day-by-day prompts
- table/menu/curriculum rows
- source links that help the user execute

If the source does not contain that skeleton, FlowMe should not invent it to make the UI look complete.

## Updated Content Selection Direction

Prioritize Korean sources in these categories:

1. Home appliance and household care
2. Moving, wedding, travel, administrative deadlines
3. Plant/pet care routines with simple cycles
4. Vehicle inspection and maintenance checklists
5. 30-day challenges with actual prompts
6. Study/exam sources with chapter, curriculum, or past-exam rows
7. Meal/menu sources that naturally become calendar or sheet rows

Deprioritize:

1. Paid courses or unreadable sources
2. Creator/business strategy content for non-general users
3. Broad tips articles without checklist/date/repeat structure
4. Routine-only challenges without source-specific rows
5. Complex health/childcare record trackers unless converted to a simple calendar/sheet artifact

## Flow Creation Rule

For most near-term Flows, the generated content should fit this simple structure:

```text
Title: short action title
Primary CTA: 내 캘린더에 저장하기 / 체크리스트로 저장하기 / 엑셀로 받기
Inputs: start date or target date, repeat cycle, target item
Calendar/checklist: source-derived action rows only
Memo: method, preparation, source URL, video URL, product/reference link, caution note
Optional: done/hold state
Avoid by default: photo evidence, detailed logs, complex condition records, excessive fields
```

## Near-Term Validation Set

Use these as the next Korean-first source search targets:

- 세탁기 청소 주기와 방법
- 에어컨 필터 청소/계절 관리
- 결혼 준비 체크리스트 12개월
- 이사 준비 체크리스트
- 초보 식물 물주기/분갈이/잎 관찰
- 중고차 구매 체크리스트
- 장거리 운전 전 차량 점검
- 30일 글쓰기 챌린지 프롬프트
- 30일 홈트/초보 운동 영상 플레이리스트
- 연령별 이유식 식단표
- 자격증 시험 챕터/기출 진도표

For each candidate, judge source fit before generating a Flow:

1. Can the source become a calendar/checklist/sheet/memo artifact?
2. Can the Flow run with 2-3 user inputs?
3. Are the rows source-derived rather than invented?
4. Can method/prep/video/product links live in memo rather than new fields?
5. Does the Flow remain useful if user photos/evidence are removed?
