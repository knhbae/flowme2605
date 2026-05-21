# Other Channel Original URL Conversion Pass - 2026-05-21

Scope: all remaining real source-backed channel flows outside the 20 exact fitness YouTube videos.

Method:
- Visited representative original URLs for official, brand, community, and curation channels.
- Preserved source titles for representative pages where the original page title was available.
- Replaced one stale KDCA source URL with a currently reachable official National Health Information Portal page.
- Added a common conversion rule for non-video source flows: each action detail must state where the user should move that action in their own tool.
- Kept official, reference, and creator-experience source types separated.

## Updated Source Anchors

| Channel | Representative FLOW | Original URL status | FLOW update |
| --- | --- | --- | --- |
| 삼성전자서비스 | `real-samsung-aircon-seasonal-care` | Visited Samsung maintenance/cleaning page | Source title updated to `삼성전자서비스 유지보수/세척안내 - 에어컨` |
| 삼성전자서비스 | `real-samsung-washer-filter-care` | Visited Samsung washer solution page | Source title updated to exact support article title |
| 오늘의집 | `real-ohouse-moving-d30-prep` | Visited advice page | Source title updated to the original article title |
| 오늘의집 | `real-ohouse-movein-cleaning-check` | Visited advice page | Source title updated to the original article title |
| 질병관리청 | `real-kdca-travel-health-check` | Previous URL was stale | Source URL moved to reachable official health guide page |
| TS한국교통안전공단 | `real-ts-vehicle-inspection-prep` | Visited inspection procedure page | Source title updated to original page title |
| Q-Net | `real-qnet-application-examday-check` | Visited Q-Net application caution page | Existing source retained |
| 아이사랑 | `real-childcare-vaccination-visit-prep`, `real-childcare-support-application-check` | Visited age-care and hourly childcare pages | Existing source retained |
| 국가동물보호정보시스템 | `real-pet-registration-check`, `real-pet-health-visit-routine` | Visited animal registration and FAQ pages | Existing source retained |
| 외교부 해외안전여행 | `real-mofa-overseas-travel-prep` | Visited main safety-travel portal | Existing broad official source retained |
| 안전운전 통합민원 | `real-safe-driving-license-renewal` | Visited redirected license guide page | Existing source retained |

## Conversion Rule Added

Every non-exact-video source FLOW action now appends a portable destination cue:

`내 도구에 옮길 때는 [D-Day 일정표/반복 루틴표/체크표/일정표·체크표]의 "[action title]" 칸에 기록합니다.`

Reason:
- The user is not trying to manage FLOW as a separate heavy app.
- The user needs to recognize which calendar, spreadsheet, checklist, or memo slot the source content should become.
- This keeps source-backed multi-step flows useful without adding more UI complexity.

## Remaining Caveat

Some broad channel flows still use channel-level or portal-level sources instead of a single exact article/video. They remain marked as `source_precision: broad`; they should not be presented as equally source-specific as exact-video or exact official-page flows.
