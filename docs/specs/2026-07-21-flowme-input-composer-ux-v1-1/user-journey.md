# User Journey v1.1

## 1. Two journeys, one intake surface

The composer can accept the same URL or text, but creator and final-user responsibilities diverge after detection.

### Creator journey

```text
원문 입력
-> 형식/접근 범위 감지
-> 확보한 행과 누락 범위 확인
-> source scope 확정
-> Item proposal 검토/수정
-> 출처·권리·안전 검토
-> 개인용 draft 또는 공개 Flow 버전 저장
```

Creator writes:

- source snapshot metadata
- creator draft Item structure
- completion and source references
- projection eligibility
- rights/safety review state

Creator never writes a final user's moving date, current chapter, location, completion, or personal memo.

### Final-user journey

```text
기존 Flow 발견
-> 실제 artifact와 저장 단위 미리보기
-> 필요한 개인 값 0~2개
-> 포함/선택/진도 확인
-> 자기 도구로 복사/다운로드 또는 My Flow 저장
-> 완료/진도/현재 위치 기록
-> source update가 있으면 개인 변경을 유지한 채 비교
```

Final user writes:

- user overlay
- execution run
- export receipt

They do not edit source snapshot or published source references.

## 2. Common state flow

| Stage | User sees | Primary action | Stored layer |
|---|---|---|---|
| Empty | one composer + table auxiliary | `내용 붙여넣기` | none |
| Detecting | detected kind and progress | none/cancel | draft input only |
| Source found | source title, domain, scope count | `확보한 범위 확인` | source candidate |
| Existing Flow found | first artifact, Item count, source version | case-specific start | none until chosen |
| Proposal ready | proposed Items and eligibility | `항목 검토` | creator draft candidate |
| Personalize | only values needed for selected result | case-specific create/start | user overlay draft |
| Export/save | exact scope/count/format | concrete export or save | receipt / overlay / run |
| Return | My Flow location or retry/copy confirmation | `내 Flow 열기` | execution run |

## 3. Case journeys

### 3.1 Moving D-day

1. User pastes the official checklist URL.
2. Composer detects URL and finds an existing Flow built from 6 source rows and 24 Items.
3. Preview first shows relative groups: 2 weeks before, 1 week before, 2-4 days before, day before, moving day, after moving.
4. User enters `2026-08-28` only when resolved calendar dates are requested.
5. Calendar preview shows 24 events across six dates. Checklist is offered as a secondary result.
6. Primary action: `캘린더 일정 24개 확인`.
7. User can download ICS/copy calendar rows or save the same overlay to My Flow.
8. Receipt states 24 events, date range, source link retained, excluded count.
9. My Flow opens the full Flow, not only today's first items.

### 3.2 K-MOOC 14 weeks

1. Creator imports a curriculum table; final user usually discovers the published Flow.
2. Source scope confirms all 14 week rows and activity columns.
3. First result is the entire Sheet, with progress `0/14`, search, and row 1 pinned.
4. A continuing learner selects current completed week only after preview.
5. Primary action: `14주 진도표로 시작`.
6. TSV/Sheet copy includes week, topic, activity, status, note. FlowMe alone keeps row identity and execution state.

### 3.3 LibriVox 38 chapters

1. Creator imports the public chapter table; final user finds the existing Flow.
2. First result is a 38-row resource queue preserving order, title, and duration.
3. `이어 듣기` reveals a chapter picker with 1..38, then optional playback position.
4. Primary action: `38장 듣기표로 시작`.
5. No recurrence or calendar event is created. Current chapter is pinned in My Flow.

### 3.4 Adult passport reissue

1. Source rows or official URL resolve to six Todo Items plus an important proxy warning.
2. First Todo preview appears before route choice.
3. User chooses visit or online. Visit alone reveals place.
4. Primary action: `Todo로 6개 항목 가져가기`.
5. Checklist or memo can be copied. No ICS is offered without a real appointment date.

### 3.5 Washer cleaning alert

1. User types `세탁기 알림이 오면 통세척하기`.
2. Composer detects a short request and finds an official-source Flow.
3. Result is a condition card (`40회 세탁 또는 기기 알림 시`) plus four Todo Items.
4. `알림이 왔어요` starts one execution run; it does not create monthly recurrence.
5. Primary action: `조건형 Todo 4개 가져가기` or `My Flow에서 이번 세척 시작`.

### 3.6 Air-conditioner cleaning choice

1. User/creator supplies comparison text or finds an existing source-backed Flow.
2. First result is one comparison Memo with professional/general service scope, time/cost caveat, and contacts.
3. User chooses only after reading. Quote appears only after a choice.
4. Primary action: `메모에 비교 결과 복사`.
5. A Todo is suggested only after a decision, not before.

### 3.7 Agricultural heat response

1. URL is detected and 10 source rows are found.
2. Because rights/safety review is on hold, the user sees the read scope and separated action/condition cards only.
3. Stop and emergency conditions remain prominent and never become repeatable completion boxes.
4. Primary action: `검토가 필요한 범위 확인` for creator; no consumer export or save.
5. After approval, a new published Flow version can enter the final-user journey.

### 3.8 Todoist authenticated source

1. Public URL reveals phase labels but not actual tasks, owners, or deadlines.
2. The UI states `실제 할 일 0개 확보` and creates no proposal.
3. Primary action: `권한 있는 원문 가져오기`.
4. Imported file is parsed, scope is confirmed, and only then can a creator proposal be made.
5. Provider failure keeps the URL and file selection metadata for retry; protected file contents follow explicit retention policy.

## 4. Recovery and update journeys

### Draft recovery

- restore composer input and user overlay separately
- show `작성 중이던 내용을 복구했습니다`
- let the user discard recovery without deleting saved My Flow data

### Wrong detection

- show detected kind as a compact control
- `다르게 해석` offers URL/text/list choices
- changing kind keeps raw input, clears only derived proposal

### Duplicate/existing Flow

- canonical URL lookup happens before proposal generation
- show version/source and use existing Flow as primary
- creator can branch into `새 버전 제안` without silently replacing published Flow

### Source update

- preserve user overlay and run state
- map unchanged Item identities automatically
- show added/removed/changed Items
- ask for manual mapping when identity confidence is low
- export always identifies the Flow version and current personal overlay

### Export failure

- keep selected format/scope
- show no false receipt
- offer `다시 시도` and a format-specific fallback such as copy text
