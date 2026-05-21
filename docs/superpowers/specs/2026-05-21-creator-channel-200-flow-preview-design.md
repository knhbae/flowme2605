# Creator Channel 200+ Flow Preview Design

## Goal

Build a Vercel Preview that makes FLOW feel like a creator-channel product, not a lab board. The preview must show real creator/channel surfaces with 200+ flowified content entries, and enough execution UX to judge whether large creator libraries can be browsed, managed, opened, anchored, checked, copied, and exported.

This preview is not a claim that 200 external source articles/videos have been fully researched. It is a product prototype using real channel/source identities and generated Flow structures to validate the channel UX, library density, and execution model.

## Current Gap

The app already has:

- Public Flow routes at `/f/[slug]`
- Creator profile routes at `/u/[creator]`
- A Flow Lab at `/flow-lab`
- 31 published seed Flow bundles
- 10 real-content pilot Flows

The app does not yet have:

- A first-class creator channel index
- 200+ actual Flow routes inside creator channels
- Channel-scale filtering, series grouping, or quality signals
- UX that explains whether a creator's content library has been successfully flowified

## Recommended Approach

Use a preview-oriented implementation:

1. Add 10 creator channel profiles.
2. Generate at least 20 published Flow bundles per channel, for 200+ total Flow routes.
3. Keep each Flow executable with sections, items, source metadata, risk metadata, creator metadata, tags, usage counts, and copy counts.
4. Improve creator/channel UX around browsing and validation instead of treating the 200 entries as raw cards.
5. Add tests that lock the 200+ count and representative route behavior.
6. Deploy the result to Vercel Preview first.

This is the right balance for the current goal: it proves the product shape quickly without pretending that full external content research is already complete.

## Product Model

### Creator Channel

A creator channel represents one source identity or publishing identity. For the preview, each channel should include:

- `id`
- `slug`
- `name`
- `role`
- `bio`
- `avatar_initial`
- `specialty_tags`
- `source_url`
- `channel_type`: creator, official, brand, community, or curation
- `flow_count`
- `category_count`
- `execution_score`

The existing `FlowUser` model can be extended if needed, but the implementation should avoid a large persistence refactor.

### Flowified Content

Each flowified content entry should become a real `FlowBundle`, not just a candidate row.

Minimum fields:

- Stable slug
- Title
- Category
- Structure type: timeline, routine, checklist, or phase
- Anchor type
- Published status
- Source title and URL
- Creator metadata
- Risk level
- Tags
- At least 4 executable items
- Item details with why/how/completion criteria

For the first preview, generated items can use repeatable templates tailored by channel and structure. Sensitive categories must keep official/reference/experience separation clear.

## UX Design

### `/creators`

Add a creator channel index.

Primary jobs:

- Show that FLOW has multiple creator channels, not just individual public Flows.
- Let users compare channels by category, source type, Flow count, and execution readiness.
- Link clearly into `/u/[creator]`.

Suggested layout:

- Top summary strip: creators, published Flows, categories, average execution score.
- Filter bar: category, channel type, structure type, risk level.
- Dense channel list/cards with:
  - creator name
  - role
  - short bio
  - flow count
  - top categories
  - execution score
  - source link

### `/u/[creator]`

Upgrade creator profile into a channel dashboard.

Primary jobs:

- Make many Flows manageable.
- Show the channel as a portfolio of executable routes.
- Help users choose a Flow by intent, not by scanning 20+ cards.

Suggested layout:

- Channel header with profile, source link, stats, and tags.
- Validation panel:
  - Flowified content count
  - executable item count
  - anchor coverage
  - source coverage
  - risk/sensitive count
- Filters:
  - category
  - series
  - structure
  - anchor type
  - risk level
- Grouped Flow library:
  - series rows or category bands
  - compact Flow cards
  - sort by execution score, recent, copy count, or structure

### `/flow-lab`

Keep it as a validation/control room, but stop using it as the primary product surface.

Adjust copy so Phase 2 says:

- "200+ preview Flows generated for channel UX validation"
- not "200 content candidates" if those entries are now published Flows.

## Verification Design

### Automated

Add unit tests for:

- `seedBundles.length >= 200`
- at least 10 creator channels
- every preview channel has at least 20 published Flows
- every generated Flow has source metadata
- every generated Flow has executable items and completion criteria
- category and structure coverage

Add E2E tests for:

- `/creators` loads and shows 200+ aggregate count
- a creator channel shows 20+ Flows and filters work
- a generated Flow route opens, accepts an anchor if relevant, and updates progress
- source/risk information is visible on representative generated Flows

### Manual Preview Checks

Before Vercel Preview handoff:

- `npm test`
- `npm run build`
- `npm run test:e2e`
- Inspect `/creators`
- Inspect one creator channel with 20+ Flows
- Inspect at least two generated Flow routes

## Scope Boundaries

In scope:

- Static/generated seed data
- Creator channel index
- Improved creator channel detail UX
- 200+ published Flow bundles
- Tests and Vercel Preview deployment

Out of scope for this preview:

- Full external research for 200 unique source pages
- Login/auth changes
- Database migration
- Payment
- Real creator onboarding
- AI auto-publishing
- Production validation claims

## Success Criteria

The preview is successful when:

- Vercel Preview shows a creator-channel-first FLOW experience.
- Users can see 10+ channels and 200+ published Flow routes.
- A channel page with 20+ Flows remains scannable and usable.
- Representative generated Flows are executable, not just catalog entries.
- Tests protect the 200+ count, channel grouping, and route execution.

