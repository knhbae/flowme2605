# Real Source Channel Batch Design

## Goal

Replace the first slice of the 200+ creator-channel preview library with real source-backed Flow content. The immediate batch should prove the conversion path without pretending that all 200 preview Flows have already been researched.

The batch target is 20 real source-backed Flows:

- 10 existing preview channels remain in place.
- Each channel gets 2 real source-backed Flows.
- The remaining generated Flows stay available as preview content.
- The UI clearly separates real source-backed Flows from preview-generated Flows.

## Why This Batch First

The previous preview proved channel density and routing. It did not prove that large real creator/source libraries can be collected, attributed, converted, and verified.

A 20-Flow source-backed batch is the right next step because it tests the full conversion loop at useful scale:

- source discovery
- source attribution
- Flow conversion quality
- sensitive category labeling
- channel management UX
- route execution behavior
- automated verification
- Vercel Preview deployment

Trying to convert all 200 immediately would make quality review weak and source freshness hard to trust.

## Source Mix

Use the current 10 preview channels as the container model:

| Channel | Batch target |
| --- | --- |
| Samsung Electronics Service | 2 official appliance-care Flows |
| ThankyouBUBU | 2 creator workout routine Flows |
| FITVELY | 2 diet or exercise tracking Flows |
| Sinagong | 2 certification-study Flows |
| Gov24 | 2 official life-administration Flows |
| Childcare portal | 2 official childcare or infant-care preparation Flows |
| Pet care note | 2 pet-care reference Flows |
| Ohouse living | 2 moving or home-care Flows |
| Travelholic | 2 travel-preparation Flows |
| Mobility life | 2 vehicle-care or mobility Flows |

Prefer official sources for procedural, safety, legal, administrative, childcare, and vehicle items. Creator or community sources can be used for lifestyle routines, but they must not be presented as official guidance.

## Data Model

Extend the static seed model without introducing persistent storage.

Add source validation metadata to `Flow`:

- `source_status`: `real`, `preview`, or `needs_review`
- `source_checked_at`: ISO date string
- `conversion_note`: short explanation of how the source was converted

Preview-generated Flows should be marked `source_status: preview`.

The new 20 real Flows should be marked:

- `source_status: real`
- `source_url`
- `source_title`
- `source_checked_at: 2026-05-21`
- channel owner metadata
- item-level source links where useful

## Conversion Rules

Each real source-backed Flow must:

- avoid copying source text as the body
- convert source material into executable steps
- include at least 5 executable items
- include item details for why, how, and completion criteria
- include source attribution at Flow level
- include item-level links for official or high-risk claims when useful
- preserve risk labels for health, safety, legal, financial, or administrative content
- avoid claiming user validation or outcome certainty

For creator content, the Flow can be inspired by the content's routine or structure, but the generated checklist text should be original and execution-oriented.

## UX Changes

### Creator Directory

Add aggregate separation:

- real source-backed Flow count
- preview-generated Flow count
- channels with at least one real Flow

Cards should expose whether a channel contains real source-backed content.

### Creator Channel Page

Add filters or tabs:

- All
- Real source-backed
- Preview-generated

Channel stats should distinguish:

- total Flow count
- real source-backed count
- preview count
- source coverage

Real source-backed Flow cards should show a compact badge such as `Source verified`.
Preview-generated Flow cards should show a compact badge such as `Preview`.

### Flow Lab

Update validation copy and metrics:

- show the 20 real batch count separately from the 200+ preview library
- show source-backed conversion coverage
- avoid wording that implies all 200 are real

## Verification

### Automated Tests

Add or update unit tests to assert:

- at least 20 Flows have `source_status: real`
- each preview channel has at least 2 real source-backed Flows
- every real Flow has `source_url`, `source_title`, and `source_checked_at`
- every real Flow has at least 5 executable items
- every real Flow has item details with completion criteria
- preview-generated Flows are marked `source_status: preview`

Add or update E2E tests to assert:

- `/creators` exposes real vs preview counts
- `/u/samsung-service` or another channel can filter to real source-backed Flows
- a representative real Flow route opens and is executable
- source/risk metadata remains visible on representative real Flows

### Manual Checks

Before deployment:

- `npm test`
- `npm run build`
- `npm run test:e2e`
- inspect `/creators`
- inspect one channel with the real filter enabled
- inspect one official real Flow
- inspect one creator-experience real Flow

After Vercel Preview deployment:

- verify `/creators` returns the real/preview counts
- verify one channel page renders real source-backed entries
- verify one real `/f/...` route opens without a not-found fallback

## Scope Boundaries

In scope:

- static source-backed seed data
- metadata additions
- creator directory/channel UX badges and filters
- Flow Lab count separation
- tests and Vercel Preview deployment

Out of scope:

- database persistence
- login or creator dashboard CRUD
- automatic scraping pipelines
- AI auto-publishing
- claiming all 200 preview Flows are real
- deep source monitoring or scheduled freshness checks

## Risks

- Source pages can change; the batch records checked dates but does not automate recrawling.
- Creator video content can be ambiguous; conversion notes must be explicit when a Flow is based on a creator routine rather than an official procedure.
- Sensitive categories need conservative wording and warnings.
- Some URLs may be platform landing pages instead of exact content pages if exact source pages are not stable; these should be marked `needs_review` rather than `real`.

## Acceptance Criteria

The batch is complete when:

- 20 real source-backed Flows are present.
- Every preview channel has at least 2 real source-backed Flows.
- The app still exposes 200+ total creator-channel Flows.
- Users can distinguish real source-backed Flows from preview-generated Flows.
- Tests and build pass.
- A Vercel Preview is deployed and spot-checked.
