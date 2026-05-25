# Mobile Export Surface Cleanup Audit

Date: 2026-05-26

## Finding

The sticky mobile export sheet is useful as a fallback, but it can become the user's primary path even when the first natural artifact is already visible. This separates the output from the action that moves it into a calendar, sheet, or memo.

## Target Routes

| Route | First artifact | Mobile CTA |
|---|---|---|
| `moving-d30-basic` | 실행 리스트 + 월간 캘린더 | `시트로 받기`, `캘린더로 받기` |
| `computer-skills-d30-study` | 공부 기록표 + 월간 캘린더 | `시트로 받기`, `캘린더로 받기` |
| `diet-habit-2week` | 관찰 기록표 | `시트로 받기` |
| `new-car-delivery-check` | 인수 증거표 | `시트로 받기` |

## Decision

Expose one short mobile destination CTA on the first artifact card where it is safe and not noisy. Keep accessible labels specific to the destination and artifact. Keep the sticky sheet as a fallback for later-page export access.

## Boundary

This is a Stage 0 operability improvement. It does not add direct integrations and does not validate route usefulness without real user behavior.
