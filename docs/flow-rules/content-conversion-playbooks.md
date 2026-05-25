# Content Conversion Playbooks

Playbooks are defaults, not laws. Use them to start quickly, then override when the original content or user need requires another structure.

## Pattern Selection

Before writing items, decide:

1. What is the original content shape?
2. What user need does it serve?
3. Where should the user manage it?
4. How much structure is necessary?
5. What source/risk separation is required?

## Single Fitness Video

Default:

- `structure_type`: `routine`
- `primary_destination`: `calendar`
- Action count: 1
- Export: ICS + lightweight sheet + memo copy

Good when:

- One follow-along workout video
- User only needs to schedule and execute
- The video itself contains the detailed instruction

Default action shape:

```text
Title: [운동 스케줄 등록하고 영상 실행]
How: 준비: 이번 주 할 요일/시간을 정한다. 실행: 영상을 열어 오늘 가능한 강도로 따라간다. 마무리: 실행 여부와 다음 반복 여부만 체크한다.
Completion: 캘린더 일정이 있고, 오늘 실행 여부를 체크했다.
```

Execution specificity requirement:

- Keep one follow-along video as one action, but the detail panel must separate summary, detailed execution guide, original video link, post-workout record, and stop condition.
- The detail guide may describe how to prepare, open the source, follow the source, and record condition. It must not invent a movement sequence unless the sequence was extracted from the source.
- Add post-session fields or copy cues for completion, intensity, pain/dizziness, and next-session adjustment.
- Add a stop/consult condition for pain, dizziness, breathing difficulty, or known condition worsening.
- For repeated calendar use, each exported event description must stand alone. Do not put the preparation, execution, source link, record cue, or stop condition only in page-level copy.

Override:

- Use 3-5 actions if the original video is a multi-part program, assessment, rehab sequence, or challenge where separate completion matters.
- Use `checklist` if it is a one-time form check, equipment setup, or safety assessment rather than repeated exercise.

### Repeated Single-Video Calendar Rule

Use this when the same workout, stretching, meditation, or practice video repeats across dates.

The UI may keep the Flow visually compact, but every calendar reminder/exported item must still be executable from the reminder itself:

- `캘린더 알림`: state that this text repeats with each scheduled event and should be enough to start without reopening FLOW.
- `준비`: include setup such as space, equipment, water, volume, or timer when source-derived or generic enough not to invent source content.
- `실행`: tell the user to open the original video and follow it once at a tolerable intensity; do not invent a movement sequence.
- `원본 영상`: keep the exact video link for posture, pace, and detailed demonstration.
- `운동 후 기록`: capture done/not done, intensity, pain or dizziness, and next-session adjustment.
- `중단 조건`: include pain, dizziness, breathing difficulty, known condition worsening, or other source/risk boundary.

### Multi-Video Sequence

Use this when the original content is a playlist, course, study channel sequence, tutorial series, or source-defined multi-step program.

Default:

- `structure_type`: `timeline`, `routine`, or `checklist`
- `primary_destination`: `sheet` or `hybrid`; use `calendar` only when due dates or repeated sessions matter
- Action count: one item per source video, lesson, stage, or source-defined decision point
- Export: progress sheet first, with calendar milestones only when useful

Each item should preserve:

- Source video or lesson title and link
- Watch/read target
- Note, practice, or apply task
- Completion criterion
- Next-session condition or dependency

Do not convert a multi-video study sequence into one vague "study" action. Do not convert one follow-along workout video into a multi-item sequence unless the source itself has separate sections with separate completion criteria.

## Diet / Body Composition Knowledge

Default:

- `structure_type`: `checklist` or light `routine`
- `primary_destination`: `memo` or `internal_check`
- Action count: 1-3

Good when:

- The content is a principle, tip, myth-busting video, or meal decision guide
- User should try one behavior, not replace their whole diet

Default action shape:

```text
Title: [다음 식사 한 끼에 적용할 기준 선택]
How: 준비: 영상에서 오늘 쓸 기준 하나만 고른다. 실행: 다음 식사 또는 운동 전후 행동 하나에 적용한다. 마무리: 과한 제한감, 통증, 어지러움, 폭식 유발감이 있으면 중단한다.
Completion: 오늘 한 끼 또는 운동 전후 행동 하나에 적용했고 유지/중단을 정했다.
```

Avoid:

- Weight-loss guarantees
- “운동 요일” when the user is applying a diet principle
- Whole-diet restructuring unless the original content is a structured plan

Override:

- Use `routine` with calendar when the original is a repeated habit program.
- Use `sheet` when measurement logs are central to the user need.

## Exam / Certification Prep

Default:

- `structure_type`: `timeline + routine`
- `primary_destination`: `hybrid`
- Export: calendar milestones + sheet study tracker

Include:

- Exam date
- Application/registration deadline
- Study blocks
- Past exam or source links
- Supplies and exam-day checklist

Avoid:

- “열심히 공부하기”
- Study tasks without dates, materials, or completion criteria

Override:

- Use `checklist` for administrative-only flows like application submission.

### Study Progress Table Eligibility

Use [study progress table rules](./study-progress-tables.md) before adding a study progress table.

Progress tables are allowed only when the source has rows the creator can bring into FLOW, such as a table of contents, curriculum, exam scope, past-exam rounds, weekly plan, lesson list, or assignment set.

Do not force a progress table for reviews, tips, advice, motivation posts, or single explainers without source sequence. Use checklist, memo, routine, comparison table, or score/wrong-answer log instead.

For eligible study content, the creator pre-fills rows from the source. The user edits only execution fields such as target date, status, memo, wrong-answer note, retry date, weak area, or score. `computer-skills-d30-study` is the current example.

## Home Appliance / Car Maintenance

Default:

- `structure_type`: `routine` or `timeline`
- `primary_destination`: `calendar`
- Action count: 2-5

Include:

- Inspection interval
- Required materials/tools
- Normal vs warning signs
- Service booking trigger
- Official manual/source link when available

Avoid:

- Advice that could damage equipment without safety caveats
- Turning every sub-step into a separate checklist item

Override:

- Use `memo` for troubleshooting reference content.
- Use `sheet` for fleet/multiple-car management.

## Moving / Administrative Timeline

Default:

- `structure_type`: `timeline`
- `primary_destination`: `hybrid`
- Export: calendar deadlines + sheet checklist

Include:

- Anchor date
- D-day offsets
- Dependencies
- Document links
- Vendor/contact placeholders when useful

Avoid:

- One huge checklist without dates
- Duplicate tasks across week/month views

## Baby / Family / Health Logistics

Default:

- `structure_type`: `phase`, `timeline`, or `checklist`
- `primary_destination`: `hybrid`
- Action count: as needed, but source/risk separation is mandatory

Include:

- Official source
- Parent/caregiver experience separated from official guidance
- What to prepare
- What to watch for
- When to contact a professional

Avoid:

- Medical certainty
- AI-generated prescriptions
- Mixing anecdotal tips into official instructions

## Creator Channel Collection

Default:

- Channel page groups many Flow candidates.
- Individual Flow pages stay focused on one user job.

Include on channel:

- Representative Flow
- Category tags
- Source precision
- Conversion maturity level
- Manageability cues for creators

Avoid on individual Flow:

- Channel-level explanation that does not help this one execution
- Generic creator praise

## Generic Conversion Checklist

For every new Flow:

1. Write the user need.
2. Pick primary destination.
3. Pick structure type.
4. Pick action count based on user decision points.
5. Write first action before writing any supporting explanation.
6. Add source and caution separately.
7. Score with the rubric.
8. Revise the lowest scoring dimension first.
