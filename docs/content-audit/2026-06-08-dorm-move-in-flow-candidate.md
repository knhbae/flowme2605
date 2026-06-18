# 2026-06-08 Dorm Move-In Flow Candidate

Purpose: advance the first external-ecosystem roadmap candidate from a source lead into a concrete FlowMe Stage 0 experiment candidate.

Status: source-to-Flow QA candidate, not validated by user behavior.

## Why This Candidate

Dorm move-in preparation is a stronger next FlowMe experiment than another moving, wedding, appliance, travel, or used-car variant because it combines:

- a real D-day life transition;
- school-specific official instructions;
- required documents;
- packing and restricted-item checks;
- first-day arrival sequence;
- minimal user input.

It tests whether FlowMe can turn school/dorm PDFs and pages into a small execution artifact without becoming a student housing platform.

## Source Evidence

Checked on 2026-06-08.

| Source | Evidence Shape | Useful Flow Cues | Boundary |
|---|---|---|---|
| Daegu Catholic University dormitory entry page | standing dorm entry guide | entry-day documents, bedding, essential supplies, allowed electronics, prohibited items | standing page; student must still check the latest term notice |
| Dong-eui University Hyomin dormitory page | standing dorm entry guide | tuberculosis certificate, entry-day room check, document submission, mobile pass, bedding/personal items, prohibited appliances | school-specific rule; no universal claim |
| Kyung Hee University second dormitory page | standing dorm entry guide | admission limitation if health check is missing, term-specific notice warning | page itself says term-specific notices may differ |
| Neungju High School 2025 freshman dorm PDF | one-page move-in schedule | move-in hour blocks, room assignment posting, document submission, mattress size, personal supplies, prohibited food/appliances, parking cue | high-school context; use as pattern evidence, not a university default |
| Doowon Technical University 2025 dorm PDF | term notice | application/registration window, payment, move-in period, tuberculosis opinion letter, room/password check, facility check, meal operation | includes payment and account data that FlowMe should not store |
| Yonsei Songdo dorm 2025 PDF | detailed term notice | tuberculosis and MMR documents, facility checklist, bed size, personal items, prohibited heat appliances, delivery/taxi address caution | detailed but term-specific; health documents are source facts, not FlowMe medical advice |
| Sungkyunkwan dorm prep PDF | checklist/reference PDF | personal items, prohibited fire-risk items, delivery address, room equipment | older source; useful only as pattern support |
| Buyeong Girls' High School dorm PDF | one-page move-in notice | date/time, orientation, required documents, personal items, prohibited heat appliances | high-school context; pattern support |

## User Behavior

- User moment: a student or parent has received dorm admission/move-in instructions and needs to execute them before arrival.
- Current behavior: read a PDF or dorm page, screenshot it, make a private checklist, search generic packing lists, and re-check prohibited items manually.
- Manual breakpoints:
  - required documents are mixed with packing items;
  - forbidden items are easy to miss because they look like normal household items;
  - move-in date/time, room assignment, facility check, and meal start are separate;
  - school-specific rules cannot be safely replaced by a generic blog checklist.

## FlowMe Fit

- Input FlowMe can take: move-in date, dorm/school name, optional room/building note.
- Output FlowMe can produce: D-day checklist, calendar reminders, packing memo, source link memo.
- Natural artifact: `hybrid`, with calendar reminders plus internal checklist/memo.
- Minimum anchor: move-in date.
- Stage 0 behavior:
  - `open`: user opens the candidate from a dorm move-in source.
  - `anchor input`: user enters move-in date.
  - `copy/export`: user copies checklist or exports D-7/D-1/D-day reminders.
  - `check`: user marks documents, packing, prohibited item review, and arrival steps.
  - `feedback`: user reports school-specific missing item or rule conflict.

## Conversion Decision

Conversion decision:

- User need: As a student moving into a dorm, I need required documents, packing items, prohibited items, arrival sequence, and facility-check steps in one checklist, so that I can arrive on the correct date without missing school-specific requirements.
- Content shape: official dorm entry guide and term-specific PDF notices.
- Primary destination: `hybrid`.
- Structure: `timeline`.
- Action count: 7 source-derived rows.
- Playbook: moving/admin timeline.
- Exceptions: the Flow should not generalize one school's health documents, payment rules, meal plan, or prohibited list to every dorm. It should always keep "check latest dorm notice" as the first action.
- Risk/source handling: official school facts, user packing memo, and cautions stay separate. FlowMe does not store health certificate images, payment account details, room passwords, card keys, or ID numbers.

## Proposed Flow Items

Default anchor: move-in date.

| Offset | Item | Destination | Completion |
|---:|---|---|---|
| D-14 | 최신 기숙사 입사 공지 다시 열기 | memo/checklist | 입사일, 제출서류, 반입금지, 택배주소가 최신 공지와 맞는지 확인했다. |
| D-10 | 제출서류 준비 시작 | checklist | 결핵검사 등 학교가 요구한 서류를 준비할 방법과 제출기한을 확인했다. |
| D-7 | 침구와 기본 생활용품 목록 정리 | checklist | 매트리스 크기, 침구, 세면도구, 슬리퍼, 수건, 세탁용품을 체크했다. |
| D-5 | 반입금지 물품 빼기 | checklist | 전열기, 취사도구, 주류, 화재위험 물품 등 해당 학교 금지 품목을 짐에서 제외했다. |
| D-3 | 택배/이동 짐 나누기 | memo | 직접 가져갈 물건과 택배로 보낼 물건을 나누고, 학교가 안내한 주소/동/호수 표기 방식을 확인했다. |
| D-1 | 신분증, 서류, 첫날용 짐 따로 묶기 | checklist | 입사 당일 바로 제출하거나 꺼낼 물건을 별도 가방에 넣었다. |
| D-Day | 입사 절차와 시설점검표 처리 | checklist | 방/호실 확인, 서류 제출, 키/카드 수령, 시설점검표 작성 또는 제출을 완료했다. |

## Export Shapes

### Calendar Reminder Rows

| Date Rule | Calendar Title | Event Memo |
|---|---|---|
| move-in date - 14 days | 기숙사 입사 공지 다시 확인 | 입사일, 제출서류, 반입금지, 택배주소가 최신 공지와 같은지 확인. 원문 링크를 열어 학교별 차이를 확인. |
| move-in date - 7 days | 기숙사 침구/생활용품 준비 | 매트리스 크기, 침구, 세면도구, 수건, 슬리퍼, 세탁용품, 개인 학습도구 확인. |
| move-in date - 5 days | 기숙사 반입금지 물품 빼기 | 전열기, 취사도구, 화재위험 물품, 주류 등 학교별 금지 품목을 짐에서 제외. |
| move-in date - 1 day | 입사 당일 서류/신분증 따로 묶기 | 제출서류, 신분증, 첫날 필요한 물건을 따로 챙김. 건강서류 이미지는 FlowMe에 저장하지 않음. |
| move-in date | 기숙사 입사 절차 완료 | 호실 확인, 서류 제출, 키/카드 수령, 시설점검표 작성, 금지물품 반입 여부 확인. |

### Checklist Copy

```text
기숙사 입사 준비 체크

1. 최신 기숙사 공지에서 입사일, 제출서류, 반입금지, 택배주소를 다시 확인했다.
2. 학교가 요구한 제출서류를 준비했고, 제출기한과 제출방법을 확인했다.
3. 침구, 세면도구, 수건, 슬리퍼, 세탁용품, 개인 학습도구를 챙겼다.
4. 학교별 반입금지 물품을 짐에서 뺐다.
5. 직접 가져갈 짐과 택배로 보낼 짐을 나눴다.
6. 입사 당일 바로 꺼낼 신분증/서류/첫날용 짐을 따로 묶었다.
7. 입사 당일 호실 확인, 서류 제출, 키/카드 수령, 시설점검표 작성을 완료했다.

주의: 이 체크리스트는 원문 공지를 실행용으로 정리한 것입니다. 학교별 최신 공지가 우선입니다.
```

## Source And Risk Separation

### Source Facts

- Required documents vary by school and term.
- Several checked sources include tuberculosis-related document requirements.
- Some sources require entry-day facility checks, room/password/key/card handling, or first-day office submission.
- Prohibited items commonly include heat/fire-risk appliances, cooking devices, alcohol, and other school-specific items.

### User Memo

- Dorm/school name.
- Move-in date.
- Room/building note if already assigned.
- Personal packing note.

### Do Not Store

- health certificate images;
- resident registration documents;
- payment account details;
- room password;
- card key number;
- student ID or resident number;
- private medical details.

### Caution Copy

This Flow follows the linked dorm notice as an execution checklist. If the latest school notice, dorm office, or term-specific PDF differs, follow the school notice.

## Platform And Competitor Notes

| Tool | Current User Use | FlowMe Position |
|---|---|---|
| Google Calendar / Apple Calendar | remember move-in day and pre-move reminders | export destination; no direct replacement |
| Google Sheets / Excel | packing list or shared family checklist | optional sheet export for family/student collaboration |
| Notion | student life dashboard or packing template | competitor only if FlowMe tries to become a student workspace; avoid this |
| Todoist / TickTick | task reminders | destination/reference; FlowMe value is source-bound checklist from dorm notices |
| KakaoTalk | parent-student sharing | memo/share-text destination |

## Product Decision

- A/B/C: `A`.
- Why: the candidate has clear official/semiofficial source structure, a date anchor, checklist rows, prohibited-item cautions, and an obvious export-first shape.
- Next action: build a source-specific preview candidate before public route promotion. Use a neutral title such as `기숙사 입사 준비 체크`.
- Do not build:
  - dorm marketplace;
  - room assignment tracker;
  - health document upload;
  - payment tracking;
  - school login integration;
  - universal prohibited item claims;
  - student-life dashboard.

## Rubric Summary

- User Need Fit: 5
- Execution Clarity: 4
- Content Fidelity: 4
- Portability: 5
- Cognitive Load: 4
- Copy Specificity: 4
- Source/Safety: 5
- Accessibility/Operability: 4

Top fixes before UI promotion:

1. Attach one exact primary source as the candidate source, with other dorm sources as pattern evidence only.
2. Keep the first visible action as `최신 기숙사 공지 다시 열기`.
3. Make `학교별 최신 공지가 우선` visible near export/copy controls.
4. Keep health and payment documents out of FlowMe storage.

## Recommendation

Promote this as the first detailed Phase 1 candidate from the external ecosystem roadmap.

Preferred implementation path:

1. Add a `/content-flows` review candidate, not a public `/f/[slug]` route yet.
2. Use one primary source, likely a recent term PDF with enough concrete rows.
3. Show a D-14/D-7/D-5/D-1/D-Day artifact preview.
4. Include source note and no-storage boundaries in the detail panel.
5. Review on mobile first because the user is likely packing or checking on a phone.

## Source Snapshot

- Daegu Catholic University dormitory, "입사안내", opened 2026-06-08: `https://dormitory.cu.ac.kr/page_SgCx18`
- Dong-eui University Hyomin dormitory, "입사안내", opened 2026-06-08: `https://dorm.deu.ac.kr/hyomin/30/3013.kmc`
- Kyung Hee University second dormitory, "입사안내", opened 2026-06-08: `https://dorm2.khu.ac.kr/30/3010.do`
- Neungju High School, "2025학년도 신입생 우정학사(기숙사) 입사 안내" PDF, opened 2026-06-08: `https://neungju.hs.jne.kr/data/attach_data/jangsung/neungju_hs/k2board/na/bbs_121524/ntt_1800489173/doc_5384v68b7%3D52v15%3D4fv12%3D9dv3b%3Dcf97v0777v0305_v8765.pdf`
- Doowon Technical University, "2025학년도 1학기 두원학사 기숙사생 모집 안내" PDF, opened 2026-06-08: `https://www.doowon.ac.kr/bbs/kr/23/V2o0YS9qVkZ5azk3TnZTQmNGYThaQT09/download.do`
- Yonsei University Songdo dormitory, "2025학년도 1학기 송도학사 입사 안내" PDF, opened 2026-06-08: `https://devcms.yonsei.ac.kr/yicdorm/regulations/dormNotice.do?articleNo=220564&attachNo=181809&mode=download`
- Sungkyunkwan University dormitory, "기숙사 입사 준비물" PDF, opened 2026-06-08: `https://dorm.skku.edu/_custom/skku/_common/board/download.jsp?article_no=61864&attach_no=5517`
- Buyeong Girls' High School, "안심학숙(기숙사) 입사 안내" PDF, opened 2026-06-08: `https://buyeong.hs.jne.kr/data/attach_data/yeosu/buyeong_hs/k2board/na/bbs_50102/ntt_1800492702/doc_2356va18a%3D92v82%3D46v3d%3D86v9c%3D25ffv0267vfb8b_v5427.pdf`
