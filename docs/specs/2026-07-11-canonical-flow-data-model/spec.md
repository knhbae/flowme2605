# Canonical Flow Data Model v1 Spec

**Date:** 2026-07-11<br>
**Status:** Approved contract; runtime implementation not started<br>
**Owner:** FlowMe product/engineering<br>
**Related roadmap:** URL-first backend prerequisite; source-backed content and My Flow execution contract

## Goal

FlowMe 콘텐츠를 ICS, 체크리스트, 시트, 메모 중 하나에 종속시키지 않고, 원문에서 파생된 최소 실행 단위와 사용자 수정·실행 상태를 안정적으로 보존하는 canonical data model v1을 확정한다. 이 계약은 URL 수집/AI 변환, source review, 저장소, My Flow, Calendar, export가 같은 의미를 공유하게 만드는 backend 선행 조건이다.

## Final Decision

```text
SourceRow -> Item -> Step -> Flow -> Bundle/Flow Map
                |
                +-> Calendar projection -> ICS
                +-> Checklist/Todo projection -> text/Markdown
                +-> Sheet projection -> CSV/TSV/XLSX
                +-> Memo projection -> text/Markdown
```

- **`Item` is the minimum stateful execution unit.** 독립적으로 완료, 결정, 기록, 보류, 일정 조정 상태를 가질 수 있는 가장 작은 단위다.
- **`SourceRow` is the minimum evidence unit.** Item이 어떤 원문 행에서 나왔는지 추적한다.
- **`Step` is a semantic grouping unit.** 원문 기간, 단계, 주차, 날짜 묶음, row group을 묶지만 Item 상태를 대신하지 않는다.
- **ICS is not a storage or content unit.** schedule이 있는 effective Item 또는 Item 묶음을 직렬화한 calendar projection이다.
- **Checklist is also a projection.** Step 아래 completion 가능한 Item을 보여주는 표현이다.
- `Field`는 일정, 정렬, 필터, 기록, export, 반복 생성에 필요한 값 정의다. 독립 완료 상태가 필요하면 Field가 아니라 Item이다.
- `Memo`는 방법, 수량, 링크, 예외, creator experience, caution, 개인 메모 prompt를 담는다. 순수 설명과 caution을 억지로 Item으로 만들지 않는다.
- 사용자용 content와 internal `ReviewRecord`는 분리한다.

This decision reopens and refines the 2026-06-22/26 bridge that treated Step as the minimum saved/exportable unit. That bridge remains a compatibility adapter, but new API, database, source conversion, and fixture contracts use `FlowSection -> Step`, `FlowItem -> Item`, and `FlowItemDetail -> Memo/Field/SourceRef`. The newer source-row portfolio contract proved that collapsing `Step.items[]` into one Step detail loses individual check state and provenance.

## Stage Fit

This is a data/specification slice. It does not add a database, account system, URL crawler, LLM provider, route, or visible hierarchy. It belongs before the URL-to-Flow backend because that backend otherwise has no stable output contract.

The first runtime implementation should stay behind an adapter and feature flag:

1. canonical content document,
2. projection into the current `FlowBundle`,
3. comparison against current exports,
4. only then server persistence and AI generation.

## User Need

As a person bringing a useful URL or reusing an existing Flow, I need every real action, date, decision, record field, source, and caution to survive editing and export, so that the same Flow remains trustworthy in My Flow, Calendar, a checklist, a spreadsheet, or a memo.

## Conversion Decision

- **User need:** outside content becomes a portable execution artifact without losing source or user changes.
- **Content shape:** timelines, routines, source checklists, tables/progress rows, procedures, decisions, single resources, memo-first guidance, and sparse official lifecycles.
- **Primary destination:** source/user-job dependent: calendar, checklist, sheet, memo, or hybrid.
- **Structure:** Bundle > Flow > Step > Item; Step groups, Item executes.
- **Action count:** source-derived; one real Item is valid and long source tables may contain many Items.
- **Playbook:** choose by source shape and natural destination, not category label.
- **Exceptions:** resource libraries without imported rows are `source_import_required`; non-local or unresolved sensitive sources are `hold`.
- **Risk/source handling:** Source/Snapshot/Row/Ref and Review remain distinct from user overlay/run state.

## Scope

### In

- Current category, structure, destination, item type, schedule, source, export, overlay, and version inventory.
- Canonical Bundle/Flow/Step/Item/Field/Memo/Source/Review definitions.
- Item schedule/completion/record/decision facets.
- Calendar/checklist/todo/sheet/memo projection rules.
- Content, review, user overlay, execution run, and version-resolution ownership.
- PostgreSQL/Supabase storage shape and API state contract.
- Existing model compatibility and localStorage migration plan.
- Positive and negative golden fixtures.
- Machine-readable TypeScript reference contract and fixture validator.

### Out

- Runtime replacement of `lib/flow/types.ts`.
- Supabase project creation, SQL migrations, Auth, RLS, or environment variables.
- Live URL fetcher, LLM provider, API keys, background worker, or auto-publish.
- App UI changes, new user-facing type tabs, direct Calendar/Sheets OAuth, or public content promotion.
- Destructive migration or deletion of current localStorage data.

## Evidence Baseline

Runtime inspection on the current worktree produced:

| Metric | Current result | Implication |
| --- | ---: | --- |
| Flow bundles | 593 | Model must bridge several generations of content. |
| Items | 3,064 | Migration must use stable Item identity and batch checks. |
| Sections | 781 | Existing `FlowSection` already matches grouping Step semantics. |
| Structure types | 258 checklist / 186 routine / 137 timeline / 12 phase | Four structure labels do not cover all execution semantics. |
| Distinct category strings | 90 | Category strings are not a canonical taxonomy. |
| Missing `primary_destination` | 464/593 | Export cannot be inferred from destination alone. |
| Real-source bundles | 66 | Golden fixtures should prioritize these and the July pre-app package. |
| Real-source Items | 264 | Source-backed migration can be canaried before the full 3,064 Items. |

Current strengths to preserve:

- `FlowBundle`, `FlowSection`, `FlowItem`, and `FlowItemDetail` already render and export useful content.
- stable Item IDs and detailed version review can detect title/detail/schedule/source conflicts.
- date windows avoid expanding an official eligibility period into daily tasks.
- personal copies preserve selected content and local edits.
- ICS folding and export test coverage already exist.

Current gaps the canonical contract closes:

- no first-class SourceSnapshot/SourceRow/SourceRef,
- item schedule, recurrence, date window, and personal overrides are distributed across several types,
- slug-specific Field definitions require code changes for new backend-generated content,
- `scheduled_task`, `routine_session`, `log_entry`, `decision_hold`, `memo_evidence`, and `reference_caution` mix orthogonal concerns,
- multiple export builders read different base/overlay combinations,
- map version detection does not use a full canonical content hash,
- old Step bridge can flatten several independently checkable source Items into text.

## Canonical Hierarchy

| Layer | Canonical responsibility | Required invariant |
| --- | --- | --- |
| Bundle / Flow Map | Optional discovery/publishing group | May contain several child Flows; does not own execution state. |
| Flow | One user job, one primary source, one primary natural artifact | At least one Step and one Item; one `primarySourceId`. |
| Step | Source period, phase, week, day, procedure group, or row group | Contains ordered Item IDs; grouping hint is not the authoritative schedule. |
| Item | Minimum independently stateful action | Has completion semantics and direct/user-request source support. |
| Field | Value needed for schedule/sort/filter/record/export/generation | Cannot become a fake action; owner and purpose are explicit. |
| Memo | Instruction, detail, experience, caution, hold template, or user prompt | Source-backed memo keeps SourceRef; user-entered memo value lives in overlay/run. |
| Source | Original identity and rights/risk metadata | Canonical URL does not replace the submitted original URL. |
| Snapshot | Immutable fetched/extracted source version | Has content hash and extractor version. |
| SourceRow | Smallest traceable source fact/row | Stable ID/order/locator within a snapshot. |
| SourceRef | Relation from content entity to source rows | Every publishable Item has at least one valid SourceRef. |
| Review | Internal quality/rights/risk/promotion record | Never appears in user content or export. |

The complete TypeScript reference contract is [canonical-flow-contract.ts](./canonical-flow-contract.ts).

## Category And Form Axes

Do not collapse these axes into one `category` or `structure_type` field.

### `lifeArea`

`home_living`, `family_parenting`, `study_reading`, `money_admin_purchase`, `health_fitness`, `travel_outings`, `meals_grocery`, `work_career`, `hobby_pet`.

This replaces 90 inconsistent category strings as the stable browse/reporting shelf. Localized category labels and freeform topic tags remain display metadata.

### `planningPattern`

`date_preparation`, `ordered_procedure`, `repeating_routine`, `source_table_rows`, `resource_queue`, `compare_decide`, `phase_lifecycle`.

This describes the source-to-execution structure and drives the default artifact. It is independent from life area.

### `primaryArtifact`

`calendar`, `checklist`, `todo`, `sheet`, `memo`, or `hybrid`.

`internal_check` is an existing runtime delivery label. Canonical content uses the natural artifact name `checklist`; the compatibility adapter may map it to `internal_check`.

### Item facets

Do not store current derived item labels as one primary enum.

| Existing label | Canonical interpretation |
| --- | --- |
| `scheduled_task` | Item has a non-recurring `schedule`. |
| `routine_session` | Item schedule has a recurrence. |
| `check_task` | Item uses check completion and no stronger decision/record behavior. |
| `log_entry` | Item intent is `record` and completion references record Fields. |
| `decision_hold` | Item intent is `decide` and completion contains decision options. |
| `memo_evidence` | Memo/Field facet; not a standalone execution type by default. |
| `reference_caution` | Caution Memo/SourceRef; never a standalone check Item unless acknowledgement is the real user job. |

A single Item can therefore be scheduled, recurring, checkable, recordable, and caution-bearing without losing data to a primary-type precedence rule.

## Item, Field, And Memo Boundary

### Item

Create an Item only when it is source-derived or explicitly user-requested and worth independent state.

An Item must have:

- stable `itemId`,
- parent Step,
- action-first title,
- intent,
- completion semantics,
- order,
- SourceRef,
- optional schedule, Fields, Memos, and caution Memos.

### Field

Create a Field only when a value is needed for scheduling, sorting, filtering, recording, export, or generation.

Examples:

- anchor date,
- next-review date,
- decision value,
- mock score,
- wrong-answer memo,
- retry date,
- target weekdays.

Do not create dedicated pain, mood, evidence, quantity, or reaction Fields merely because the source mentions them. Keep occasional context in Memo unless record management is the explicit source/job.

### Memo

Memo carries source detail and user context without pretending they are executable rows.

- method/preparation,
- quantities and ingredients,
- links and file names,
- creator experience,
- official boundary,
- caution/stop condition,
- exception and personal note prompt.

## Schedule Contract

`Item.schedule` is authoritative. Step may keep a human grouping hint only.

Supported schedule modes:

- `absolute`: fixed date/datetime,
- `anchor_offset`: e.g. D-30 from move date,
- `date_window`: official eligibility/renewal range with one reminder point,
- recurrence attached to absolute or anchor-offset schedule.

Rules:

- duration, recurrence, and eligibility window are different concepts.
- recurrence is structured data; ICS `RRULE` is generated later.
- official windows produce one reminder occurrence, not one task per eligible day.
- a source-defined interval stays source-defined; user editing is an overlay and never rewrites the source.
- timezone belongs to schedule/export data, not the visible default form unless time editing is required.

## Projection Contract

All projections read the same effective content: pinned published version + reviewed version resolution + user copy overlay + active run/occurrence state.

| Target | Eligible canonical data | Default granularity | Serialization |
| --- | --- | --- | --- |
| Calendar | Item with effective schedule, or a validated Step bundle whose Items share one schedule | Item; `step_bundle` only when the artifact is genuinely one event with nested checks | ICS |
| Checklist/Todo | Item with check or decision completion | Item grouped by Step | plain text / Markdown |
| Sheet | Item/occurrence plus Field values | Item or occurrence row | CSV / TSV / XLSX |
| Memo | Flow/Step/Item text, Memo, source, caution | Flow or Step document | plain text / Markdown |

### Projection invariants

- Unscheduled Item does not get an invented ICS date.
- ICS UID is based on stable Item ID + occurrence key, not title.
- Calendar event description keeps method, completion criterion, source, caution, and user memo needed to execute independently.
- Checklist preserves Step grouping and Item order.
- Sheet uses Item/occurrence as row and Field definitions as columns.
- Memo is the lossless fallback for content an external target cannot structure.
- Review score, provider/model metadata, source extraction internals, and rights notes never enter user export.
- The same Item may project to calendar, checklist, and sheet without becoming three canonical Items.

## Representative Projection Defaults

| Shape | Canonical model | Calendar | Checklist | Sheet | Memo |
| --- | --- | --- | --- | --- | --- |
| D-day timeline | dated Items grouped by source period | one event per dated Item | optional grouped rows | optional execution table | source/detail fallback |
| fixed routine | one recurring Item | recurring event/occurrences | session completion | optional light log | method/source/caution |
| source checklist | many check Items under Steps | only if user/source supplies a date; optionally one Step bundle | primary | optional checklist table | detail/source |
| progress/table | row Items with narrow record Fields | scheduled milestones only | optional | primary | source/context |
| decision/hold | decision Item + decision Fields | revisit date only | decision prompt, not a fake done check | comparison/decision row | hold reason/source |
| memo-first guidance | one real application Item plus Memo | only if scheduled | application check | only if record job exists | primary |
| official date window | one Item with date-window schedule | one reminder plus window text | minimal action | optional | official boundary |
| resource queue | imported resource rows become Items | one event per scheduled resource | queue | optional progress | resource link/detail |

## Ownership And Precedence

The merge order is deterministic:

```text
1. pinned immutable content version
2. reviewed version resolution
3. UserFlowCopy overlay
4. ExecutionRun state
5. occurrence-specific override
6. unsaved UI buffer (not canonical until saved)
```

| Value | Owner and precedence |
| --- | --- |
| source URL, source row, snapshot hash, official/creator boundary, caution | Published content; user/AI cannot overwrite or delete. |
| item inclusion, personal title, schedule, personal memo | User overlay wins on screen and export. |
| completion, skip, hold, decision, record value | Execution run owns it; content update cannot change it. |
| provider proposal | Temporary draft below source and user state. |
| review score/promotion status | Internal review only. |
| new published version | Never silently overwrites a saved copy; use three-way review. |

Stable Item IDs are required across versions. Added, changed, and removed Items are reviewed separately. Removed Items with personal state remain retained/orphaned until the user chooses to remove them.

Canonical content hashes use RFC 8785 JCS + SHA-256 over the semantic payload, excluding only top-level identity/version/lifecycle/timestamps and the hash field itself. Schedule, order, source rows/refs, caution, and projection profiles remain in the hash. The exact normalization contract is defined in [storage-api-contract.md](./storage-api-contract.md#33-canonical-hash-contract).

## Status Dimensions

Do not overload one `status` field.

| Dimension | Values |
| --- | --- |
| content lifecycle | `draft`, `in_review`, `published`, `retired` |
| conversion readiness | `ready_for_internal_canary`, `ready_second_wave`, `source_import_required`, `hold` |
| source acquisition | `ready`, `fetched`, `partial`, `unavailable`, `blocked`, `stale` |
| generation UX | `ready`, `generating`, `proposal`, `partial`, `failed`, `reviewed`, `saved` |
| execution | `pending`, `done`, `skipped`, `held` |
| update review | `up_to_date`, `minor_update_available`, `review_before_apply` |

## Source And Review Contract

- Each Flow has exactly one primary source controlling structure.
- Supporting sources may provide official boundaries, safety, or utilities but cannot silently add actions.
- Source identity, snapshot, row, and relation are separate objects.
- Each Item has a SourceRef to one or more SourceRows, except a private user-request Item explicitly marked `user_request`.
- `inferred_draft` cannot become published without human/source review.
- Omitted source rows carry explicit reasons.
- official facts, creator experience, cautions, rights, and user notes remain separate.
- Review keeps all eight quality scores and a comment for every score.

## Storage And API Contract

The detailed server contract is [storage-api-contract.md](./storage-api-contract.md). The summary is:

- immutable source snapshots and published content versions,
- versioned canonical content JSON plus stable indexed identity columns,
- separate conversion proposal/review storage,
- separate user copy/overlay/run state,
- projection endpoint that reads effective merged state,
- RLS preventing source body/review/internal generation data from leaking to public users,
- additive localStorage migration with shadow-write and rollback.

## Existing Model Mapping

| Current | Canonical v1 | Migration rule |
| --- | --- | --- |
| `SourceBackedMyFlowMap` | Bundle/Flow Map | grouping only; no Item state |
| `FlowBundle.flow` | Flow identity/version fields | preserve slug as legacy alias; mint stable Flow ID |
| `FlowSection` | Step | direct mapping |
| `FlowItem` | Item | direct mapping when independently stateful |
| `FlowItemDetail.why/how` | Memo and/or source-derived nested checks | do not auto-expand prose; expand only named checkable rows |
| `completion_criteria` | Item completion `doneWhen` | direct mapping |
| `day_offset` | anchor-offset schedule | preserve anchor field and offset |
| `date_window` | date-window schedule | one reminder occurrence |
| `repeat_rule` / `repeatRules` | structured recurrence | parse known RRULE subset; hold unsupported custom rules |
| `FlowItem.type` | derived projection eligibility | `calendar` is not a canonical Item type |
| derived `itemType` | Item facets | schedule/recurrence/intent/completion/Memo decide UI label |
| slug-specific `artifact-fields` | Field definitions | move schema into content data after canary |
| `MealSlot` / `Recipe` | source-table Items + Memo | preserve menu/date rows; recipe detail stays Memo |
| personal copy/item drafts/date overrides | UserFlowCopy overlay | consolidate with deterministic precedence |
| Flow run registry/checks/logs | ExecutionRun state | preserve occurrence and completion snapshot |
| source-fit/quality/update records | Review/VersionResolution | internal only |

### Legacy Step bridge

The 2026-06-22 bridge mapped Step to `FlowItem` and nested Item text to detail/export lines. Keep it only for legacy content that genuinely represents one bundled Step event. New canonical data and the July pre-app content use:

```text
FlowSection -> Step
FlowItem -> Item
```

Migration must not split a Step's prose into Items. Only explicit source rows that are independently checkable become Items.

## Migration Sequence

1. Add contract, fixtures, validator, and compatibility adapter tests; no storage change.
2. Project canonical fixtures to the current `FlowBundle` and compare Item counts and exports.
3. Canary the five `ready_for_internal_canary` July bundles; preserve 49 Items and source-row links.
4. Introduce repository interface and additive server schema behind `local | shadow-write | server-primary` flags.
5. Import local data as separate user copies/runs; never merge destructively with server records.
6. Make URL/AI backend emit canonical drafts only after runtime validation.
7. Move export builders to one effective-projection input; retain legacy builders until parity passes.

Rollback:

- keep current local read path,
- keep all local keys until the user explicitly deletes them,
- use immutable versions and additive DB migrations,
- soft-delete import batches only when no later server edits exist,
- turn off canonical/server flags without rewriting content.

## Golden Fixtures

[golden-fixtures-v1.json](./golden-fixtures-v1.json) covers:

1. D-day timeline,
2. one-Item fixed routine,
3. source checklist,
4. ordered phase/procedure,
5. table/progress,
6. memo-first execution,
7. decision/hold,
8. evidence/caution,
9. resource queue,
10. sparse official lifecycle/date window,
11. missing source-row negative gate,
12. non-local sensitive-source negative gate.

Every positive fixture declares expected and forbidden projections. Negative fixtures emit no canonical content.

## FlowMe Gates

| Gate | Decision |
| --- | --- |
| First user action | User brings/reuses a source and sees the natural artifact, not raw schema or ICS fields. |
| Completion signal | Every real action has independent state/source support and every applicable projection can be regenerated from the same effective model. |
| Artifact destination | Calendar, checklist/todo, sheet, memo, or hybrid; ICS is calendar serialization only. |
| Source/risk boundary | Source/Snapshot/Row/Ref and Review stay separate from user content/overlay/run. |
| Natural artifact | Representative fixture produces familiar calendar/checklist/sheet/memo output without invented structure. |
| Service structure impact | No runtime change in this slice; future repository/projection service must update `SERVICE_STRUCTURE.md`. |
| Tooling lane | `flow-content-conversion`; later runtime provider work adds security, DB, and browser/E2E lanes. |
| Verification | TypeScript contract compile, fixture validator, docs check, HTML desktop/mobile review. |

## Acceptance Criteria

- ICS and checklist are documented and tested as projections, not canonical minimum units.
- Item is the minimum independently stateful execution unit; SourceRow is the minimum evidence unit.
- Step groups Items and cannot hide independently checkable source rows in detail text.
- Category, planning pattern, primary artifact, and Item facets remain independent axes.
- All Item schedules, completion semantics, Fields, Memos, SourceRefs, and cautions have explicit ownership.
- Published content, review, user overlay, run state, and occurrence override have a deterministic precedence order.
- Versioning uses immutable content versions, stable Item IDs, content hashes, and explicit three-way user resolution.
- Existing runtime types and local keys have a non-destructive migration and rollback mapping.
- Storage schema, RLS boundary, API endpoints/state machine, concurrency, and idempotency are specified.
- At least ten positive/negative fixture shapes cover all named content forms and assert expected/forbidden projections.
- The fixture validator passes.
- The TypeScript reference contract compiles in strict mode.
- The Korean HTML review board is readable at 390px and desktop width without horizontal overflow.
- `npm.cmd run docs:check` passes.
- No app runtime, DB, API, LLM provider, public exposure, or user validation claim is added by this spec slice.

## Human Review Artifact

Open the [PPT-style Korean HTML presentation](../../content-audit/2026-07-12-flow-canonical-data-model-presentation-ko.html) for the easiest stakeholder walkthrough, or the [Canonical Flow 데이터 모델 검토판](../../content-audit/2026-07-11-flow-canonical-data-model-review-ko.html) for the detailed scannable decision board.
