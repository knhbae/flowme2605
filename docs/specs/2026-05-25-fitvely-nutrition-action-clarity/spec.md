# FITVELY Nutrition Action Clarity Spec

Date: 2026-05-25

## Problem

FITVELY nutrition exact-video Flows are sheet-first, but the visible action can still feel like "watch a video and record something." Exported rows and reminders must say what to do: choose one source rule, apply it once, record before/after response, and decide keep or stop.

## Scope

- Covered routes: seven FITVELY nutrition exact-video routes.
- Primary destination: `sheet`.
- Structure: one action, one source rule, one apply-before-after observation row.
- No new nutrition targets, generated diet plans, direct integrations, login, or native long-term tracking.

## Acceptance Criteria

- Item detail copy includes `첫 행동`, `적용 전 기록`, `적용 후 기록`, and `유지/중단 결정`.
- Completion criteria can be understood from an exported row or reminder without opening the full FLOW page.
- Workbench exposes route-specific observation columns for target action, selected source rule, before condition, after reaction, and keep-or-stop decision.
- Embedded tool copy says `적용 전후 관찰표`, not a generic record table.
- No validation claims are added.

## Figma

No Figma change is required because this batch changes generated content and table fields. Use the installed Figma plugin for a later source-rule selector or mobile workbench redesign.
