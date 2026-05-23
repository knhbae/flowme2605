# 2026-05-23 Source Risk Item Copy Polish

This pass follows [2026-05-23-source-replacement-risk-reshape.md](./2026-05-23-source-replacement-risk-reshape.md). PR #25 added artifact surfaces; this pass makes every item in the same twelve routes point to that surface with concrete `why`, `how`, `completion_criteria`, and risk boundary copy.

## FLOW Quality Note

| Flow | User need | Destination | Lowest points before | Key decision |
| --- | --- | --- | --- | --- |
| `computer-skills-d30-study` | Turn D-30 study tasks into score/error tracking. | Calendar + study logs | Item detail coverage and score-log linkage. | Add artifact-specific item details tied to the D-30 학습표 and 모의점수 로그. |
| `diet-habit-2week` | Observe two weeks of eating/activity without unsafe promises. | Spreadsheet | Generic completion and weak stop conditions. | Tie every item to the 2주 식사·활동 기록표 and expert-consult stop condition. |
| `new-car-delivery-check` | Record defects before signing or accepting delivery. | Decision table + proof memo | Evidence capture existed in surface but not in item copy. | Tie item completion to photos, dealer confirmation, and 인수 보류 status. |
| `year-end-tax-docs` | Submit company tax documents without implying deduction eligibility. | Memo/card + sheet export | Missing deadline and official-question copy. | Tie every item to company deadline, proof folder, and 국세청/company confirmation questions. |
| `diet-meal-exercise-log` | Record actual meals, exercise, and condition as observation. | Spreadsheet | Some items had no `why/how/done`. | Tie each item to 식사·운동·컨디션 관찰표 and abnormal-symptom stop condition. |
| `diet-reset-2week` | Find maintainable reset rules, not promise short-term weight loss. | Spreadsheet + review memo | Missing item-level safety boundary. | Tie each item to 2주 리셋 관찰표 and next-rule memo. |
| `business-registration-basic` | Prepare business registration questions before filing. | Official memo | Repeated generic official guidance. | Tie each item to 업종/사업장/인허가/세무서 question fields. |
| `happy-birth-service-check` | Prepare sensitive family data for official application. | Family-info memo | Repeated generic official guidance. | Tie each item to 출생일, 거주지, 계좌, 지원 항목 질문, and submission proof. |
| `industrial-accident-claim-docs` | Organize claim evidence without implying benefit eligibility. | Evidence memo/sheet | Repeated generic official guidance. | Tie each item to receipt file names, amount, 공단 questions, and supplement status. |
| `national-health-checkup-d7` | Prepare checkup questions safely before the appointment. | Calendar + medical question memo | Generic official detail and possible medical-instruction ambiguity. | Tie each item to institution questions for medication, fasting, transport, and result method. |
| `vaccination-certificate-issue` | Issue and submit a certificate without judging vaccination status. | Submission memo | Repeated generic official guidance. | Tie each item to target, language, submitter requirement, missing-record official check, and file location. |
| `job-change-risk-check` | Separate company, public insurance, and personal cash-flow questions. | Risk memo | Many empty details and weak financial/labor boundary. | Tie each item to company questions, public-agency checks, retirement pay, and gap-budget memo. |

## Representative Exposure Decision

These twelve routes should remain `reshape_before_featured`.

Reasons:
- Item copy and artifact destinations are now stronger, but several routes are sensitive medical, tax, labor, business, benefit, or financial workflows.
- No real user behavior evidence exists yet.
- The new copy polish is route-scoped and artifact-aware, but not a full item-by-item source rewrite.
- Representative promotion should wait for a follow-up pass that manually reviews the visible page top-to-bottom and confirms no source/risk mixing remains.

## Verification Intent

- Test coverage now rejects missing item details, repeated generic official guidance, and generic completion copy for these routes.
- The test also requires each item to point to an artifact, official question, proof/status record, or stop condition.
