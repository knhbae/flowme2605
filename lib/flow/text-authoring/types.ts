export const TEXT_AUTHORING_SCHEMA_VERSION =
  "flowme-text-authoring-v2" as const;
export const TEXT_AUTHORING_PARSER_VERSION =
  "flowme-text-authoring-parser-v2" as const;
export const TEXT_AUTHORING_LEGACY_SCHEMA_VERSION =
  "flowme-text-authoring-v1" as const;
export const TEXT_AUTHORING_LEGACY_PARSER_VERSION =
  "flowme-text-authoring-parser-v1" as const;

export type TextAuthoringSchemaVersion =
  | typeof TEXT_AUTHORING_SCHEMA_VERSION
  | typeof TEXT_AUTHORING_LEGACY_SCHEMA_VERSION;
export type TextAuthoringParserVersion =
  | typeof TEXT_AUTHORING_PARSER_VERSION
  | typeof TEXT_AUTHORING_LEGACY_PARSER_VERSION;

export type TextAuthoringOwnership = "personal" | "creator" | "suggestion";
export type AuthoringValueOwner = "source" | TextAuthoringOwnership;
export type AuthoringRevisionActor = TextAuthoringOwnership | "system";

/**
 * One Inspector submission expressed as the supported canonical v2 Item fields.
 * The operation that consumes this patch rewrites one root Markdown checkbox
 * Item atomically, so callers must send the complete current form value rather
 * than a partial field delta.
 */
export type AuthoringWorkingTextItemPatch = {
  title: string;
  detail: string;
  completion: string;
  date: string;
  relativeDate: string;
  time: string;
  timezone: string;
  place: string;
  duration: string;
  repeat: string;
  repeatEnd: string;
  condition: string;
  resource: string;
  source: string;
  guide: string;
  caution: string;
};

export type AuthoringInputKind =
  "plain_text" | "markdown" | "table" | "url" | "mixed";

export type AuthoringConfidenceBand = "high" | "medium" | "low";

export type AuthoringTargetKind =
  | "flow"
  | "step"
  | "item"
  | "detail"
  | "completion"
  | "field"
  | "resource"
  | "guide"
  | "caution"
  | "source"
  | "unresolved";

export type AuthoringItemIntent =
  "act" | "inspect" | "decide" | "record" | "use_resource";

export type AuthoringArtifact =
  "calendar" | "checklist" | "todo" | "sheet" | "memo";

export type AuthoringSourceRange = {
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
};

/** Exact locator for a byte-preserved source slice. Offsets use JS string units. */
export type AuthoringSourceLocator = AuthoringSourceRange & {
  rawHash: string;
  byteExact: true;
};

export type AuthoringInputBudgetLimits = {
  utf8Bytes: number;
  lines: number;
  logicalCells: number;
};

export type AuthoringInputBudgetAssessment = {
  utf8Bytes: number;
  lineCount: number;
  logicalCellCount: number;
  limits: AuthoringInputBudgetLimits;
  exceeded: Array<"bytes" | "lines" | "cells">;
};

export type AuthoringLongDocumentBlockKind =
  | "blank"
  | "prose"
  | "blockquote"
  | "code_fence"
  | "html"
  | "comment"
  | "table";

export type AuthoringLongDocumentBlock = {
  blockId: string;
  kind: AuthoringLongDocumentBlockKind;
  rawText: string;
  locator: AuthoringSourceLocator;
  sourcePreserved: true;
};

export type AuthoringLongDocumentTableState =
  "table-safe" | "table-loss-risk" | "table-invalid";

export type AuthoringLongDocumentTableCell = {
  cellId: string;
  rowIndex: number;
  columnIndex: number;
  value: string;
  rawText: string;
  locator: AuthoringSourceLocator;
  sourcePreserved: true;
};

export type AuthoringLongDocumentTableRow = {
  rowId: string;
  rowIndex: number;
  kind: "header" | "separator" | "body";
  values: string[];
  rawText: string;
  locator: AuthoringSourceLocator;
  cells: AuthoringLongDocumentTableCell[];
  sourcePreserved: true;
};

export type AuthoringLongDocumentTable = {
  tableId: string;
  format: "csv" | "tsv" | "markdown";
  state: AuthoringLongDocumentTableState;
  headers: string[];
  rows: string[][];
  sourceRows: AuthoringLongDocumentTableRow[];
  logicalCellCount: number;
  rawText: string;
  locator: AuthoringSourceLocator;
  sourcePreserved: true;
  issues: string[];
};

export type AuthoringLongDocumentLossReason =
  | "non-executable-table"
  | "table-loss-risk"
  | "table-invalid"
  | "too-large"
  | "feature-gate-off";

export type AuthoringLongDocumentLoss = {
  lossId: string;
  contractVersion: "p1-c-long-document-v1";
  result: "calendar" | "todo" | "sheet";
  reason: AuthoringLongDocumentLossReason;
  message: string;
  locator?: AuthoringSourceLocator;
  documentId?: string;
  workingRevisionId?: string;
  tableId?: string;
  tableFormat?: AuthoringLongDocumentTable["format"];
  delimiter?: "," | "\t" | "|";
  rowCount?: number;
  cellCount?: number;
  fallback: "txt-raw-preserved";
  blocked: boolean;
  sourcePreserved: true;
};

export type AuthoringTableLossRisk = "none" | "possible" | "confirmed";

export type AuthoringTableLossCount = {
  rows: number;
  cells: number;
  rowAccuracy: "exact" | "lower-bound";
  cellAccuracy: "exact" | "lower-bound";
};

export type AuthoringTableLossPreservedShape =
  | "raw-source"
  | "line-endings"
  | "blank-lines"
  | "prose"
  | "blockquote"
  | "code-fence"
  | "html"
  | "comment"
  | "table-raw"
  | "table-row-boundaries"
  | "table-cell-boundaries";

export type AuthoringTableLossUnsupportedShape =
  | "calendar-from-factual-table"
  | "todo-from-factual-table"
  | "unsafe-sheet-shape"
  | "multiple-table-sheet"
  | "structured-results-over-budget"
  | "structured-results-gate-off";

export type AuthoringTableLossFallback =
  "raw-txt" | "source-download" | "source-edit";

export type AuthoringTableBlockLossManifest = {
  blockManifestId: string;
  documentId?: string;
  workingRevisionId?: string;
  tableId: string;
  tableState: AuthoringLongDocumentTableState | "budget-blocked";
  format: AuthoringLongDocumentTable["format"];
  delimiter: "," | "\t" | "|";
  encoding: "utf-8";
  sourceRange: AuthoringSourceLocator;
  counts: {
    source: AuthoringTableLossCount;
    parsed: AuthoringTableLossCount;
    preserved: AuthoringTableLossCount;
  };
  preservedShapes: AuthoringTableLossPreservedShape[];
  unsupportedShapes: AuthoringTableLossUnsupportedShape[];
  risk: AuthoringTableLossRisk;
  affectedArtifacts: Array<"calendar" | "todo" | "sheet">;
  fallbacks: AuthoringTableLossFallback[];
  generatedAt: null;
  generatedAtPolicy: "deterministic-analysis-no-timestamp";
  sourcePreserved: true;
};

/**
 * Deterministic, authoritative P1-C loss account. It deliberately has no
 * generated timestamp: the same source and options must produce the same
 * analysis, while lifecycle time remains owned by the surrounding revision.
 */
export type AuthoringTableLossManifest = {
  manifestId: string;
  contractVersion: "p1-c-table-loss-v1";
  scope: "document";
  encoding: "utf-8";
  documentId?: string;
  workingRevisionId?: string;
  tableIds: string[];
  sourceRange: AuthoringSourceLocator;
  detectedFormats: AuthoringLongDocumentTable["format"][];
  delimiters: Array<"," | "\t" | "|">;
  counts: {
    source: AuthoringTableLossCount;
    parsed: AuthoringTableLossCount;
    preserved: AuthoringTableLossCount;
  };
  preservedShapes: AuthoringTableLossPreservedShape[];
  unsupportedShapes: AuthoringTableLossUnsupportedShape[];
  risk: AuthoringTableLossRisk;
  affectedArtifacts: Array<"calendar" | "todo" | "sheet">;
  fallbacks: AuthoringTableLossFallback[];
  generatedAt: null;
  generatedAtPolicy: "deterministic-analysis-no-timestamp";
  tableBlocks: AuthoringTableBlockLossManifest[];
  entries: AuthoringLongDocumentLoss[];
  sourcePreserved: true;
};

export type AuthoringLongDocumentStatus =
  | "raw-preserved"
  | "partially-structured"
  | "result-specific-blocked"
  | "txt-only";

export type AuthoringLongDocumentAnalysis = {
  status: AuthoringLongDocumentStatus;
  featureEnabled: boolean;
  fallbackActive: boolean;
  sourceHash: string;
  budget: AuthoringInputBudgetAssessment;
  blocks: AuthoringLongDocumentBlock[];
  tables: AuthoringLongDocumentTable[];
  lossManifest: AuthoringLongDocumentLoss[];
  tableLossManifest: AuthoringTableLossManifest;
  sourcePreserved: true;
};

/**
 * Immutable captured source unit. Creator corrections never overwrite this row.
 */
export type AuthoringSourceRow = {
  sourceRowId: string;
  documentId: string;
  state?: "active" | "tombstone";
  sourceSnapshotId?: string;
  rowType:
    | "heading"
    | "check"
    | "table_row"
    | "procedure"
    | "resource"
    | "reference"
    | "property"
    | "unsupported";
  rawText: string;
  sourceRange: AuthoringSourceRange;
  order: number;
};

export type AuthoringBlock = {
  blockId: string;
  documentId: string;
  state?: "active" | "tombstone";
  sourceSnapshotId?: string;
  parentBlockId?: string;
  order: number;
  depth: number;
  sourceRange: AuthoringSourceRange;
  rawText: string;
  normalizedText: string;
  interpretedRole: AuthoringTargetKind;
  confidenceBand: AuthoringConfidenceBand;
  included: boolean;
};

export type BlockToCanonicalMapping = {
  mappingId: string;
  blockIds: string[];
  targetKind: AuthoringTargetKind;
  targetDraftId: string;
  sourceLineage: string[];
  userCorrected: boolean;
};

export type AuthoringIssueOutcome =
  "keep_source_only" | "convert_to_item" | "hold";

export type AuthoringIssueState = "open" | "held" | "resolved";

export type AuthoringReviewKind = "rights" | "safety";
export type AuthoringReviewGateStatus =
  "required" | "evidence_recorded" | "personal_only";

export type AuthoringReviewRequirement = {
  kind: AuthoringReviewKind;
  reasonKey?: string;
  sourceRowIds?: string[];
};

export type AuthoringReviewGate = {
  gateId: string;
  kind: AuthoringReviewKind;
  status: AuthoringReviewGateStatus;
  sourceSnapshotId: string;
  sourceRowIds: string[];
  reasonKey: string;
  evidenceNote?: string;
  actorLane?: TextAuthoringOwnership;
  decidedAt?: string;
};

export type AuthoringWriteAction =
  | "save_local_draft"
  | "export_file"
  | "request_creator_review"
  | "submit_suggestion";

export type AuthoringWriteBlocker = {
  kind: "review_gate" | "source_update" | "authoring_issue" | "ownership_lane";
  code: string;
  id?: string;
  message: string;
};

export type AuthoringWritePolicyResult = {
  action: AuthoringWriteAction;
  allowed: boolean;
  needsReview: boolean;
  blockers: AuthoringWriteBlocker[];
};

export type AuthoringIssueDecision =
  | {
      outcome: "keep_source_only";
      state: "resolved";
      targetKind: "source";
      actorLane: TextAuthoringOwnership;
      decidedAt: string;
    }
  | {
      outcome: "convert_to_item";
      state: "resolved";
      targetKind: "item";
      targetDraftId: string;
      actorLane: TextAuthoringOwnership;
      decidedAt: string;
    }
  | {
      outcome: "hold";
      state: "held";
      targetKind: "unresolved";
      actorLane: TextAuthoringOwnership;
      decidedAt: string;
    };

export type UnresolvedAuthoringIssue = {
  issueId: string;
  type:
    | "unsupported_syntax"
    | "unknown_property"
    | "unsupported_nested_item"
    | "ambiguous_role"
    | "missing_parent"
    | "invalid_date"
    | "invalid_url"
    | "invalid_recurrence"
    | "source_import_required"
    | "rights_review_required"
    | "safety_review_required";
  sourceRange: AuthoringSourceRange;
  sourceRowIds: string[];
  messageKey: string;
  options: AuthoringTargetKind[];
  blocking: boolean;
  /** Canonical Item affected by a source-backed validation issue. */
  itemId?: string;
  /** Exact user input retained for an actionable validation message. */
  inputValue?: string;
  /** Expected grammar retained without correcting the source silently. */
  expectedFormat?: string;
  decision?: AuthoringIssueDecision;
  /**
   * Legacy resolution shape retained for stored v1 documents.
   * New issue decisions are written to `decision`.
   */
  resolution?: {
    targetKind: AuthoringTargetKind;
    resolvedAt: string;
  };
};

export type AuthoringSchedule =
  | {
      kind: "relative";
      raw: string;
      dayOffset: number;
      anchorLabel?: string;
      time?: string;
      timezone?: string;
      durationMinutes?: number;
      repeat?: string;
    }
  | {
      kind: "absolute";
      raw: string;
      date: string;
      time?: string;
      timezone?: string;
      durationMinutes?: number;
      repeat?: string;
    };

export type AuthoringWeekday = "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA";

export type AuthoringRecurrenceEnd =
  | {
      mode: "count";
      count: number;
      raw: string;
    }
  | {
      mode: "until";
      date: string;
      raw: string;
    };

/**
 * Deterministic subset of the author-facing recurrence grammar. The original
 * Item remains one canonical Item; occurrence rows are derived projections.
 */
export type AuthoringRecurrenceRule = {
  raw: string;
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  weekdays?: AuthoringWeekday[];
  dayOfMonth?: number;
  /** Missing end means an open-ended series. */
  end?: AuthoringRecurrenceEnd;
  /** Display-only memo. It never filters or executes an occurrence. */
  executionCondition?: string;
  sourceRowIds: string[];
};

export type AuthoringSubcheck = {
  subcheckId: string;
  title: string;
  sourceChecked: boolean;
  order: number;
  sourceRowIds: string[];
  owner: AuthoringValueOwner;
};

export type AuthoringLink = {
  label: string;
  url: string;
  type?: "official" | "reference" | "tool" | "creator";
  owner?: AuthoringValueOwner;
  sourceRowIds: string[];
};

export type AuthoringProperty = {
  propertyId: string;
  key:
    | "date"
    | "relative_date"
    | "time"
    | "timezone"
    | "place"
    | "duration"
    | "repeat"
    | "condition"
    | "resource"
    | "source"
    | string;
  label: string;
  value: string;
  sourceRowIds: string[];
  owner: AuthoringValueOwner;
};

export type AuthoringCompletion = {
  mode: "check" | "decision" | "record";
  doneWhen: string;
  sourceRowIds: string[];
  owner: AuthoringValueOwner;
};

export type CanonicalAuthoringItem = {
  itemId: string;
  stepId: string;
  sourceDisposition?: "active" | "previous_source";
  /**
   * Checkbox state written in the authored source (`- [x]`). This is source
   * content, not the reader's/personal execution completion state.
   */
  sourceChecked?: boolean;
  title: string;
  sourceTitle: string;
  titleOverrides?: Partial<Record<TextAuthoringOwnership, string>>;
  /**
   * Legacy creator-lane mirror kept for existing consumers.
   * New code should treat `title` as the effective value and `titleOverrides`
   * as the lane-owned values.
   */
  creatorTitle?: string;
  detail?: string;
  sourceDetail?: string;
  detailOverrides?: Partial<Record<TextAuthoringOwnership, string>>;
  /**
   * Legacy creator-lane mirror kept for existing consumers.
   */
  creatorDetail?: string;
  sourceCompletion?: AuthoringCompletion;
  completionOverrides?: Partial<
    Record<TextAuthoringOwnership, AuthoringCompletion>
  >;
  completion?: AuthoringCompletion;
  sourceSchedule?: AuthoringSchedule;
  scheduleOverrides?: Partial<
    Record<TextAuthoringOwnership, AuthoringSchedule>
  >;
  schedule?: AuthoringSchedule;
  intent: AuthoringItemIntent;
  role: Extract<
    AuthoringTargetKind,
    "item" | "resource" | "guide" | "caution" | "completion"
  >;
  order: number;
  nestingLevel: number;
  included: boolean;
  properties: AuthoringProperty[];
  /** Exactly one source indentation level below this parent Todo. */
  subchecks?: AuthoringSubcheck[];
  /** Parsed only when the supported rule and a calculable start date are valid. */
  recurrence?: AuthoringRecurrenceRule;
  resources: AuthoringLink[];
  sources: AuthoringLink[];
  guides: string[];
  cautions: string[];
  sourceRowIds: string[];
};

export type CanonicalAuthoringStep = {
  stepId: string;
  flowId: string;
  title: string;
  description?: string;
  order: number;
  itemIds: string[];
  sourceRowIds: string[];
  generated?: boolean;
};

export type CanonicalAuthoringFlow = {
  flowId: string;
  title: string;
  summary?: string;
  userNeed?: string;
  primaryArtifact: AuthoringArtifact;
  secondaryArtifacts: AuthoringArtifact[];
  stepIds: string[];
  sourceRowIds: string[];
};

export type AuthoringMemo = {
  memoId: string;
  scope: { type: "flow" | "step" | "item"; id: string };
  kind: "instruction" | "source_detail" | "caution" | "guide" | "resource";
  text: string;
  sourceRowIds: string[];
};

export type AuthoringField = {
  fieldId: string;
  owner: { type: "flow" | "item"; id: string };
  key: string;
  label: string;
  value: string;
  sourceRowIds: string[];
};

export type AuthoringSourceReference = {
  sourceRefId: string;
  entityType: "flow" | "step" | "item" | "field" | "memo";
  entityId: string;
  sourceRowIds: string[];
  relation: "derived_from" | "supports" | "caution" | "boundary";
  supportLevel:
    "direct" | "creator_interpretation" | "user_request" | "inferred_draft";
};

export type AuthoringCanonicalContent = {
  flow: CanonicalAuthoringFlow;
  steps: CanonicalAuthoringStep[];
  items: CanonicalAuthoringItem[];
  fields: AuthoringField[];
  memos: AuthoringMemo[];
  sourceRows: AuthoringSourceRow[];
  sourceRefs: AuthoringSourceReference[];
};

export type AuthoringArtifactEligibility = {
  primary: AuthoringArtifact;
  secondary: AuthoringArtifact[];
  counts: Record<AuthoringArtifact, number>;
  loss: Partial<Record<AuthoringArtifact, string[]>>;
};

export type AuthoringParseResult = {
  parseResultId: string;
  parserVersion: TextAuthoringParserVersion;
  fixtureVersion: string;
  blocks: AuthoringBlock[];
  mappings: BlockToCanonicalMapping[];
  issues: UnresolvedAuthoringIssue[];
  canonical: AuthoringCanonicalContent;
  artifactEligibility: AuthoringArtifactEligibility;
  /** Optional for stored P0/v1 records; new parser results always emit it. */
  longDocument?: AuthoringLongDocumentAnalysis;
};

export type AuthoringSourceSnapshotRef = {
  snapshotId: string;
  contentFingerprint: string;
  capturedAt: string;
  /**
   * Exact source captured for this snapshot. Optional for stored v2 records
   * created before source text was embedded in the snapshot reference.
   */
  rawText?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  externalVersion?: string;
};

export type AuthoringSourceItemMatch = {
  activeItemId: string;
  incomingItemId: string;
  basis: "stable_entity_id" | "explicit";
};

export type AuthoringSourceUpdateField =
  | "title"
  | "source_checked"
  | "detail"
  | "completion"
  | "schedule"
  | "resources"
  | "sources"
  | "guides"
  | "cautions"
  | "role"
  | "included"
  | "nesting"
  | "order"
  | "step_mapping";

export type AuthoringSourceUpdateResolution =
  | "keep_user"
  | "use_incoming"
  | "include_added"
  | "exclude_added"
  | "keep_previous"
  | "remove_removed";

export type AuthoringSourceUpdateChange =
  | {
      changeId: string;
      kind: "changed";
      activeItemId: string;
      incomingItemId: string;
      field: AuthoringSourceUpdateField;
      oldSourceValue?: unknown;
      incomingSourceValue?: unknown;
      userOwner?: TextAuthoringOwnership;
      userValue?: unknown;
      state: "open" | "resolved";
      resolution?: Extract<
        AuthoringSourceUpdateResolution,
        "keep_user" | "use_incoming"
      >;
      decidedAt?: string;
      actorLane?: TextAuthoringOwnership;
    }
  | {
      changeId: string;
      kind: "added";
      incomingItemId: string;
      incomingSourceValue: CanonicalAuthoringItem;
      state: "open" | "resolved";
      resolution?: Extract<
        AuthoringSourceUpdateResolution,
        "include_added" | "exclude_added"
      >;
      decidedAt?: string;
      actorLane?: TextAuthoringOwnership;
    }
  | {
      changeId: string;
      kind: "removed";
      activeItemId: string;
      oldSourceValue: CanonicalAuthoringItem;
      hasOwnedState: boolean;
      state: "open" | "resolved";
      resolution?: Extract<
        AuthoringSourceUpdateResolution,
        "keep_previous" | "remove_removed"
      >;
      decidedAt?: string;
      actorLane?: TextAuthoringOwnership;
    };

export type AuthoringSourceUpdateCandidate = {
  snapshot: AuthoringSourceSnapshotRef;
  rawText: string;
  inputKinds?: AuthoringInputKind[];
  primaryInputKind?: Exclude<AuthoringInputKind, "mixed">;
  parseResult: AuthoringParseResult;
  matches: AuthoringSourceItemMatch[];
};

export type AuthoringSourceState =
  | {
      status: "current";
      active: AuthoringSourceSnapshotRef;
    }
  | {
      status: "source_updated" | "conflict_source_vs_user";
      active: AuthoringSourceSnapshotRef;
      incoming: AuthoringSourceUpdateCandidate;
      changes: AuthoringSourceUpdateChange[];
      stagedAt: string;
      deferredAt?: string;
    };

export type AuthoringCorrectionOperation =
  | { type: "merge"; itemIds: string[] }
  | { type: "split"; itemId: string; at: number }
  | { type: "indent"; itemId: string }
  | { type: "outdent"; itemId: string }
  | { type: "reorder"; itemId: string; toIndex: number }
  | { type: "align_source_order"; orderedItemIds: string[] }
  | { type: "rename"; itemId: string; title: string }
  | {
      type: "change_role";
      itemId: string;
      role: CanonicalAuthoringItem["role"];
    }
  | { type: "include"; itemId: string }
  | { type: "exclude"; itemId: string }
  | { type: "restore"; itemId?: string }
  | {
      type: "classify_issue";
      issueId: string;
      outcome: "keep_source_only";
    }
  | {
      type: "classify_issue";
      issueId: string;
      outcome: "hold";
    }
  | {
      type: "classify_issue";
      issueId: string;
      outcome: "convert_to_item";
      targetStepId?: string;
      titleOverride?: string;
    }
  | {
      type: "set_property";
      itemId: string;
      key:
        | "title"
        | "detail"
        | "completion"
        | "date"
        | "relative_date"
        | "time"
        | "timezone"
        | "place"
        | "duration"
        | "repeat"
        | "condition"
        | "resource"
        | "source";
      value: string;
    }
  | {
      /**
       * Rewrites one unambiguous root `- [ ]` Item in `document.rawText` and
       * replaces the parsed source view in the same undoable revision.
       */
      type: "sync_item_to_working_text";
      itemId: string;
      patch: AuthoringWorkingTextItemPatch;
    }
  | {
      /**
       * Treats a direct edit in the left working-text editor as the current
       * authoring source. This is intentionally separate from an external
       * source refresh, which still uses the staged source-update workflow.
       */
      type: "sync_working_text_from_input";
      rawText: string;
      title?: string;
      sourceTitle?: string;
      sourceUrl?: string;
      reviewRequirements?: AuthoringReviewRequirement[];
    }
  | {
      type: "record_review_decision";
      gateId: string;
      status: Exclude<AuthoringReviewGateStatus, "required">;
      evidenceNote?: string;
    }
  | {
      type: "reopen_review";
      gateId: string;
    }
  | {
      type: "stage_source_update";
      candidate: AuthoringSourceUpdateCandidate;
    }
  | {
      type: "resolve_source_conflict";
      changeId: string;
      resolution: AuthoringSourceUpdateResolution;
    }
  | { type: "apply_source_update" }
  | { type: "reject_source_update" }
  | { type: "undo" };

export type AuthoringRevisionSnapshot = {
  parseResult: AuthoringParseResult;
  title?: string;
  rawText?: string;
  inputKinds?: AuthoringInputKind[];
  primaryInputKind?: Exclude<AuthoringInputKind, "mixed">;
  sourceTitle?: string;
  sourceUrl?: string;
  reviewGates?: AuthoringReviewGate[];
  sourceState?: AuthoringSourceState;
  lifecycleStatus?: TextAuthoringDocument["lifecycleStatus"];
};

export type DraftRevision = {
  revisionId: string;
  parentRevisionId?: string;
  kind?: "initial" | "edit" | "personal_fork";
  operations: AuthoringCorrectionOperation[];
  actorLane: AuthoringRevisionActor;
  timestamp: string;
  before?: AuthoringRevisionSnapshot;
};

export type RoundTripReceipt = {
  receiptId: string;
  format: "markdown" | "json" | "flow_bundle" | "ics" | "plain_text";
  exportedCount: number;
  matchedCount: number;
  changedCount: number;
  unresolvedCount: number;
  lossFields: string[];
  documentId: string;
  revisionId: string;
  createdAt: string;
};

export type TextAuthoringDocument = {
  schemaVersion: TextAuthoringSchemaVersion;
  documentId: string;
  ownership: TextAuthoringOwnership;
  title: string;
  rawText: string;
  inputKinds: AuthoringInputKind[];
  primaryInputKind: Exclude<AuthoringInputKind, "mixed">;
  sourceTitle?: string;
  sourceUrl?: string;
  parseResult: AuthoringParseResult;
  reviewGates?: AuthoringReviewGate[];
  sourceState?: AuthoringSourceState;
  revision: DraftRevision;
  revisionHistory: DraftRevision[];
  forkedFrom?: {
    documentId: string;
    revisionId: string;
  };
  lifecycleStatus: "draft" | "needs_review" | "previewed" | "archived";
  features?: {
    longDocumentTable?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  uiState?: {
    stage: "input" | "structure" | "result";
    selectedItemId?: string;
    focusTarget?: string;
  };
};

export type CreateTextAuthoringDocumentOptions = {
  documentId?: string;
  ownership?: TextAuthoringOwnership;
  title?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  fixtureVersion?: string;
  /**
   * Enables the legacy heuristic that proposes Items from unmarked prose.
   * Direct v2 authoring keeps this off so only explicit structure creates Items.
   */
  importAssist?: boolean;
  reviewRequirements?: AuthoringReviewRequirement[];
  sourceExternalVersion?: string;
  /** P1-C bounded table analysis. Disabled unless explicitly or fixture-enabled. */
  longDocumentTable?: {
    enabled?: boolean;
    limits?: Partial<AuthoringInputBudgetLimits>;
  };
  now?: string;
};

export type AuthoringValidationIssue = {
  code:
    | "duplicate_id"
    | "broken_reference"
    | "unaccounted_source_row"
    | "invented_schedule"
    | "missing_lineage"
    | "too_many_secondary_artifacts"
    | "invalid_review_gate"
    | "invalid_source_state";
  path: string;
  message: string;
};

export type AuthoringValidationResult = {
  valid: boolean;
  issues: AuthoringValidationIssue[];
  counts: {
    sourceRows: number;
    mappedSourceRows: number;
    steps: number;
    items: number;
    unresolved: number;
  };
};
