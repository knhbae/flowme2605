# ThankyouBUBU Exact Video Reshape Spec

Date: 2026-05-25

## Problem

`real-thankyou-bubu-home-workout-starter` and `real-thankyou-bubu-20min-routine` now have exact YouTube sources, but their content still behaved like multi-step workout-plan flows. That made a single follow-along video feel like a user-designed routine and increased first-screen load.

## Goal

Reshape both routes into exact-video execution flows without inventing movement sequences.

## Requirements

- Keep each route source exact.
- Keep each route to one action and one item detail panel.
- Include `요약:`, `상세히 보기:`, `원본 영상:`, `운동 후 기록:`.
- Keep movement authority in the original YouTube link.
- Add explicit stop/consult conditions.
- Keep both routes out of representative, public-MVP, and validated claims.

## Non-Goals

- Automatic workout-plan generation.
- Native long-term workout records.
- External app integration beyond export/copy artifacts.
- Claiming validation from internal tests or screenshots.

