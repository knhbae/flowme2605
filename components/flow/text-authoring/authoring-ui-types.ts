import type {
  AuthoringIssueOutcome,
  UnresolvedAuthoringIssue,
} from "@/lib/flow/text-authoring/types";

export type AuthoringStage = "input" | "result";

// Stored drafts from the three-stage prototype can still contain `structure`.
// The workspace normalizes that legacy value to the visible result stage.
export type PersistedAuthoringStage = AuthoringStage | "structure";

export type AuthoringOwnership = "personal" | "creator" | "suggestion";

export type AuthoringRole =
  | "item"
  | "resource"
  | "guide"
  | "caution"
  | "detail"
  | "completion"
  | "unresolved";

export type AuthoringItemView = {
  itemId: string;
  blockId: string;
  stepId: string;
  title: string;
  rawText: string;
  sourceLineLabel: string;
  role: AuthoringRole;
  included: boolean;
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
  userCorrected: boolean;
};

export type AuthoringItemPatch = Pick<
  AuthoringItemView,
  | "title"
  | "detail"
  | "completion"
  | "date"
  | "relativeDate"
  | "time"
  | "timezone"
  | "place"
  | "duration"
  | "repeat"
  | "repeatEnd"
  | "condition"
  | "resource"
  | "source"
  | "guide"
  | "caution"
>;

export type AuthoringStepView = {
  stepId: string;
  title: string;
  items: AuthoringItemView[];
};

export type AuthoringCounts = {
  steps: number;
  items: number;
  included: number;
  unresolved: number;
  resources: number;
};

export type AuthoringIssueView = {
  issueId: string;
  type: UnresolvedAuthoringIssue["type"];
  sourceLineLabel: string;
  rawText: string;
  reason: string;
  expectedInput: string;
  blockedResult: string;
  sourceRowIds: string[];
  itemId?: string;
  state: "open" | "held";
  blocking: boolean;
  availableOutcomes: AuthoringIssueOutcome[];
};

export type AuthoringSourceLocatorView = {
  locatorId: string;
  kind:
    | "heading"
    | "prose"
    | "blockquote"
    | "code"
    | "html"
    | "comment"
    | "table"
    | "issue";
  label: string;
  detail: string;
  status: "safe" | "preserved" | "possible-loss" | "blocked";
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
};

export type AuthoringTableLossView = {
  state: "partial" | "blocked" | "txt-only";
  summary: string;
  detail: string;
  sourceRowCount: number;
  structuredRowCount: number;
  sourceCellCount: number;
  structuredCellCount: number;
  firstLocator?: AuthoringSourceLocatorView;
};

export type AuthoringLongDocumentFocusView = {
  locatorId: string;
  startOffset: number;
  startLine: number;
  sourceScrollTop: number;
  returnArtifact?: "calendar" | "todo" | "sheet" | "memo";
  focusTestId?: string;
  focusLocatorId?: string;
};

export type AuthoringDraftStatus =
  "작성 중" | "확인 필요" | "결과 확인 완료" | "준비 완료" | "보관됨";

export type AuthoringDraftView = {
  draftId: string;
  title: string;
  source: string;
  ownership: AuthoringOwnership;
  primaryArtifact: string;
  stepCount: number;
  itemCount: number;
  issueCount: number;
  revisionLabel: string;
  updatedAtLabel: string;
  lastSavedAtLabel: string;
  archived: boolean;
  status: AuthoringDraftStatus;
};

export type AuthoringPreflightView = {
  artifact: string;
  eligibleCount: number;
  excludedCount: number;
  undatedCount: number;
  loss: string[];
  dateRange: string;
};

export type AuthoringReceiptView = {
  receiptId: string;
  title: string;
  ownership: AuthoringOwnership;
  ownershipLabel: string;
  revisionLabel: string;
  artifact: string;
  stepCount: number;
  itemCount: number;
  sourcePreserved: boolean;
  reviewRequiredCount: number;
  reviewEvidenceCount: number;
  reviewPersonalOnlyCount: number;
  sourceState:
    "current" | "source_updated" | "conflict_source_vs_user" | "unknown";
  sourceOpenChangeCount: number;
  savedAtLabel: string;
};
