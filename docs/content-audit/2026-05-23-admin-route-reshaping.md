# 2026-05-23 Admin Route Reshaping

This document records the item/content/UX reshaping pass for the four audited `reshape_before_featured` exact-source routes from the needs-review source-fit batch.

## Batch Scope

| Flow | Natural Artifact Simulation | Previous Flow/UX Gap | Content/UX Reinforcement |
| --- | --- | --- | --- |
| `driver-license-renewal-check` | User inputs `면허=2종보통`, `만료일=2026-08-31`, `사진=필요`, `수령=시험장 방문`; expected output is a condition table for renewal type, health-check data, materials/fee, and application/pickup route. | The route had official source trust, but a flat checklist did not help users compare renewal versus 적성검사 conditions. | Added a route-specific comparison table and sharper item copy for license type, due date, health-check data, photo/ID/fee, and pickup path. |
| `family-certificate-issue` | User inputs `제출처=은행`, `종류=가족관계증명서`, `범위=상세`, `주민번호=뒷자리 비공개`; expected output is a submitter requirement memo and file/output location. | The checklist named the right decisions, but FLOW did not preserve the submitter requirement as a structured memo before export. | Added a memo-card workbench with fields for submitter requirement, certificate kind, detail scope, disclosure scope, and file/output location. |
| `resident-register-copy-issue` | User inputs `제출처=회사`, `서류=초본`, `주소변동=전체`, `주민번호=비공개`; expected output is a privacy/display checklist plus issued-file memo. | The route warned about display fields, but did not make disclosure scope and submitter requirements first-class user values. | Added a memo-card workbench with fields for document kind, address/household/military display, disclosure scope, issue date, and file location. |
| `qnet-exam-application-prep` | User inputs `시험일=2026-07-15`, `접수마감=2026-06-10 18:00`, `시험장=서울동부`; expected output is a calendar plus deadline log for application, payment, admission ticket, exam site, and result date. | The timeline used one exam-date anchor, so 접수마감, 결제, 수험표, 시험장 같은 보조 마감이 export에 식별되지 않았다. | Added log-table workbench fields for application/payment deadlines and exam-day records, and sharpened Q-Net item copy around deadline evidence. |

## Source/Risk Boundary

- Official facts remain attached through each route's `source_title`, `source_url`, item details, and warnings.
- User-entered requirements, disclosure choices, file locations, and deadline evidence are stored as workbench memo/log values.
- The routes remain `reshape_before_featured`; this pass improves direct-route execution value but does not claim real-user validation.

## Export Outcome

- Driver renewal comparison notes export through the existing candidate comparison section and workbook sheet.
- Certificate memo values export to `실행판 기록` in text and workbook formats using user-facing labels.
- Q-Net deadline records export to `실행판 기록` with row labels such as `원서접수 마감` and columns such as `마감/시점`, `상태/결정`, `증빙/메모`.

## Remaining Follow-Up

- Add true conditional filtering once FlowMe supports multiple user inputs per route.
- Add multi-deadline anchor fields for timeline routes instead of relying only on workbench log values.
- Consider the same memo-card pattern for passport, pet registration, and service-reservation routes that already have source-fit notes.
