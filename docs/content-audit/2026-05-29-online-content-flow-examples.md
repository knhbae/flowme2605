# Online Content Flow Examples

Date: 2026-05-29
Status: Draft for discussion

Purpose: online content candidates can be reviewed with their source shape and a first FLOW conversion example side by side. This is not a full source copy. The "original content" sections summarize source facts and source structure, with links retained for follow-up verification.

## Selection Rules

Good FLOW candidates should have at least one of these properties:

- A real-world date, deadline, sequence, repeat cycle, visit, submission, or decision point.
- A natural destination outside FLOW: calendar, sheet, memo, or checklist.
- A user-visible completion state: submitted, booked, compared, recorded, checked, stopped, or held.
- Source/risk boundaries that can be separated from creator opinion.

Weak candidates:

- Pure tips with no next action.
- Broad category pages with no exact route-level source.
- Content that requires medical, legal, financial, or safety certainty without an official source.
- Long lists where every row has the same priority and no real export destination.

## 1. Moving D-60 To D+7

Source:
- Greechii, "이사 준비 체크리스트: 전세 정리부터 이삿짐센터·입주청소·전입신고·최종 입주까지 완벽 가이드"
- URL: https://greechii.com/tips/home/moving-checklist/
- Checked: 2026-05-29

Original content:
- Content shape: timeline guide plus checklist.
- It organizes moving tasks from D-60 to D+7.
- It includes house search, vendor quotes, cleaning, utility transfer, address changes, move-day meter/photos, and post-move reports.
- It mentions 전입신고 after moving and separates several admin tasks, but official government URLs should still be verified before public exposure.

Why it fits FLOW:
- Strong date anchor: move date.
- Natural artifact: calendar reminders plus checklist sheet.
- User pain: missing a deadline or losing evidence during a chaotic move.

Conversion decision:
- User need: As a person moving homes, I need dated reminders and evidence checks, so that I do not miss bookings, address changes, or move-day proof.
- Content shape: timeline + checklist.
- Primary destination: hybrid.
- Structure: timeline.
- Action count: 10-12 dated items.
- Playbook: Moving / Administrative Timeline.
- Exceptions: split evidence items from generic checklist items so calendar cards stay short.
- Risk/source handling: official admin deadlines must be marked as official-check-needed until confirmed from government sources.

Flow example:

```yaml
flow_id: candidate-moving-d60-d7
title: 이사 D-60부터 입주 후 7일까지 실행 캘린더
category: moving
structure_type: timeline
anchor_type: move_date
primary_destination: hybrid
exports:
  - calendar
  - checklist_sheet
  - move_day_memo
items:
  - offset: -60
    type: scheduled_task
    title: 현재 집 해지 통보와 새 집 조건 정리
    detail: 계약서 해지 조건, 보증금 반환 일정, 새 집 예산과 지역 조건을 한 곳에 적는다.
    completion: 해지 통보 기록과 새 집 조건 메모가 남아 있다.
  - offset: -45
    type: scheduled_task
    title: 이사업체 3곳 견적 비교
    detail: 업체명, 방문견적일, 포함 범위, 사다리차/보험 조건을 표에 입력한다.
    completion: 비교표에 3개 견적과 보류/선택 메모가 있다.
    secondary_types: [memo_evidence, decision_hold]
  - offset: -21
    type: scheduled_task
    title: 입주청소와 가전 배송일 확정
    detail: 청소일, 가전/가구 배송일, 입주 가능 시간을 캘린더에 넣는다.
    completion: 예약일과 연락처가 캘린더/메모에 남아 있다.
  - offset: -10
    type: scheduled_task
    title: 인터넷, TV, 도시가스 이전 예약
    detail: 통신사와 도시가스 예약 시간을 확정하고 방문 기사 연락처를 적는다.
    completion: 설치/개통 예약 시간이 정해져 있다.
  - offset: 0
    type: scheduled_task
    title: 하자 사진과 계량기 수치 기록
    detail: 바닥, 벽, 창틀, 수도/전기/가스 계량기 사진을 촬영하고 파일명을 남긴다.
    completion: move-day 사진 파일명과 수치가 메모에 있다.
    secondary_types: [memo_evidence]
  - offset: 1
    type: scheduled_task
    title: 전입신고와 주소 변경 상태 확인
    detail: 전입신고, 우편물 전송, 카드/은행/구독 주소 변경 상태를 확인한다.
    completion: 접수 여부와 남은 주소 변경 항목이 구분되어 있다.
```

UX note:
- Calendar item title should not include D-60/D-45 if the calendar already shows a date.
- The detail sheet should show source, evidence fields, and hold/skip reason separately.

## 2. Used Car Buying Check

Source:
- TrendMetricLab, "중고차 구매 체크리스트 2026"
- URL: https://trendmetriclab.com/guides/used-car-buying-checklist/
- Checked: 2026-05-29

Original content:
- Content shape: buying guide and inspection checklist.
- It emphasizes checking documents, accident/repair history, performance inspection records, real vehicle condition, price negotiation, and contract conditions.
- It contains legal or quasi-legal claims, so official verification is required before this becomes a public legal guidance Flow.

Why it fits FLOW:
- Strong decision point: buy, hold, or reject.
- Natural artifact: comparison sheet plus evidence memo.
- User pain: the checklist is useless unless it turns into a decision record before signing.

Conversion decision:
- User need: As a used-car buyer, I need a field inspection sheet and hold memo, so that I can decide before payment or signing.
- Content shape: checklist + decision guide.
- Primary destination: sheet.
- Structure: checklist.
- Action count: 6-8 grouped checks.
- Playbook: Home Appliance / Car Maintenance, overridden to sheet-first because comparison and hold decisions matter more than reminders.
- Exceptions: completion is not "all checked"; completion is "buy/hold/reject decision recorded."
- Risk/source handling: contract/legal assertions need official or statute-backed source labels.

Flow example:

```yaml
flow_id: candidate-used-car-buy-hold
title: 중고차 현장 점검과 구매 보류 메모
category: car
structure_type: checklist
anchor_type: none
primary_destination: sheet
exports:
  - comparison_sheet
  - hold_memo
items:
  - type: check_task
    title: 후보 차량 기본 정보 입력
    detail: 차량명, 연식, 주행거리, 판매자, 가격, 방문일을 표 첫 줄에 입력한다.
    completion: 후보 차량 한 대가 비교표에 추가되어 있다.
  - type: check_task
    title: 성능점검기록부와 실차 상태 대조
    detail: 사고/수리/주행거리 항목을 기록하고 실차에서 다른 점을 메모한다.
    completion: 다른 점이 있으면 사진 파일명과 딜러 답변이 남아 있다.
    secondary_types: [memo_evidence, decision_hold]
  - type: check_task
    title: 외관, 타이어, 누유, 실내 상태 촬영
    detail: 하자 위치별 사진 파일명을 기록하고 수리 필요 여부를 표시한다.
    completion: 증빙 사진과 수리 필요 항목이 표에 있다.
    secondary_types: [memo_evidence]
  - type: decision_hold
    title: 계약 전 구매/보류/거절 결정
    detail: 가격, 하자, 서류, 보증 조건을 기준으로 결정을 고르고 이유를 한 줄로 쓴다.
    completion: buy, hold, reject 중 하나와 이유가 기록되어 있다.
```

UX note:
- Item box tap should open detail, not toggle completion.
- "완료" text/button should be the explicit completion control.
- Hold is a first-class outcome, not a failed checklist.

## 3. Baby Food Start And Reaction Log

Sources:
- Childcare meal-plan PDF from childcare.go.kr
- URL: https://info.childcare.go.kr/info_html5/pnis/search/PnisFileDownload.jsp?STCODE=11740000561&flag=DNLL&wkyymm=202604
- Yookahplus, "이유식 시작 시기와 초기 이유식 식단 구성 실전 메뉴 가이드"
- URL: https://yookahplus.org/posts/baby-weaning-food-start-timing-menu-guide/
- Checked: 2026-05-29

Original content:
- Content shape: meal table plus practical guide.
- The childcare PDF separates early, middle, late, and completion stages, lists food groups, meal frequency, allergen labels, and caution notes.
- The practical guide recommends introducing new ingredients one at a time and observing reactions, but medical-sensitive claims need careful source separation.

Why it fits FLOW:
- Strong repeat/log pattern: meals and reactions.
- Natural artifact: meal calendar plus reaction sheet.
- User pain: parents need a lightweight record, not a generic article.

Conversion decision:
- User need: As a caregiver starting baby food, I need a meal/reaction log, so that I can see what was introduced and what reaction followed.
- Content shape: phase guide + routine log.
- Primary destination: hybrid.
- Structure: phase.
- Action count: 4 phases, with repeatable daily log rows.
- Playbook: Baby / Family / Health Logistics.
- Exceptions: do not turn food order into medical instruction; keep it as source-derived planning support.
- Risk/source handling: allergies and symptoms require explicit stop/contact-professional copy.

Flow example:

```yaml
flow_id: candidate-baby-food-reaction-log
title: 초기 이유식 메뉴와 반응 기록
category: baby_family
structure_type: phase
anchor_type: baby_age_month
primary_destination: hybrid
exports:
  - meal_calendar
  - reaction_sheet
  - caution_memo
items:
  - phase: 초기
    type: routine_session
    title: 오늘 새 재료는 한 가지인지 확인
    detail: 오늘 메뉴, 새 재료, 제공량, 시간, 반응 관찰 메모를 기록한다.
    completion: 오늘 제공한 재료와 반응이 시트에 남아 있다.
    secondary_types: [log_entry, reference_caution]
  - phase: 초기
    type: log_entry
    title: 피부, 구토, 설사, 호흡 이상 여부 기록
    detail: 평소와 다른 반응이 있으면 해당 재료를 중단 표시하고 상담 필요 여부를 메모한다.
    completion: 이상 없음/중단/상담 필요 중 하나가 선택되어 있다.
    secondary_types: [reference_caution]
  - phase: 중기
    type: routine_session
    title: 이번 주 반복 메뉴와 새 재료 구분
    detail: 반복 제공 재료와 새로 넣은 재료를 분리해서 달력에 표시한다.
    completion: 주간 메뉴표에서 새 재료가 표시되어 있다.
```

UX note:
- Calendar에는 메뉴명과 점 색상만 가볍게 보여주고, 알레르기/주의 문구는 detail sheet에 둔다.
- 의료 판단처럼 보이는 문장은 금지한다.

## 4. Driver License Renewal Or Aptitude Test

Source:
- Korea Road Traffic Authority Safe Driving Integrated Civil Service, license guide page
- URL: https://www.safedriving.or.kr/diGuide/selectDiGuide01.do
- Checked: 2026-05-29

Original content:
- Content shape: official administrative guide.
- It distinguishes aptitude test 대상자 and license renewal 대상자.
- It notes that from 2026-01-01, renewal/aptitude periods are tied to the six-month window around birthday, while pre-2026 issued licenses may show a different printed period.
- It instructs users to confirm exact periods through Safe Driving or eFine.

Why it fits FLOW:
- Strong deadline and eligibility logic.
- Natural artifact: calendar reminder plus document checklist.
- User pain: missing renewal windows or relying on printed license dates without checking.

Conversion decision:
- User need: As a license holder, I need to confirm my renewal window and required action, so that I do not miss the legal period.
- Content shape: official guide.
- Primary destination: calendar.
- Structure: timeline.
- Action count: 4-5 items.
- Playbook: Moving / Administrative Timeline, overridden to official admin deadline.
- Exceptions: user must enter license type and birthday/printed period.
- Risk/source handling: do not calculate legal period without telling user to confirm on official service.

Flow example:

```yaml
flow_id: candidate-driver-license-renewal
title: 운전면허 적성검사/갱신 기간 확인
category: admin
structure_type: timeline
anchor_type: renewal_deadline
primary_destination: calendar
exports:
  - calendar
  - document_checklist
items:
  - offset: -180
    type: scheduled_task
    title: 공식 사이트에서 갱신 기간 확인
    detail: 안전운전 통합민원 또는 경찰청 eFine에서 실제 갱신 기간을 확인한다.
    completion: 확인한 갱신 시작일과 마감일이 입력되어 있다.
    secondary_types: [reference_caution]
  - offset: -60
    type: check_task
    title: 적성검사 또는 면허갱신 대상 구분
    detail: 1종, 2종, 70세 이상 여부에 따라 필요한 절차를 구분한다.
    completion: 내 절차가 적성검사/갱신 중 하나로 선택되어 있다.
  - offset: -30
    type: scheduled_task
    title: 방문 또는 온라인 처리 방식 선택
    detail: 온라인 가능 여부, 방문 예약, 사진/신분증 등 준비물을 확인한다.
    completion: 처리 방식과 준비물이 체크되어 있다.
```

UX note:
- This should be official-first UI, not creator-experience UI.
- The first screen should start with "내 기간 확인" and not with a long guide.

## 5. Overseas Travel Safety Card

Source:
- Ministry of Foreign Affairs, "여행 정보와 현지 안전정보를 한눈에 쏙!!"
- URL: https://www.mofa.go.kr/www/brd/m_4080/view.do?seq=375155
- Checked: 2026-05-29

Original content:
- Content shape: official announcement about country-specific overseas safety guide.
- It says the guide gathers emergency contacts, local security conditions, health environment, common incident types and responses, and medical facilities.
- It points users toward overseas safety platforms and push/app channels.

Why it fits FLOW:
- Strong pre-departure checklist and emergency memo.
- Natural artifact: travel safety memo/card.
- User pain: safety info exists but is not in a usable offline/personal checklist.

Conversion decision:
- User need: As a traveler, I need a country-specific emergency card before departure, so that I can find contacts and safety steps quickly.
- Content shape: official reference guide.
- Primary destination: memo.
- Structure: checklist.
- Action count: 5-6 items.
- Playbook: Baby / Family / Health Logistics risk separation applied to travel safety.
- Exceptions: country-specific facts must be fetched from the exact country page, not generalized from the press release.
- Risk/source handling: official source and last-checked date are mandatory.

Flow example:

```yaml
flow_id: candidate-overseas-safety-card
title: 출국 전 해외안전여행 카드 만들기
category: travel
structure_type: checklist
anchor_type: departure_date
primary_destination: memo
exports:
  - emergency_card_memo
  - pre_departure_checklist
items:
  - offset: -14
    type: scheduled_task
    title: 여행 국가 안전정보 공식 페이지 확인
    detail: 국가명, 확인일, 안전 단계, 주요 연락처 링크를 메모한다.
    completion: 국가별 공식 링크와 확인일이 저장되어 있다.
    secondary_types: [reference_caution]
  - offset: -7
    type: memo_evidence
    title: 현지 긴급 연락처 카드 작성
    detail: 재외공관, 영사콜센터, 현지 응급/경찰 연락처를 한 화면에 모은다.
    completion: 오프라인으로 볼 수 있는 연락처 메모가 있다.
  - offset: -3
    type: check_task
    title: 자주 발생하는 사고 대응 메모 확인
    detail: 소매치기, 분실, 질병, 교통 문제 등 해당 국가 페이지의 대응 정보를 요약한다.
    completion: 내 여행지 기준의 주의 항목이 체크되어 있다.
```

UX note:
- The Flow should not recommend destinations.
- It should help convert official safety information into a personal emergency card.

## 6. Computer Skills Exam Study Pack

Source:
- Sinagong computer skills exam material pages and past-exam listing
- URL: https://www.sinagong.co.kr/pds/003001001/past-exams
- Checked: 2026-05-29

Original content:
- Content shape: study material and past-exam archive.
- The page lists computer skills exam materials, including 2026 컴퓨터활용능력 1급 필기 기출문제 and related study resources.
- Community review pages include personal study periods and methods, but those are user experiences, not official study guidance.

Why it fits FLOW:
- Strong study tracker shape.
- Natural artifact: progress sheet plus exam calendar.
- User pain: source materials exist, but the user needs dated rows, wrong-answer review, and retry schedule.

Conversion decision:
- User need: As a computer skills exam candidate, I need a source-derived study tracker, so that I can plan practice rounds and record weak areas before exam day.
- Content shape: study material archive + optional user review.
- Primary destination: hybrid.
- Structure: timeline + routine.
- Action count: source rows only; do not invent lessons if source has no row.
- Playbook: Exam / Certification Prep.
- Exceptions: use past-exam files as rows only when exact files are selected.
- Risk/source handling: keep user review methods separate from official/source material.

Flow example:

```yaml
flow_id: candidate-computer-skills-study
title: 컴활 필기 기출 풀이와 오답 재시도표
category: study
structure_type: timeline
anchor_type: exam_date
primary_destination: hybrid
exports:
  - study_calendar
  - progress_sheet
items:
  - offset: -30
    type: scheduled_task
    title: 선택한 기출 파일과 시험일 입력
    detail: 사용할 기출 PDF/자료 링크, 시험일, 하루 공부 가능 시간을 입력한다.
    completion: 출처 링크와 시험일이 표 상단에 있다.
  - offset: -21
    type: scheduled_task
    title: 1회차 기출 풀이와 틀린 영역 표시
    detail: 문제 풀이 후 과목, 점수, 틀린 유형, 다시 볼 날짜를 기록한다.
    completion: 1회차 점수와 오답 재시도일이 입력되어 있다.
    secondary_types: [log_entry]
  - offset: -7
    type: scheduled_task
    title: 약한 과목만 다시 풀기
    detail: 오답표에서 미해결 유형만 골라 재풀이하고 상태를 바꾼다.
    completion: 미해결 오답 수가 줄었거나 재시도 날짜가 남아 있다.
```

UX note:
- Study Flow should not show a generic "공부하기" checklist.
- The key screen is a progress table where source rows are fixed and user fields are editable.

## First Discussion Recommendation

For the next product discussion, compare these three first:

1. Moving D-60 To D+7
   - Best for validating timeline/calendar UX.
   - Already close to current moving work.

2. Used Car Buying Check
   - Best for validating decision hold, evidence memo, and item detail behavior.
   - Strong differentiator from a normal todo app.

3. Baby Food Start And Reaction Log
   - Best for validating routine dots, reaction log, and sensitive-source boundaries.
   - Higher safety burden, but useful for FLOW's long-term service identity.

## Rubric Snapshot

| Candidate | Need Fit | Execution | Fidelity | Portability | Load | Copy | Source/Safety | First Direction |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Moving | 5 | 4 | 4 | 5 | 3 | 4 | 3 | Good first demo |
| Used car | 5 | 4 | 3 | 5 | 4 | 4 | 3 | Strong product differentiator |
| Baby food | 5 | 4 | 4 | 5 | 3 | 4 | 3 | Strong, but needs caution UI |
| Driver license | 4 | 4 | 4 | 4 | 4 | 4 | 5 | Official admin candidate |
| Overseas travel | 4 | 3 | 4 | 4 | 4 | 4 | 5 | Memo-first candidate |
| Computer skills | 4 | 4 | 4 | 5 | 4 | 4 | 4 | Study table candidate |

Lowest common issue:
- Source safety is the main blocker for public exposure. Several candidates need exact official source confirmation before they can be treated as public MVP content.

