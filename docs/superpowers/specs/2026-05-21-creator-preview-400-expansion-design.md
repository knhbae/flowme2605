# Creator Preview 400+ Expansion Design

Date: 2026-05-21
Branch: `codex/flow-20-content-ux`

## Goal

Add 200+ more creator-side sample Flow entries while preserving the distinction between source-checked real Flow content and preview/sample content.

## Scope

- Expand generated creator-channel preview Flow bundles from 200 to at least 400.
- Keep the 20 real-source Flow bundles as `source_status: 'real'`.
- Keep newly expanded generated bundles as `source_status: 'preview'`.
- Improve creator profile browsing for larger libraries with search and visible result counts.

## Design

The current `topicTemplates` array in `lib/flow/creator-channel-preview.ts` creates 20 generated preview Flow entries for each of 10 preview channels. Add 20+ more templates to produce at least 400 preview Flow entries across the same 10 channels.

For UX, creator profile pages already have source and category filters. Add a text search filter over title, description, category, tags, and source title so a creator with 40+ flows can scan the library without paging.

## Validation

- Unit tests must assert at least 400 generated preview Flow bundles.
- Unit tests must assert each preview channel has at least 40 flows.
- E2E tests must assert the creator directory and channel page reflect the larger library.
- Production build and E2E should pass before deployment.
