# 2026-05-23 Source Replacement And Risk Review Batch

This document records the second `needs_review` manual audit pass after PR #19. It covers the 6 `source_replacement` routes and the 6 `risk_review` routes that remained in the Content Lab priority queue.

## Batch Outcome

Manual source-fit audits now cover 31 routes.

| Decision | Count |
| --- | ---: |
| `keep_representative` | 10 |
| `reshape_before_featured` | 20 |
| `catalog_preview_only` | 1 |
| `hide_from_public_catalog` | 0 |

The source needs-review priority queue is now empty:

| Priority | Count |
| --- | ---: |
| `audit_now` | 0 |
| `source_replacement` | 0 |
| `risk_review` | 0 |
| `content_backlog` | 0 |

All 12 audited routes remain direct-accessible but stay in lifecycle `fix` because each needs content or UX reshaping before stronger exposure.

## Source Replacement Routes

| Flow | Exact source | Natural artifact simulation | Current Flow/UX gap | Content action | UX action |
| --- | --- | --- | --- | --- | --- |
| `computer-skills-d30-study` | `2026 한 권으로 끝내는 시나공 컴활 1급 필기+실기` | `시험일=2026-07-18`, `평일학습=90분`, `취약영역=액세스` should create a D-30 study calendar and mock-score/error sheet. | Timeline exists, but score, wrong-answer type, and practical-file checks are weak. | Add 필기/실기 범위, 최신기출, 오답 재풀이, 실기 환경 criteria. | Show calendar and score/error sheet preview together. |
| `diet-habit-2week` | 질병관리청 `건강하게 체중 감량하기` | `시작일=2026-06-01`, `목표=야식 줄이기`, `운동가능=저녁 20분 걷기` should create a 2-week habit observation sheet. | Routine can be checked, but sheet-first recording and safety boundary are not prominent enough. | Ground items in official guidance: gradual goals, eating/activity/lifestyle records, expert consultation boundary. | Put warning and sheet preview before routine checklist. |
| `new-car-delivery-check` | 겟차 `신차 검수 체크리스트 완벽 가이드` | `인수일=2026-06-20`, `차량=아반떼 하이브리드`, `옵션=선루프/HUD` should create an inspection/evidence sheet. | Previous source was mismatched used-car content; photo evidence and dealer confirmation are weak. | Add exterior/interior/electronics/documents, photo filename, defect/dealer confirmation fields. | Add evidence sheet preview and defect-before-signing memo. |
| `year-end-tax-docs` | 국세청 `연말정산 간소화 서비스 개통 안내` | `회사제출마감=2026-01-23`, `부양가족=배우자/자녀1`, `추가증빙=월세/기부금` should create a company-submission sheet. | Broad Hometax URL did not anchor current official schedule or deduction caution. | Separate document collection from tax-deduction eligibility judgment. | Add deadline, final-data check date, and company submission columns. |
| `diet-meal-exercise-log` | 질병관리청 `건강하게 체중 감량하기` | `시작일=2026-06-03`, `기록기간=14일`, `운동=걷기 20분` should create a food/activity/condition sheet. | Record structure exists, but official source and warning separation were weak. | Treat the Flow as observation, not diet prescription; include pain/dizziness caution. | Pin warning and record purpose at the top of the sheet export. |
| `diet-reset-2week` | 질병관리청 `건강하게 체중 감량하기` | `시작일=2026-06-10`, `패턴=야식/간식`, `대체후보=물/산책` should create a reset observation sheet and next-rule memo. | Reset can read like a short-term weight-loss promise. | Emphasize no meal skipping, no extreme restriction, and 3 maintainable rules. | Add next-2-week rules memo preview at completion. |

## Risk Review Routes

| Flow | Official/risk basis | Safe user input and output | Natural artifact simulation | Current Flow/UX gap | Content/UX action |
| --- | --- | --- | --- | --- | --- |
| `business-registration-basic` | Hometax business registration document guidance; financial/admin sensitive. | User inputs 업종, 사업장, 임대차, 인허가 후보. FLOW outputs prep memo and official questions, not tax advice. | `업종=온라인 소매`, `사업장=자택`, `인허가=통신판매업 별도 확인` should create a filing-prep memo. | Checklist is useful, but 업종/세무 judgment boundary needs stronger separation. | Add official-confirmation question card and caution copy. |
| `happy-birth-service-check` | Gov24 Happy Birth service; family/childcare sensitive. | User inputs 출생일, 거주지, 보호자, 계좌 readiness. FLOW outputs application prep memo, not eligibility confirmation. | `출생일=2026-06-04`, `거주지=서울 마포구`, `계좌=부모급여 수령 계좌 확인` should create a family-info memo. | Region/household conditions and sensitive family info need clearer boundaries. | Add family-info warning and official-confirmation checklist at the top. |
| `industrial-accident-claim-docs` | Gov24 industrial accident medical expense claim; labor/financial sensitive. | User inputs 재해일, 병원, receipts, claim type. FLOW outputs evidence collection sheet, not benefit eligibility. | `재해일=2026-05-12`, `청구유형=요양비`, `영수증=3건` should create an evidence sheet. | Amount/file tracking and benefit-eligibility boundary are weak. | Add file name, amount, submission status, and supplement-request columns. |
| `national-health-checkup-d7` | NHIS 2025 health-check guide; medical sensitive. | User inputs 검진일, 기관, 내시경 여부, 복용약 여부. FLOW outputs prep calendar and medical-question memo. | `검진일=2026-06-19`, `수면내시경=예`, `복용약=혈압약` should create a D-7 prep calendar. | 금식/약/내시경 주의 could read like medical instruction. | Add clinician/institution confirmation memo and warning card. |
| `vaccination-certificate-issue` | Gov24 vaccination certificate; medical record sensitive. | User inputs 제출처, 대상자, language, needed items. FLOW outputs certificate-request memo, not vaccination-status judgment. | `제출처=어린이집`, `대상=자녀`, `언어=국문` should create a submission-requirements memo. | Missing-record handling and submitter requirements need clearer structure. | Add target/language/submission requirement cards. |
| `job-change-risk-check` | Experience checklist plus official employment/retirement-pay confirmation; financial/labor sensitive. | User inputs resignation/join dates, gap days, severance/employment insurance status. FLOW outputs personal risk memo and official questions. | `퇴사예정=2026-06-30`, `입사예정=2026-07-15`, `공백=14일` should create a gap/pay/insurance memo. | Financial/labor advice boundary is weak. | Separate company questions, public-agency checks, and personal finance memo. |

## Verification Notes

- Tests now assert 31 manual source-fit audits and 0 remaining source review priority items.
- Source replacement routes now use exact source metadata where the seed had broad or mismatched URLs.
- The batch records source/risk separation only. It does not implement the item-level UX reshaping described above.
