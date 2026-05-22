# Travel Proof Emergency Workbench Design

## Context

The previous moving Workbench pass proved the pattern: keep the primary timeline list/calendar, then add content-specific artifact fields that match what users naturally create outside FLOW. Travel has a different artifact shape. A traveler does not compare vendors first. They confirm official requirements and keep a compact emergency card they can copy, print, or reference offline.

This design applies to `overseas-travel-d14` and `real-mofa-overseas-travel-prep`.

## User Scenario

The user is preparing for a trip to Japan or Vietnam. They enter `출국일=2026-07-18`, then record:

- `방문 국가/도시=일본 도쿄`
- `입국 조건 확인일=2026-07-16`
- `여행경보 확인일=2026-07-16`
- `항공/수하물 규정 확인=항공사 앱 캡처`
- `영사콜센터=+82-2-3210-0404`
- `현지 공관=주일본대한민국대사관`
- `숙소 주소=도쿄 ○○ 호텔`
- `가족 공유 위치=가족 단톡방`

## UX Shape

The timeline Workbench remains:

1. `전체 할 일`
2. `월간 캘린더`
3. Travel-specific memo card

The travel memo card is titled `공식 확인·비상 카드`. It has a short helper sentence: `국가별 입국 조건과 비상 연락처를 한 장에 남겨둡니다.`

Fields:

- `방문 국가/도시`
- `입국 조건 확인 결과`
- `여행경보 확인 결과`
- `항공·수하물 규정 확인`
- `영사콜센터·현지 공관`
- `숙소·보험·가족 공유 메모`

## Data Flow

Use the existing `FlowWorkbenchState.memoCards` map:

```ts
{
  memoCards: {
    "travel-destination": "일본 도쿄",
    "travel-entry-condition": "무비자 90일, 여권 6개월 이상 확인",
    "travel-alert-status": "외교부 안전공지 2026-07-16 확인",
    "travel-baggage-rule": "보조배터리 기내만, 액체류 100ml",
    "travel-emergency-contact": "영사콜센터 +82-2-3210-0404 / 주일본대사관",
    "travel-share-note": "호텔 주소와 항공편을 가족 단톡방에 공유"
  }
}
```

## Export Behavior

Text export and XLSX `실행판 기록` include all non-empty travel memo fields using their Korean labels. This keeps the travel card useful even before direct calendar or note-app integrations exist.

## Out Of Scope

- No destination-specific API lookup.
- No automatic embassy/contact lookup.
- No file upload for passport or insurance PDFs.
- No multi-source source card redesign in this PR.
- No external Google Calendar or Apple Notes integration.

## Acceptance Criteria

- `overseas-travel-d14` renders `공식 확인·비상 카드`.
- Travel memo fields persist after reload.
- Text export includes `방문 국가/도시` and `영사콜센터·현지 공관`.
- XLSX `실행판 기록` includes the same memo records.
- Existing moving vendor proof fields still render only for moving Flows.
