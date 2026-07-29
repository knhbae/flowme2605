# Evidence Index

## Evidence Order

| Priority | Evidence | Kind | Use |
|---:|---|---|---|
| 1 | Current tracked product rules | `current_source` | canonical hierarchy, source boundary, projection rules |
| 2 | Current tracked Input Composer specs | `current_structured_evidence` | existing authoring states and interaction decisions |
| 3 | Qualified corpus snapshot | `local_uncommitted_snapshot` | actual source rows, Items, Steps, projections |
| 4 | Todo and Sheet snapshots | `local_uncommitted_snapshot` | portable output examples |
| 5 | Prior interactive HTML | `prior_design_artifact` | compare layouts and interactions only |
| 6 | External products | `reference_pattern` | adopt/adapt/reject interaction patterns |
| 7 | Agent simulation | `heuristic_simulation` | internal design hypothesis only |

## Current Tracked Contracts

| Artifact | Link | Use |
|---|---|---|
| Canonical Flow Data Model | [spec](../../specs/2026-07-11-canonical-flow-data-model/spec.md) | SourceRow -> Item -> Step -> Flow boundary |
| Source-to-Flow gate | [rule](../../flow-rules/source-to-flow-conversion-gate.md) | what may become an Item |
| Execution types | [rule](../../flow-rules/flow-execution-types.md) | execution semantics |
| Export fit | [rule](../../flow-rules/export-destination-fit.md) | Calendar, Sheet, Memo, Checklist destination fit |
| Quality rubric | [rule](../../flow-rules/quality-rubric.md) | content and execution quality |
| Quality gate | [rule](../../flow-rules/quality-gate.md) | reject/hold boundary |
| UX copy | [rule](../../flow-rules/ux-copy.md) | action and warning copy |
| Product principles | [document](../../PRODUCT_PRINCIPLES.md) | portable execution layer boundary |
| Service structure | [document](../../SERVICE_STRUCTURE.md) | current route and ownership baseline |
| Decisions | [document](../../DECISIONS.md) | durable settled decisions |
| Ideas | [document](../../IDEAS.md) | Obsidian-like workspace remains a gated idea |

## Existing Authoring Evidence

| Artifact | Link | Use |
|---|---|---|
| Input Composer Lab v1 | [spec](../../specs/2026-07-20-flowme-input-composer-lab-v1/spec.md) | 8 deterministic cases and three-column workbench |
| Input Composer UX v1.1 | [spec](../../specs/2026-07-21-flowme-input-composer-ux-v1-1/spec.md) | unified composer and result policy |
| Interaction spec | [document](../../specs/2026-07-21-flowme-input-composer-ux-v1-1/interaction-spec.md) | progressive fields and ownership |
| State model | [document](../../specs/2026-07-21-flowme-input-composer-ux-v1-1/state-model.md) | error and blocked states |
| URL output quality lab | [spec](../../specs/2026-07-20-url-to-flow-output-quality-lab-v2/spec.md) | source fidelity and no-invention boundary |
| Interactive Input Composer | [HTML](../2026-07-21-flowme-input-composer-ux-v1-1-ko.html) | prior design artifact |
| Content edit simulation | [HTML](../2026-07-14-flowme-content-edit-execution-simulation-ko.html) | source-backed personal editing |
| Content usage preview | [HTML](../2026-07-19-flow-content-usage-preview-ko.html) | artifact-specific result examples |

## Local Snapshot Evidence

These files were copied from local uncommitted planning outputs. They are not merged runtime
contracts.

| Artifact | Link | SHA-256 |
|---|---|---|
| Qualified corpus | [JSON](./local-evidence/qualified-corpus-v2/qualified-corpus-fixture-v2.json) | `338648484e18c558ecb7c61a2e3002689c54af89ff55b5de6bcb2718a2778260` |
| Projection matrix | [JSON](./local-evidence/qualified-corpus-v2/projection-matrix-v2.json) | `e7550b2e98b5c5f232ab3729c9a6aaa750c925a8d239a6c0ec7003b5e16b84aa` |
| Projection loss | [JSON](./local-evidence/qualified-corpus-v2/projection-loss-manifest-v2.json) | `ab36c712a75bada17d7f48be48e6ecaa02ec796bb0311028b8c3bb3d078639fe` |
| Input lineage | [JSON](./local-evidence/qualified-corpus-v2/input-lineage-v2.json) | `c381469d33c9eab9958868502ed011320ec3a59fc8aa7e2aa82c8a2bb6674924` |
| Round-trip results | [JSON](./local-evidence/qualified-corpus-v2/round-trip-results-v2.json) | `dff133259342dfb7c5168eb7ba17766de1b45e0d66f2719635f62c07c6ba0220` |
| User direction synthesis | [text](./local-evidence/flowme-user-feedback-synthesis-ko.txt) | `e7344d6f96a37a7d27660327e822e712aece13bb4de2a91e3f80c974665027c4` |
| Todo fixtures | [directory](./local-evidence/fixtures/todo/) | individual files retained unchanged |
| Sheet fixtures | [directory](./local-evidence/fixtures/sheet/) | individual files retained unchanged |

## What Not To Infer

- A local snapshot does not prove the runtime implements its model.
- A fixture does not prove a user can author or export it.
- An interactive HTML does not prove usability.
- A passing automated check does not prove observed-user success.
- A reference product pattern does not approve a FlowMe feature.
