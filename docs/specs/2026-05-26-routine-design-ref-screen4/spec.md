# Routine Design Reference Screen 4 Spec

Date: 2026-05-26

## Problem

Routine Flows need to propose a concrete action and a portable result immediately. The current routine UI shows a calendar-like area, but its copy reads as a generic preview and the export controls do not match the destination-first language in `design-ref/260526`.

## Scope

- Align routine calendar workbench copy with the design reference.
- Make repeated workout-video preview show a 4-week, 12-session calendar artifact.
- Keep the existing selected weekday model and export formats.
- Add screenshots for desktop and mobile.

## Out Of Scope

- Automatic schedule generation beyond the existing selected weekday preview.
- External app direct integration.
- Login, payment, community, or native long-term FLOW records.
- New source facts, movement sequences, or exercise prescriptions.
- Global redesign of every Flow export button.

## Acceptance Criteria

- Routine workbench exposes `반복 캘린더 · primary`.
- Routine workbench exposes `회차 메모 · secondary`.
- Routine calendar card shows `4주 반복 캘린더` and a session-count summary.
- Routine calendar export uses `캘린더에 넣기 · .ics`.
- Routine sheet backup uses `시트로 받기 · .xlsx`.
- Exact workout-video preview shows `운동 캘린더 · primary`, `4주 반복 운동 캘린더`, and `4주 12회차 미리보기`.
- No route is called validated.
