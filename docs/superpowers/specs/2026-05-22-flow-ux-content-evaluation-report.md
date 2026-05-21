# Flow UX and Content Evaluation Report

**Round:** 2026-05-22 initial evaluation
**Harness:** `docs/harness/UX_CONTENT_EVALUATION.md`
**App target:** `http://127.0.0.1:3000`
**Source checked date:** 2026-05-22

## Selected Flows

| Flow | Reason |
| --- | --- |
| `moving-d30-basic` | D-day timeline, low-risk Stage 0 candidate |
| `baby-food-menu-recipe` | Meal plan, source trust, health-sensitive caution |
| `running-5k-4week` | Routine, missed-session recovery, exercise safety |
| `national-health-checkup-d7` | Official medical-sensitive timeline |
| `year-end-tax-docs` | No-anchor checklist, financial/admin source trust |

The first five cover timeline, phase/meal plan, routine, no-anchor checklist, creator/reference sources, official-sensitive sources, medical risk, financial risk, desktop, and mobile.

## Source Review Summary

| Flow | Source | Source purpose and trust boundary |
| --- | --- | --- |
| `moving-d30-basic` | https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363 | Practical moving checklist organized around D-30, D-10, D-3, D-1, and D-Day. It mixes task advice, service recommendations, and official-adjacent actions such as 전입신고/확정일자, so official actions need separate confirmation. |
| `baby-food-menu-recipe` | https://kimstar1021.tistory.com/63 | Parent experience post with early baby-food menu and recipe notes. It includes allergy-test and ingredient-order advice from personal experience, so FLOW must keep medical caution visible and avoid presenting timing or ingredients as universal. |
| `running-5k-4week` | https://www.runday.co.kr/ | Running-service reference for beginner training context. FLOW should use this as routine inspiration, not medical or coaching certainty; pain, dizziness, and existing illness cautions must remain close to action. |
| `national-health-checkup-d7` | https://www.nhis.or.kr/static/html/wbma/c/wbhaca04500_2025_1.pdf | Official NHIS health-checkup guide. The PDF emphasizes reservation, fasting, questionnaire, medicine/condition checks, and no self-driving after sedated endoscopy. FLOW should lead with 검진일 and official caution. |
| `year-end-tax-docs` | https://www.hometax.go.kr plus NTS guidance | Official tax services explain simplified year-end tax data, but users must judge eligibility and company rules. FLOW must separate checklist preparation from tax advice and avoid implying every exported or simplified item is deductible. |

## Initial Evaluation

### 이사 D-30 준비 Flow (`moving-d30-basic`)

**Persona:** Low-context renter moving for the first time, using a phone after work. They know the move date but do not know what should happen first or which tasks are official.
**Scenario:** Open the Flow, enter moving date, find first tasks, export or copy a checklist, and confirm where official items appear.
**Screenshots:** `test-results/ux-content-evaluation/moving-d30-basic-desktop-first.png`, `moving-d30-basic-mobile-first.png`

| Area | Score | Evidence |
| --- | ---: | --- |
| Understanding | 3 | Title and description explain moving date and D-30 execution. |
| Plain language | 2 | "기준 날짜" is generic; "이사일" is clearer but only appears after choosing custom input. |
| First-screen clarity | 2 | User can infer the purpose and next action, but the first card says "시작일 또는 종료일" instead of "이사일". |
| Moment-by-moment guidance | 3 | Next action and route overview are visible. |
| Content fit | 3 | Source D-day checklist maps well to sections. |
| Actionability | 3 | Tasks are concrete and checkable. |
| Anchor and timing | 2 | D-day logic is visible, but anchor language is generic. |
| Source and trust | 2 | Source/risk exists, but official actions are mostly inside item details. |
| Safety | 3 | Low risk; official items are tagged in details. |
| Exportability | 3 | Copy, Excel, and calendar export all fit. |
| Friction | 2 | Low-context user must learn "기준 날짜". |
| Recovery | 2 | Progress and check states are visible; no major recovery issue. |

**Required changes:**
- `[P2]` Make date-entry copy use the concrete anchor label, such as "입력할 날짜: 이사일".

### 초기 이유식 메뉴·레시피 Flow (`baby-food-menu-recipe`)

**Persona:** Low-context parent starting first baby food, anxious about allergies and unsure whether a blog menu is safe for their child.
**Scenario:** Open the Flow, check whether it is a recipe plan or medical guidance, enter start date, inspect the first menu, and look for reaction recording.
**Screenshots:** `test-results/ux-content-evaluation/baby-food-menu-recipe-desktop-first.png`, `baby-food-menu-recipe-mobile-first.png`

| Area | Score | Evidence |
| --- | ---: | --- |
| Understanding | 3 | Title and description clearly explain menu, new ingredients, recipes, and reaction records. |
| Plain language | 3 | Warning uses direct language about expert/official confirmation. |
| First-screen clarity | 3 | The most important medical caution is visible before controls. |
| Moment-by-moment guidance | 2 | Start-date card is generic, but the meal-plan purpose is clear. |
| Content fit | 2 | Personal source is correctly cautioned; recipe content is useful but should not become universal guidance. |
| Actionability | 3 | Menus, recipe links, and reaction logs are clear. |
| Anchor and timing | 2 | "기준 날짜" is generic; "이유식 시작일" should be visible before custom mode. |
| Source and trust | 3 | Creator experience and medical caution are visible. |
| Safety | 3 | Health warning is prominent. |
| Exportability | 3 | Calendar and Excel fit multi-day meal slots. |
| Friction | 2 | First card copy feels generic for a baby-food start date. |
| Recovery | 2 | Reaction log helps review; missed-day recovery is not central. |

**Required changes:**
- `[P2]` Make the date-entry card show "입력할 날짜: 이유식 시작일".

### 초보 러너 5km 4주 완주 Flow (`running-5k-4week`)

**Persona:** Average but low-confidence beginner who wants to start running, may overdo exercise, and needs simple recurrence guidance.
**Scenario:** Open the Flow, check safety warning, pick a start date and weekdays, find the first routine, and understand what happens if a session is missed.
**Screenshots:** `test-results/ux-content-evaluation/running-5k-4week-desktop-first.png`, `running-5k-4week-mobile-first.png`

| Area | Score | Evidence |
| --- | ---: | --- |
| Understanding | 3 | The title and description explain the 4-week 5km goal. |
| Plain language | 2 | Safety copy is clear; date card still says "시작일 또는 종료일". |
| First-screen clarity | 3 | Safety, routine type, weekday controls, and next path are visible. |
| Moment-by-moment guidance | 2 | First-screen "다음" summary says "없음" until routine view, which can feel empty. |
| Content fit | 2 | Routine is plausible but generic completion criteria repeat item titles. |
| Actionability | 3 | Routine items and weekday controls are actionable. |
| Anchor and timing | 2 | "운동 시작일" should be visible in the date card before custom mode. |
| Source and trust | 2 | Source is visible but collapsed; acceptable for reference content. |
| Safety | 3 | Caution and reset rule are visible. |
| Exportability | 2 | Calendar export is available, but routine calendar semantics are less obvious than timeline items. |
| Friction | 2 | "다음 없음" in the priority summary is confusing for a routine with visible tasks. |
| Recovery | 3 | Reset rule is visible. |

**Required changes:**
- `[P2]` Make the date-entry card show "입력할 날짜: 운동 시작일".
- `[P2]` Consider replacing routine "다음 없음" with "이번 주 루틴" or first routine section in a later pass.

### 국가건강검진 D-7 준비 Flow (`national-health-checkup-d7`)

**Persona:** Low-context user who received a health-checkup notice and wants to avoid missing fasting, medicine, or transport rules.
**Scenario:** Open the Flow, understand that the key date is the checkup date, enter that date, and verify official/safety guidance.
**Screenshots:** `test-results/ux-content-evaluation/national-health-checkup-d7-desktop-first.png`, `national-health-checkup-d7-mobile-first.png`

| Area | Score | Evidence |
| --- | ---: | --- |
| Understanding | 3 | Title and description explain 검진일 and D-7 preparation. |
| Plain language | 2 | Warning is clear; date-control wording is generic. |
| First-screen clarity | 2 | User can infer the checkup date from description, but the input card says "기준 날짜" and later labels the input as "기준 종료일". |
| Moment-by-moment guidance | 3 | Next actions are visible. |
| Content fit | 3 | Items match official guide topics: booking, fasting, questionnaire, medicine, transport. |
| Actionability | 3 | Tasks are concrete. |
| Anchor and timing | 1 | Health-checkup date should be named directly as "검진일". |
| Source and trust | 3 | Official source and medical caution are visible. |
| Safety | 3 | Sensitive warning is prominent. |
| Exportability | 3 | Calendar and Excel are appropriate. |
| Friction | 2 | "기준 종료일" is product jargon for a low-context health user. |
| Recovery | 2 | User can revisit source and checklist; no missed-task issue. |

**Required changes:**
- `[P1]` Replace generic health-checkup anchor label with "검진일" and show "입력할 날짜: 검진일" in the first card.

### 연말정산 서류 준비 Flow (`year-end-tax-docs`)

**Persona:** Low-context employee doing year-end tax settlement for the first time, worried about missing documents or claiming something incorrectly.
**Scenario:** Open the Flow, understand that no date input is required, check first tasks, copy/export the checklist, and confirm source/risk guidance.
**Screenshots:** `test-results/ux-content-evaluation/year-end-tax-docs-desktop-first.png`, `year-end-tax-docs-mobile-first.png`

| Area | Score | Evidence |
| --- | ---: | --- |
| Understanding | 3 | Title and warning explain tax-prep purpose and official/company confirmation. |
| Plain language | 2 | Warning is clear; "기준값 없음" is product jargon. |
| First-screen clarity | 1 | The first card says "기준 날짜 선택" but then says "기준값 없음"; this implies a missing setup step. |
| Moment-by-moment guidance | 2 | Next actions exist below, but first card creates confusion. |
| Content fit | 2 | Checklist fits official tax preparation; several item details could be richer later. |
| Actionability | 3 | Initial tasks are concrete. |
| Anchor and timing | 1 | This is no-anchor content, but the UI still frames it as a date setup. |
| Source and trust | 3 | Financial caution is visible. |
| Safety | 3 | Tax caution avoids certainty. |
| Exportability | 1 | "캘린더 파일 받기" appears even though the Flow has no dated entries. |
| Friction | 1 | Low-context user sees a date setup card with no date and a calendar export that likely has no useful events. |
| Recovery | 2 | User can continue to checklist, but initial setup feels broken. |

**Required changes:**
- `[P1]` For `anchor_type: none`, replace the first card with no-date copy such as "날짜 입력 없이 바로 확인합니다".
- `[P1]` Hide calendar export when a Flow has no dated schedule entries.

## Fix Plan

| Priority | Fix | Affected files | Verification |
| --- | --- | --- | --- |
| P1 | Show concrete anchor labels in the date-entry card, including `검진일` for health checkup. | `components/flow/AppClient.tsx`, `tests/e2e/flow-mvp.spec.ts` | Health-checkup E2E expects `입력할 날짜: 검진일` and `getByLabel('검진일')`. |
| P1 | For no-anchor checklist Flows, remove date-selection framing and show no-date copy. | `components/flow/AppClient.tsx`, `tests/e2e/flow-mvp.spec.ts` | Tax E2E expects `날짜 입력 없이 바로 확인합니다` and no `캘린더 파일 받기`. |
| P1 | Hide calendar export button when the Flow has no dated calendar entries. | `components/flow/AppClient.tsx`, `tests/e2e/flow-mvp.spec.ts` | Tax E2E verifies no calendar export button; moving Flow still verifies calendar export. |
| P2 | Make date-entry card use concrete labels for moving, baby food, and running. | `components/flow/AppClient.tsx`, `tests/e2e/flow-mvp.spec.ts` | Existing moving/routine tests continue passing; new text is visible. |

## Re-evaluation

**Round:** 2026-05-22 after implementation
**Screen artifacts:** `artifacts/ux-content-evaluation/2026-05-22/` (local QA output, not committed)
**Signal file:** `artifacts/ux-content-evaluation/2026-05-22/screen-signals-after.json`

### Implemented Changes

| Priority | Change | Result |
| --- | --- | --- |
| P1 | Date-entry cards now name the real user input: `이사일`, `이유식 시작일`, `운동 시작일`, `검진일`. | Low-context users no longer need to infer what "기준 날짜" means. |
| P1 | No-anchor checklist Flows now say `날짜 입력 없이 바로 확인합니다.` and show an action-oriented checklist instruction. | Tax checklist no longer looks like a broken date setup. |
| P1 | Calendar export is hidden when a Flow has no dated calendar entries. | `year-end-tax-docs` no longer offers an empty calendar file. |
| P2 | Routine Flows now fall back to the first unfinished routine items for the "next action" panel. | Running Flow no longer risks communicating that there is no next task. |
| P2 | Exam/certificate Flows use `시험일` instead of the generic `목표일` fallback. | Q-Net pilot Flow now uses the domain label a low-context user expects. |

### After Screens

| Flow | Desktop | Mobile |
| --- | --- | --- |
| `moving-d30-basic` | `artifacts/ux-content-evaluation/2026-05-22/moving-d30-basic-desktop-after.png` | `artifacts/ux-content-evaluation/2026-05-22/moving-d30-basic-mobile-after.png` |
| `baby-food-menu-recipe` | `artifacts/ux-content-evaluation/2026-05-22/baby-food-menu-recipe-desktop-after.png` | `artifacts/ux-content-evaluation/2026-05-22/baby-food-menu-recipe-mobile-after.png` |
| `running-5k-4week` | `artifacts/ux-content-evaluation/2026-05-22/running-5k-4week-desktop-after.png` | `artifacts/ux-content-evaluation/2026-05-22/running-5k-4week-mobile-after.png` |
| `national-health-checkup-d7` | `artifacts/ux-content-evaluation/2026-05-22/national-health-checkup-d7-desktop-after.png` | `artifacts/ux-content-evaluation/2026-05-22/national-health-checkup-d7-mobile-after.png` |
| `year-end-tax-docs` | `artifacts/ux-content-evaluation/2026-05-22/year-end-tax-docs-desktop-after.png` | `artifacts/ux-content-evaluation/2026-05-22/year-end-tax-docs-mobile-after.png` |

### Re-test Matrix

| Flow | Re-evaluation result | Evidence |
| --- | --- | --- |
| `moving-d30-basic` | Pass | Desktop and mobile contain `입력할 날짜: 이사일`; calendar export remains available because dated entries exist. |
| `baby-food-menu-recipe` | Pass | Desktop and mobile contain `입력할 날짜: 이유식 시작일`; health caution remains above the setup controls. |
| `running-5k-4week` | Pass | Desktop and mobile contain `입력할 날짜: 운동 시작일`; `추천 다음 항목` exists for the next-action panel. |
| `national-health-checkup-d7` | Pass | Desktop and mobile contain `입력할 날짜: 검진일`; E2E verifies custom `검진일` input calculates `2026-06-13` from `2026-06-20`. |
| `year-end-tax-docs` | Pass | Desktop and mobile contain no-date setup copy and checklist action guidance; calendar export is absent. |

### Verification

Targeted regression:

```text
npm.cmd run test:e2e -- --grep "routine flow highlights weekly routine setup|low-context date labels|no-anchor checklist"
3 passed
```

**Verdict:** The second pass has no remaining P0/P1 UX or content-readiness issues for the selected representative Flows. The process is reusable through `docs/harness/UX_CONTENT_EVALUATION.md`; future passes should expand the sample when new Flow types or new sensitive domains are added.
