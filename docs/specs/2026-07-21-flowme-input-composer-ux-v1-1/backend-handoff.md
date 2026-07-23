# Backend Handoff v1.1

This document describes UX-required data and events. It does not authorize a production provider, crawler, or database implementation.

## 1. Required records

### InputDraft

- draftId
- rawInput
- detectedKind + confidence
- user-corrected kind
- created/updated timestamps
- retention policy

### SourceSnapshot

- sourceId, original URL, canonical URL
- title/domain
- acquired scope and missing scope
- fingerprint/version
- access/rights/safety/locale state
- source rows and source references

### CreatorDraft / PublishedFlow

- Flow identity/version
- canonical Items
- projection eligibility and loss manifest
- source reference mapping
- review decisions

### UserOverlay

- user-local/personal identity
- Flow version reference
- personal title/values/include-exclude/notes
- must survive source update

### ExecutionRun

- stable Item identity
- status/progress/current position/occurrence
- completion/reopen history

### ExportReceipt

- format and scope
- selected Item IDs
- row/event count
- source/Flow version
- success/failure and fallback
- timestamp

## 2. Events

| Event | Trigger | Minimum payload | Ownership | Persist | Failure state | UX response |
|---|---|---|---|---|---|---|
| input_submitted | user requests detection | draftId, raw hash, length, entry context | user draft | short-lived | retryable_error | acknowledge without echoing sensitive content |
| input_kind_detected | type detection completes | draftId, kind, confidence, alternatives | system inference | with draft | provider_error/retryable | show human label + correction |
| source_scope_confirmed | user accepts scope | source candidate, included/missing sections | creator/source | yes | retryable_error | show confirmed count |
| existing_flow_selected | duplicate lookup chosen | Flow ID/version, source ID | published reference | optional analytics + recent | retryable_error | open user preview |
| proposal_reviewed | creator confirms/edits proposal | draft version, Item decisions, review outcome | creator | yes | retryable_error | show version-safe save |
| user_value_added | personal value changes | overlay ID, semantic field, value/version | user | yes | retryable_error | update artifact immediately |
| artifact_changed | user chooses eligible projection | overlay/draft, from/to, acknowledged loss | user preference | optional | retryable_error | recompute preflight |
| exported | export succeeds/fails | format, scope, Item IDs, count, result | user receipt | yes/limited | retryable_error | receipt or retry/fallback |
| saved_to_my_flow | personal Flow saved | overlay ID, Flow version, run ID, counts | user | yes | retryable_error | receipt + destination |
| source_import_requested | protected/partial source recovery | draft ID, import kind, consent, file metadata | creator/source | metadata yes; content policy-specific | provider_error | upload/parse progress |
| blocked_reason_viewed | user opens boundary detail | state category, source ID, allowed next actions | system/analytics | optional | none | no state change |
| source_update_detected | new source/Flow version | old/new versions, Item mapping summary | system | yes | retryable_error | compare prompt |
| source_update_reconciled | user accepts mappings | overlay ID, mapping decisions | user | yes | retryable_error | preserve run and update ref |
| draft_recovered | safe draft restored | draft ID, layers restored | user | no new record | none | recovery notice |

## 3. Response contract

Every asynchronous response needed by UX should return:

- public status category
- user-facing title/message key
- allowed primary action descriptor
- safe secondary action descriptors
- confirmed scope and missing scope
- eligible projections and loss summaries
- version/reference IDs
- retryability and preserved-data summary
- internal diagnostics in a separate non-rendered field

Do not return UI-ready internal enum strings as visible copy.

## 4. Failure contract

| Failure | Preserve | Do not claim | Recovery |
|---|---|---|---|
| detection/provider timeout | raw draft, prior kind | source found | retry or manual kind |
| source partial | acquired rows + missing list | complete Flow | confirm partial or import more |
| protected source | public metadata | actual tasks | authorized import |
| rights hold | private draft metadata | public approval | review queue/private save |
| safety hold | source scope, condition separation | executable safety guidance | review queue |
| export generation | selected format/scope | successful transfer | retry/copy fallback |
| My Flow save | overlay draft | persisted run | retry without duplicate identity |

## 5. Ownership and privacy

- Raw input retention must be explicit and minimal.
- Protected source files are not equivalent to public source content; retention and sharing require separate consent.
- User overlay and run data are personal and never written back into source/creator records.
- Analytics payloads use IDs/counts where possible rather than raw content.
- Source fingerprint and source-row IDs remain inspectable evidence but are hidden from normal UI.

## 6. Minimum implementation slice after this planning goal

Implement one end-to-end, reversible path before broad automation:

1. unified composer with deterministic URL/single/multiline detection and correction
2. canonical URL lookup against existing Flow inventory
3. `existing_flow_found` preview for moving + washer + one blocked Todoist fixture
4. one personal field per executable case (moving date / washer trigger)
5. artifact preflight and local export receipt
6. local My Flow save using separated overlay/run identity
7. retryable error and source import required states

Do not include new LLM generation, real crawling, or direct third-party integration in this first slice. The purpose is to prove the state/data contract and handoff loop.
