# 2026-06-08 Elementary Entry Flow Candidate

Purpose: advance the second external-ecosystem roadmap candidate into a concrete FlowMe Stage 0 experiment candidate.

Status: source-to-Flow QA candidate, not validated by user behavior.

## Why This Candidate

Elementary school entry preparation is useful for FlowMe because parents already gather information from government notices, education-office guides, school announcements, and blog checklists, then manually turn it into a private purchase/checklist flow.

The candidate is strong only if FlowMe keeps the boundary clear:

- official process: school assignment, 취학통지서, 예비소집, school notice;
- parent checklist: bag, indoor shoes, pencil case, labels, water bottle;
- defer list: notebooks, art supplies, and school-specific items that should wait for the school or teacher notice.

FlowMe should not become a school-admission portal or parenting-coaching product. It should compile a small first-school checklist and exportable reminders.

## Source Evidence

Checked on 2026-06-08.

| Source | Evidence Shape | Useful Flow Cues | Boundary |
|---|---|---|---|
| Seoul Metropolitan Office of Education, 2026 new parent guide notice | official education-office notice | parent guide distribution, school-life preparation, online parent education, multilingual e-book | good official context, not an item-level supply checklist |
| Seoul Metropolitan Office of Education policy page | official education-office page | 2026 초·중 새내기 학부모 길라잡이, online sessions, school-life preparation topics | Seoul-specific; other regions may differ |
| Ulsan Buk-gu meeting PDF, 2026 취학통지서 notice | local government notice | online 취학통지서 period, 대상, Government24 PC-only application, mail/in-person notice period | administrative notice; not a school supply guide |
| Gangwon Ilbo article on 2026 취학통지서 | local news based on city notice | Government24 search/apply flow, PC-only note, mail/in-person fallback | use as supporting evidence, not primary official source |
| Cherwoo Tistory 2026 supply checklist | parent checklist article | do not buy everything early, school notice first, core supply list, defer art/notebook items, first-day checklist, labeling | blog guidance; school notice remains primary |
| AjinHub elementary checklist | practical parent guide | school notice check, safety/practicality, overbuying caution, comprehensive preparation checklist | blog guidance; not official school rule |
| Hahappa Tistory 2026 checklist | parent checklist article | defer some purchases until teacher notice, D-30 timeline, budget cues | useful for timing pattern, but purchase and support-money claims need local verification |

## User Behavior

- User moment: a parent has an incoming first grader and needs to prepare between 취학통지서, 예비소집, school notice, and the first school day.
- Current behavior: search multiple blogs, ask parents, buy a full set too early, then adjust after school or teacher notice.
- Manual breakpoints:
  - official school assignment and school-life preparation are separate from shopping lists;
  - parents overbuy notebooks/art supplies before school-specific instructions;
  - labeling and first-day packing happen late;
  - school notice, teacher message, and local education-office guidance may conflict with generic blog lists.

## FlowMe Fit

- Input FlowMe can take: school start date or 입학식 date, school name, optional 예비소집 date.
- Output FlowMe can produce: D-30 checklist, D-7 label/packing reminder, D-Day first-day memo, defer-until-notice list.
- Natural artifact: `hybrid`, with calendar reminders plus internal checklist/memo.
- Minimum anchor: 입학식 date.
- Stage 0 behavior:
  - `open`: parent opens the candidate from an entry-preparation source.
  - `anchor input`: parent enters 입학식 date.
  - `copy/export`: parent copies checklist or exports D-30/D-14/D-7/D-1/D-Day reminders.
  - `check`: parent marks notice, core purchase, label, first-day bag, defer list.
  - `feedback`: parent reports school-specific missing item or item that should be deferred.

## Conversion Decision

Conversion decision:

- User need: As a parent of an incoming first grader, I need a short school-entry checklist that separates official school notices from common preparation items, so that I can prepare the first day without overbuying or missing school-specific instructions.
- Content shape: official education notice + government notice + parent checklist articles.
- Primary destination: `hybrid`.
- Structure: `timeline`.
- Action count: 7 source-derived rows.
- Playbook: moving/admin timeline plus source-specific checklist.
- Exceptions: do not present blog supply lists as official school requirements. Keep "school notice first" and "buy later after teacher notice" as visible actions.
- Risk/source handling: official process, parent experience, and purchase advice stay separate. FlowMe does not store child resident data, school assignment documents, or child health/private data.

## Proposed Flow Items

Default anchor: 입학식 date.

| Offset | Item | Destination | Completion |
|---:|---|---|---|
| D-60 | 취학통지서와 배정학교 확인 | calendar/memo | 정부24, 우편/인편 통지, 주민센터 안내 중 해당 경로로 배정학교와 예비소집 정보를 확인했다. |
| D-30 | 학교/교육청 새내기 안내 열기 | memo/checklist | 학교 홈페이지, 교육청 학부모 안내, 예비소집 안내문 중 최신 안내를 열어봤다. |
| D-21 | 먼저 살 물건만 고르기 | checklist | 책가방, 실내화/주머니, 단순 필통, 연필/지우개, 네임스티커처럼 공통성이 높은 물건만 정했다. |
| D-14 | 학교 안내 보고 보류할 물건 표시 | checklist | 공책, 미술도구, 풀/가위, 색종이 등 학교별 차이가 큰 물건은 안내 후 구매로 표시했다. |
| D-7 | 이름표 붙이기 | checklist | 실내화, 주머니, 책가방, 필통, 물통, 연필 일부에 이름을 붙였다. |
| D-3 | 등교 동선과 가방 넣어보기 | checklist | 아이와 함께 가방에 넣어보고, 등교 동선이나 첫날 이동을 확인했다. |
| D-1 | 입학식 첫날 가방 따로 챙기기 | checklist | 입학 안내문, 실내화, 물, 필요한 서류, 보호자 신분증 등 첫날 바로 쓸 것만 챙겼다. |

## Export Shapes

### Calendar Reminder Rows

| Date Rule | Calendar Title | Event Memo |
|---|---|---|
| entry date - 60 days | 취학통지서 확인 | 정부24 또는 우편/인편 통지로 배정학교와 예비소집 정보를 확인. 모바일 발급 가능 여부와 기간은 최신 공지 확인. |
| entry date - 30 days | 학교 새내기 안내 열기 | 학교 홈페이지, 교육청 학부모 안내, 예비소집 안내문을 확인. 학교 안내가 블로그 체크리스트보다 우선. |
| entry date - 21 days | 초1 공통 준비물 먼저 정하기 | 책가방, 실내화/주머니, 단순 필통, 연필/지우개, 네임스티커 중심으로 준비. |
| entry date - 14 days | 학교 안내 후 살 물건 보류 | 공책, 미술도구, 풀/가위, 색종이, 세부 규격이 있는 물건은 담임/학교 안내 후 구매. |
| entry date - 7 days | 준비물 이름 붙이기 | 실내화, 가방, 필통, 물통, 연필 일부에 이름표 또는 네임스티커 부착. |
| entry date - 1 day | 입학식 가방 챙기기 | 첫날 필요한 안내문, 실내화, 물, 보호자 신분증, 학교가 요구한 서류만 챙김. |

### Checklist Copy

```text
초등 입학 준비 체크

1. 취학통지서에서 배정학교와 예비소집 정보를 확인했다.
2. 학교 홈페이지, 예비소집 안내문, 교육청 새내기 학부모 안내를 열어봤다.
3. 책가방, 실내화/주머니, 단순 필통, 연필/지우개, 네임스티커처럼 먼저 살 물건만 정했다.
4. 공책, 미술도구, 풀/가위, 색종이 등 학교별 차이가 큰 물건은 안내 후 구매로 표시했다.
5. 실내화, 가방, 필통, 물통, 연필 일부에 이름을 붙였다.
6. 아이와 가방에 넣어보고 등교 동선이나 첫날 이동을 확인했다.
7. 입학식 첫날 필요한 안내문, 실내화, 물, 서류, 보호자 신분증을 따로 챙겼다.

주의: 학교 안내문과 담임 안내가 우선입니다. 블로그 준비물 목록은 참고용입니다.
```

## Source And Risk Separation

### Official/Admin Facts

- 2026학년도 취학통지서 관련 notices identify Government24/PC online application windows and mail/in-person fallback in some municipalities.
- Seoul education-office pages provide 2026 new parent guide and online education context.
- School-specific notices and teacher messages remain the highest-priority source for actual supplies.

### Parent Checklist

- Common early items: bag, indoor shoes and pouch, simple pencil case, pencils, eraser, name labels, water bottle or tissue depending on school notice.
- Labeling matters because first graders often lose or mix up belongings.
- Some supplies should wait until the school notice confirms exact type, count, or whether the school provides them.

### Do Not Store

- child resident registration details;
- school assignment document images;
- child health information;
- resident number or family relation documents;
- payment or support-benefit application details;
- teacher/private class-message screenshots.

### Caution Copy

This Flow turns school-entry sources into an execution checklist. Follow the latest school notice and teacher guidance when it differs from blog or generic checklist content.

## Platform And Competitor Notes

| Tool | Current User Use | FlowMe Position |
|---|---|---|
| Government24 | official 취학통지서 path | source/official action, not an integration target for Stage 0 |
| School homepage / class message | latest supply and first-day instructions | highest-priority source link |
| Naver Blog / Tistory | parent checklist and shopping advice | content source, but not official |
| Google Calendar / Apple Calendar | reminder for 예비소집, 입학식, labeling | export destination |
| Google Sheets / Notion | purchase checklist and family sharing | optional checklist/memo destination; avoid building a school dashboard |
| KakaoTalk | parent sharing with spouse/family | memo/share-text destination |

## Product Decision

- A/B/C: `A-`.
- Why: strong parent need, high repeat search demand, clear checklist shape, and simple date anchor. The minus is because generic supply lists are easy to overstate unless school-specific notice boundaries are very visible.
- Next action: make a `/content-flows` review candidate after choosing one primary source bundle: official 취학통지서 source + education-office guide + one parent checklist.
- Do not build:
  - school assignment lookup;
  - child profile or resident data storage;
  - support-money application tracker;
  - shopping affiliate surface;
  - full parenting coaching route;
  - universal "must buy" list.

## Rubric Summary

- User Need Fit: 5
- Execution Clarity: 4
- Content Fidelity: 4
- Portability: 5
- Cognitive Load: 4
- Copy Specificity: 4
- Source/Safety: 4
- Accessibility/Operability: 4

Top fixes before UI promotion:

1. Make "학교 안내문과 담임 안내가 우선" visible above the checklist.
2. Split `먼저 살 것` and `안내 후 살 것` into separate UI groups.
3. Avoid exact budget, support-money, or product-buying claims unless tied to a local official source.
4. Keep child identity documents and school assignment screenshots out of FlowMe storage.

## Recommendation

Promote this as the second detailed Phase 1 candidate, but keep it behind the dorm candidate for first UI implementation.

Reason:

- Dorm move-in has stronger official item-level source structure.
- Elementary entry has broader user demand, but stronger risk of becoming generic shopping advice.

Preferred implementation path:

1. Add as a `/content-flows` review candidate after dorm move-in.
2. First screen should show the split: `학교 안내 확인` -> `먼저 살 것` -> `안내 후 살 것`.
3. Use an 입학식 date anchor and optional 예비소집 date.
4. Keep blog checklist rows as parent-experience guidance, not official requirements.

## Source Snapshot

- Seoul Metropolitan Office of Education, "서울시교육청, 초·중 입학 앞둔 학부모 대상 사전 교육 본격 운영", opened 2026-06-08: `https://enews.sen.go.kr/news/view.do?bbsSn=190682&step1=3&step2=1`
- Seoul Metropolitan Office of Education policy page, "초·중 새내기 학부모 길라잡이 배포 및 온라인 교육 운영 안내", opened 2026-06-08: `https://www.sen.go.kr/user/bbs/BD_selectBbs.do?q_bbsDocNo=20260202154243019&q_bbsSn=1028`
- Ulsan Buk-gu PDF meeting notice, "2026년도 초등학교 취학통지서 발급 안내", opened 2026-06-08: `https://www.bukgu.ulsan.kr/download.do%3Bjsessionid%3DqzgYuVKn2nd8tL3kapqI9GjfFyMtgmzcSjUQEnnxTUBnwiOPtgUfTqj6cdE4hLgk.www_ap_servlet_engine1?uuid=11591eec-2d93-4872-939c-bc87764e63ed.pdf`
- Kangwon Ilbo, "2026학년도 취학통지서 온라인 발급…학부모 편의성 높여", opened 2026-06-08: `https://kwnews.co.kr/page/view/2025112410465265049`
- Cherwoo Tistory, "초등학교 입학 준비물 리스트(2026)", opened 2026-06-08: `https://cherwoo.tistory.com/m/511`
- AjinHub, "초등학교 입학 준비물 체크리스트: 예비 학부모를 위한 실용 가이드", opened 2026-06-08: `https://www.ajinhub.com/post/parenting-elementary-checklist-guide`
- Hahappa Tistory, "2026년 초등학교 입학 준비물 체크리스트", opened 2026-06-08: `https://hahappa.tistory.com/153`
