# Flow Spec Layer Harness

**Date:** 2026-05-23  
**Branch:** `codex/flow-spec-layer-harness`  
**PR URL:** https://github.com/knhbae/flowme2605/pull/21
**Status:** Open
**Deploy URL:** Not applicable

## Why

FlowMe already had an AI-agnostic harness, but larger work was still split between `docs/superpowers/` skill artifacts, roadmap notes, and PR history. The project needs a durable, tool-agnostic spec layer that keeps Stage 0 work focused while still allowing Codex, Claude, Gemini, Copilot, Cursor, or humans to use their own planning tools.

## What Changed

- Added `docs/specs/` as the durable location for committed multi-step specs.
- Added a reusable spec folder template covering `spec.md`, `plan.md`, `tasks.md`, and `qa.md`.
- Updated the SDLC to add a `Spec Gate` before planning and implementation.
- Added a `Spec Steward` role to keep specs focused and linked to generated tool artifacts.
- Updated QA rules for harness/process docs and spec-driven work.
- Updated docs checking so the new spec docs are required harness files.

## Not Done

- Did not migrate existing `docs/superpowers/` specs or plans.
- Did not change product behavior, seed content, UI, or tests.
- Did not add tool-specific instruction files such as `CLAUDE.md`, `GEMINI.md`, Cursor rules, or Copilot instructions.

## Decisions

- `docs/specs/` is the durable FlowMe-owned layer.
- `docs/superpowers/` remains valid as a tool-generated artifact archive.
- Roadmap entries should stay short and link to specs instead of copying implementation detail.
- PR history remains the final implementation memory after work is done.

## Files Touched

- `AGENTS.md`
- `docs/specs/README.md`
- `docs/specs/TEMPLATE.md`
- `docs/harness/README.md`
- `docs/harness/SDLC.md`
- `docs/harness/QA.md`
- `docs/harness/ROLES.md`
- `docs/ROADMAP.md`
- `docs/IDEAS.md`
- `scripts/check-docs.mjs`
- `docs/pr-history/2026-05-23-flow-spec-layer-harness.md`

## Verification

- `npm run docs:check`

## Risks

- Existing agents may still create plans in `docs/superpowers/`; this is acceptable as long as durable product direction links from `docs/specs/`.
- Future contributors may overuse specs for tiny changes; `docs/specs/README.md` now defines when not to create one.

## Follow-Ups

- For the next PR-sized feature, create the first live `docs/specs/YYYY-MM-DD-short-topic/` folder using the new template.
- If existing `docs/superpowers/` artifacts become active again, link them from the matching durable spec instead of moving old files.

## Links

- Spec layer guide: `docs/specs/README.md`
- Harness SDLC: `docs/harness/SDLC.md`
