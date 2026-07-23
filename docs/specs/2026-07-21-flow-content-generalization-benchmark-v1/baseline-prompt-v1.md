# Frozen generation prompt v1

You receive one blind source packet. Use only that packet. Do not browse, infer from a provider reputation, or reconstruct missing rows from the title, snippet, duration, row count or stated user job.

The gold disposition, allowed Items and natural artifact are hidden. Return JSON only.

## Required order

```text
source completeness
→ generation disposition
→ exactly one role for every acquired SourceRow
→ four independent taxonomy axes
→ canonical Items only when executableAllowed=true
→ minimum user inputs
→ five projection decisions
→ independent access/rights/freshness/locale/safety/privacy/public gates
→ self-review
```

## Hard rules

1. `partial`, `metadata_only` or `missing` source cannot produce canonical Items or usable projection payloads.
2. Every acquired SourceRow ID appears exactly once as `item`, `field`, `memo`, `reference`, `conditional_response` or `omission`.
3. Every source-backed Item references at least one SourceRow ID.
4. Do not invent actions, dates, repeats, completion criteria, quantities or outcomes.
5. Do not turn warnings, thresholds, headings, marketing copy or missing-row markers into normal checklist Items.
6. Do not ask the user to re-enter source-derived values.
7. First useful preview requires no more than two consumer-owned values.
8. Calendar/ICS requires an actual schedule. A condition trigger is not a date.
9. Choose exactly one primary artifact from `calendar`, `checklist`, `todo`, `sheet`, `memo`; `hybrid` is forbidden.
10. Rights, source completeness, locale, safety, privacy and public promotion are independent gates.
11. A complete source may allow an internal draft while public export remains blocked.
12. When evidence is insufficient, stop with `source_import_required`, `hold` or `blocked` rather than filling gaps.

## Output shape

```json
{
  "schemaVersion": "flow-content-generalization-run-v1",
  "caseId": "blind-case-id",
  "processor": {
    "role": "rules|low_cost|high_capability",
    "modelOrAgent": "reported identity or role",
    "actualProviderApiUsed": false,
    "measuredInputTokens": null,
    "measuredOutputTokens": null,
    "elapsedMs": null,
    "retryCount": 0,
    "humanInterventionCount": 0
  },
  "sourceAssessment": {
    "completeness": "complete|partial|metadata_only|missing",
    "acquiredRowIds": [],
    "missingBoundary": []
  },
  "feasibility": {
    "flowPossible": false,
    "executableAllowed": false,
    "state": "ready|needs_confirmation|source_import_required|hold|blocked",
    "reason": "",
    "blockers": []
  },
  "classification": {
    "primaryLifeArea": null,
    "secondaryLifeAreas": [],
    "topicTags": [],
    "sourceShape": null,
    "primaryExecutionPattern": null,
    "primaryArtifact": null,
    "secondaryArtifacts": []
  },
  "sourceRowAssignments": [
    {"sourceRowId": "", "role": "item|field|memo|reference|conditional_response|omission", "reason": ""}
  ],
  "canonical": {
    "title": null,
    "items": [],
    "fields": [],
    "memos": [],
    "references": [],
    "conditionalResponses": []
  },
  "minimumInputs": [
    {"inputId": "", "owner": "creator|user", "semanticKey": "", "requiredBeforeFirstPreview": false, "reason": "", "consumerRefs": []}
  ],
  "projections": {
    "calendar": {"availability": "primary|secondary|fallback|blocked|not_applicable", "payload": null, "losses": []},
    "checklist": {"availability": "primary|secondary|fallback|blocked|not_applicable", "payload": null, "losses": []},
    "todo": {"availability": "primary|secondary|fallback|blocked|not_applicable", "payload": null, "losses": []},
    "sheet": {"availability": "primary|secondary|fallback|blocked|not_applicable", "payload": null, "losses": []},
    "memo": {"availability": "primary|secondary|fallback|blocked|not_applicable", "payload": null, "losses": []},
    "ics": {"eventCount": 0, "actionVisible": false}
  },
  "gates": {
    "access": "open|partial|account_required|unavailable",
    "rights": "open|link_only|permission_required|restricted|unknown",
    "freshness": "passed|review_required|unknown",
    "locale": "applicable|review_required|not_applicable",
    "safety": "not_required|review_required|blocked",
    "privacy": "not_required|review_required|blocked",
    "publicExportAllowed": false,
    "personalPreviewAllowed": false
  },
  "selfReview": {
    "uncertainties": [],
    "omissions": [],
    "potentialInventions": [],
    "sourceValueReentryCount": 0,
    "unscheduledIcsViolationCount": 0
  }
}
```

An Item must contain `itemId`, `intent`, `title`, `detail`, `completion`, nullable `schedule`, nullable `location`, `fields`, `conditions`, and `sourceRefs`. Its completion must be observable and source-supported; when the source only supports consumption, a `consume` Item may complete when the named source unit was consumed.

Do not report monetary cost unless an actual provider API call and current verified price were used. Role labels are not price evidence.
