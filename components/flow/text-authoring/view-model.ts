import type {
  AuthoringArtifactKind,
  AuthoringArtifactPreflight,
  AuthoringArtifactRow,
} from "@/lib/flow/text-authoring/artifact-projection";
import type { TextAuthoringSaveReceipt } from "@/lib/flow/text-authoring/receipt";
import type { TextAuthoringDraftRecord } from "@/lib/flow/text-authoring/storage";
import type {
  AuthoringInputKind,
  AuthoringIssueOutcome,
  AuthoringProperty,
  CanonicalAuthoringItem,
  TextAuthoringDocument,
  UnresolvedAuthoringIssue,
} from "@/lib/flow/text-authoring/types";
import type {
  AuthoringLongDocumentAnalysis,
  AuthoringLongDocumentBlock,
  AuthoringLongDocumentLoss,
  AuthoringLongDocumentTable,
  AuthoringSourceLocator,
} from "@/lib/flow/text-authoring/types";
import {
  allowedAuthoringIssueOutcomes,
  authoringIssueState,
  isAuthoringIssueOutstanding,
} from "@/lib/flow/text-authoring/issue-state";

import type {
  AuthoringCounts,
  AuthoringDraftStatus,
  AuthoringDraftView,
  AuthoringIssueView,
  AuthoringLongDocumentFocusView,
  AuthoringItemView,
  AuthoringPreflightView,
  AuthoringReceiptView,
  AuthoringRole,
  AuthoringSourceLocatorView,
  AuthoringStepView,
  AuthoringTableLossView,
} from "./authoring-ui-types";

const LONG_DOCUMENT_FOCUS_PREFIX = "p1c-source-locator:";

const EXACT_RAW_BLOCK_KINDS = new Set<AuthoringLongDocumentBlock["kind"]>([
  "blockquote",
  "code_fence",
  "html",
  "comment",
]);

/**
 * Keep the established structured TXT serializer for ordinary Flow items.
 * Exact source bytes are reserved for P1-C shapes whose layout or table
 * boundaries would otherwise be lost.
 */
export function shouldUseRawPreservedTextResult(
  document: TextAuthoringDocument | null | undefined,
  { runtimeFallbackActive = false }: { runtimeFallbackActive?: boolean } = {},
): boolean {
  const analysis = document?.parseResult.longDocument;
  if (!analysis) return false;

  if (
    runtimeFallbackActive ||
    analysis.fallbackActive ||
    analysis.status === "txt-only" ||
    analysis.budget.exceeded.length > 0
  ) {
    return true;
  }

  if (
    analysis.status === "partially-structured" ||
    analysis.status === "result-specific-blocked" ||
    analysis.tables.length > 0 ||
    analysis.tableLossManifest.detectedFormats.length > 0 ||
    analysis.lossManifest.some((loss) =>
      ["table-loss-risk", "table-invalid", "too-large"].includes(loss.reason),
    )
  ) {
    return true;
  }

  const hasExactRawBlock = analysis.blocks.some((block) =>
    EXACT_RAW_BLOCK_KINDS.has(block.kind),
  );
  const hasIndentedRawLine = analysis.blocks.some((block) =>
    block.rawText
      .split(/\r?\n/u)
      .some((line) => /^(?:\t| {2,})(?!-\s)/u.test(line)),
  );
  const hasUnstructuredSource = document.parseResult.canonical.sourceRows.some(
    (row) => row.rowType === "unsupported",
  );
  const hasLongOrMixedRawSource =
    hasUnstructuredSource &&
    (analysis.budget.lineCount >= 20 ||
      analysis.blocks.length >= 3 ||
      document.parseResult.canonical.items.length > 0);

  return hasExactRawBlock || hasIndentedRawLine || hasLongOrMixedRawSource;
}

/**
 * Preserve the source as an exact prefix, then expose only derived recurrence
 * occurrences that are not otherwise visible in the authored bytes. Ordinary
 * non-recurring rows are intentionally excluded from the appendix.
 */
export function composeRawPreservedTextResult(
  rawText: string,
  memoRows: AuthoringArtifactRow[],
): string {
  const seenOccurrenceIds = new Set<string>();
  const occurrenceRows = memoRows.filter((row) => {
    if (!row.occurrenceId || seenOccurrenceIds.has(row.occurrenceId)) {
      return false;
    }
    seenOccurrenceIds.add(row.occurrenceId);
    return true;
  });
  if (occurrenceRows.length === 0) return rawText;

  const newline = rawText.includes("\r\n") ? "\r\n" : "\n";
  const appendixLines = occurrenceRows.map((row, index) => {
    const occurrenceIndex = row.occurrenceIndex ?? index + 1;
    const schedule = [row.date, row.time].filter(Boolean).join(" ");
    return `- ${row.title} · ${occurrenceIndex}회차${
      schedule ? ` · ${schedule}` : ""
    }`;
  });
  const separator = rawText.endsWith(newline)
    ? newline
    : `${newline}${newline}`;
  return `${rawText}${separator}[반복 회차]${newline}${appendixLines.join(
    newline,
  )}${newline}`;
}

export function serializeAuthoringLongDocumentFocus(
  focus: AuthoringLongDocumentFocusView,
): string {
  return `${LONG_DOCUMENT_FOCUS_PREFIX}${encodeURIComponent(JSON.stringify(focus))}`;
}

export function parseAuthoringLongDocumentFocus(
  value: string | null | undefined,
): AuthoringLongDocumentFocusView | null {
  if (!value?.startsWith(LONG_DOCUMENT_FOCUS_PREFIX)) return null;
  try {
    const parsed = JSON.parse(
      decodeURIComponent(value.slice(LONG_DOCUMENT_FOCUS_PREFIX.length)),
    ) as Partial<AuthoringLongDocumentFocusView>;
    if (
      typeof parsed.locatorId !== "string" ||
      !parsed.locatorId ||
      !Number.isInteger(parsed.startOffset) ||
      (parsed.startOffset ?? -1) < 0 ||
      !Number.isInteger(parsed.startLine) ||
      (parsed.startLine ?? 0) < 1 ||
      typeof parsed.sourceScrollTop !== "number" ||
      !Number.isFinite(parsed.sourceScrollTop) ||
      parsed.sourceScrollTop < 0
    ) {
      return null;
    }
    const returnArtifact = parsed.returnArtifact;
    if (
      returnArtifact !== undefined &&
      !["calendar", "todo", "sheet", "memo"].includes(returnArtifact)
    ) {
      return null;
    }
    return {
      locatorId: parsed.locatorId,
      startOffset: parsed.startOffset!,
      startLine: parsed.startLine!,
      sourceScrollTop: parsed.sourceScrollTop,
      ...(returnArtifact ? { returnArtifact } : {}),
      ...(typeof parsed.focusTestId === "string" && parsed.focusTestId
        ? { focusTestId: parsed.focusTestId }
        : {}),
      ...(typeof parsed.focusLocatorId === "string" && parsed.focusLocatorId
        ? { focusLocatorId: parsed.focusLocatorId }
        : {}),
    };
  } catch {
    return null;
  }
}

export function resolveAuthoringSourceLocatorView(
  entries: AuthoringSourceLocatorView[],
  focus: Pick<
    AuthoringLongDocumentFocusView,
    "locatorId" | "startLine" | "startOffset"
  >,
): { entry: AuthoringSourceLocatorView; stale: boolean } | null {
  if (entries.length === 0) return null;
  const exact = entries.find((entry) => entry.locatorId === focus.locatorId);
  if (exact) return { entry: exact, stale: false };
  const entry = entries.reduce((nearest, candidate) => {
    const nearestLineDistance = Math.abs(nearest.startLine - focus.startLine);
    const candidateLineDistance = Math.abs(
      candidate.startLine - focus.startLine,
    );
    if (candidateLineDistance !== nearestLineDistance) {
      return candidateLineDistance < nearestLineDistance ? candidate : nearest;
    }
    return Math.abs(candidate.startOffset - focus.startOffset) <
      Math.abs(nearest.startOffset - focus.startOffset)
      ? candidate
      : nearest;
  });
  return { entry, stale: true };
}

export function buildAuthoringTableRowLocatorViews(
  analysis: AuthoringLongDocumentAnalysis | null | undefined,
): AuthoringSourceLocatorView[] {
  if (!analysis?.featureEnabled) return [];
  return analysis.tables.flatMap((table) =>
    table.sourceRows
      .filter((row) => row.kind === "body")
      .map((row, index) => ({
        locatorId: `table-row:${row.rowId}:${row.locator.startOffset}:${row.locator.endOffset}`,
        kind: "table" as const,
        label: `표 ${index + 1}행`,
        detail: row.values.filter(Boolean).slice(0, 3).join(" · "),
        status:
          table.state === "table-safe"
            ? ("safe" as const)
            : ("possible-loss" as const),
        startOffset: row.locator.startOffset,
        endOffset: row.locator.endOffset,
        startLine: row.locator.startLine,
        endLine: row.locator.endLine,
      })),
  );
}

export function buildAuthoringLongDocumentLossLocatorViews(
  analysis: AuthoringLongDocumentAnalysis | null | undefined,
): AuthoringSourceLocatorView[] {
  if (!analysis?.featureEnabled) return [];
  return analysis.lossManifest.flatMap((loss) => {
    if (!loss.locator) return [];
    return [
      {
        locatorId: locatorId(loss.lossId, loss.locator),
        kind: "table" as const,
        label: "확인할 표",
        detail: loss.message,
        status: loss.blocked
          ? ("blocked" as const)
          : ("possible-loss" as const),
        startOffset: loss.locator.startOffset,
        endOffset: loss.locator.endOffset,
        startLine: loss.locator.startLine,
        endLine: loss.locator.endLine,
      },
    ];
  });
}

const LONG_DOCUMENT_BLOCK_LABEL: Record<
  AuthoringLongDocumentBlock["kind"],
  string
> = {
  blank: "빈 줄",
  prose: "원문 문장",
  blockquote: "인용문",
  code_fence: "코드 원문",
  html: "HTML 원문",
  comment: "주석",
  table: "원문 표",
};

function locatorId(prefix: string, locator: AuthoringSourceLocator): string {
  return `${prefix}:${locator.startOffset}:${locator.endOffset}:${locator.rawHash}`;
}

function lineDetail(locator: AuthoringSourceLocator): string {
  return locator.startLine === locator.endLine
    ? `${locator.startLine}행`
    : `${locator.startLine}~${locator.endLine}행`;
}

function sourceLocatorView(
  block: AuthoringLongDocumentBlock,
): AuthoringSourceLocatorView {
  const trimmed = block.rawText.trim();
  const headingMatch = /^(#{1,6})\s+(.+)$/u.exec(trimmed);
  return {
    locatorId: locatorId(block.blockId, block.locator),
    kind: headingMatch
      ? "heading"
      : block.kind === "code_fence"
        ? "code"
        : block.kind === "blank"
          ? "prose"
          : block.kind,
    label: headingMatch?.[2] ?? LONG_DOCUMENT_BLOCK_LABEL[block.kind],
    detail:
      block.kind === "blank"
        ? "문단 사이 간격을 보존했습니다."
        : headingMatch
          ? "문서 제목"
          : trimmed.replace(/\s+/gu, " ").slice(0, 88),
    status:
      block.kind === "table"
        ? "safe"
        : block.kind === "prose"
          ? "safe"
          : "preserved",
    startOffset: block.locator.startOffset,
    endOffset: block.locator.endOffset,
    startLine: block.locator.startLine,
    endLine: block.locator.endLine,
  };
}

function tableLocatorView(
  table: AuthoringLongDocumentTable,
): AuthoringSourceLocatorView {
  const state =
    table.state === "table-safe"
      ? "safe"
      : table.state === "table-loss-risk"
        ? "possible-loss"
        : "blocked";
  return {
    locatorId: locatorId(table.tableId, table.locator),
    kind: "table",
    label: table.headers.filter(Boolean).slice(0, 3).join(" · ") || "원문 표",
    detail: `${lineDetail(table.locator)} · ${table.rows.length}개 행`,
    status: state,
    startOffset: table.locator.startOffset,
    endOffset: table.locator.endOffset,
    startLine: table.locator.startLine,
    endLine: table.locator.endLine,
  };
}

function issueLocatorView(
  issue: AuthoringIssueView,
  index: number,
  document: TextAuthoringDocument,
): AuthoringSourceLocatorView | null {
  const sourceRows = document.parseResult.canonical.sourceRows.filter((row) =>
    issue.sourceRowIds.includes(row.sourceRowId),
  );
  if (sourceRows.length === 0) return null;
  const startOffset = Math.min(
    ...sourceRows.map((row) => row.sourceRange.startOffset),
  );
  const endOffset = Math.max(
    ...sourceRows.map((row) => row.sourceRange.endOffset),
  );
  const startLine = Math.min(
    ...sourceRows.map((row) => row.sourceRange.startLine),
  );
  const endLine = Math.max(...sourceRows.map((row) => row.sourceRange.endLine));
  return {
    locatorId: `issue:${issue.issueId}:${startOffset}:${endOffset}:${index}`,
    kind: "issue",
    label: "확인할 원문",
    detail: issue.reason,
    status: issue.blocking ? "blocked" : "possible-loss",
    startOffset,
    endOffset,
    startLine,
    endLine,
  };
}

export function buildAuthoringSourceLocatorViews(
  document: TextAuthoringDocument | null,
  issues: AuthoringIssueView[],
): AuthoringSourceLocatorView[] {
  if (!document) return [];
  const analysis = document.parseResult.longDocument;
  if (!analysis) {
    return issues
      .map((issue, index) => issueLocatorView(issue, index, document))
      .filter((entry): entry is AuthoringSourceLocatorView => Boolean(entry));
  }
  const entries = analysis.blocks
    .filter((block) => block.kind !== "blank")
    .map(sourceLocatorView);
  for (const table of analysis.tables) {
    const replacement = tableLocatorView(table);
    const blockIndex = entries.findIndex(
      (entry) =>
        entry.kind === "table" &&
        entry.startOffset === replacement.startOffset &&
        entry.endOffset === replacement.endOffset,
    );
    if (blockIndex >= 0) entries[blockIndex] = replacement;
    else entries.push(replacement);
  }
  entries.push(
    ...issues
      .map((issue, index) => issueLocatorView(issue, index, document))
      .filter((entry): entry is AuthoringSourceLocatorView => Boolean(entry)),
  );
  return entries.sort(
    (left, right) =>
      left.startOffset - right.startOffset || (left.kind === "issue" ? 1 : -1),
  );
}

function tableLosses(analysis: AuthoringLongDocumentAnalysis) {
  return analysis.lossManifest.filter((loss) => loss.result === "sheet");
}

export function buildAuthoringTableLossView(
  analysis: AuthoringLongDocumentAnalysis | null | undefined,
): AuthoringTableLossView | null {
  if (!analysis) return null;
  const losses = tableLosses(analysis);
  const unsafeTables = analysis.tables.filter(
    (table) => table.state !== "table-safe",
  );
  const budgetBlocked = analysis.budget.exceeded.length > 0;
  if (losses.length === 0 && unsafeTables.length === 0 && !budgetBlocked)
    return null;
  const safeTables = analysis.tables.filter(
    (table) => table.state === "table-safe",
  );
  const firstLoss: AuthoringLongDocumentLoss | undefined = losses[0];
  const firstUnsafe = unsafeTables[0];
  const firstLocator = firstLoss?.locator
    ? {
        locatorId: locatorId(firstLoss.lossId, firstLoss.locator),
        kind: "table" as const,
        label: "확인할 표",
        detail: firstLoss.message,
        status: firstLoss.blocked
          ? ("blocked" as const)
          : ("possible-loss" as const),
        startOffset: firstLoss.locator.startOffset,
        endOffset: firstLoss.locator.endOffset,
        startLine: firstLoss.locator.startLine,
        endLine: firstLoss.locator.endLine,
      }
    : firstUnsafe
      ? tableLocatorView(firstUnsafe)
      : undefined;
  const sourceRowCount = analysis.tables.reduce(
    (count, table) => count + table.rows.length,
    0,
  );
  const structuredRowCount = safeTables.reduce(
    (count, table) => count + table.rows.length,
    0,
  );
  const structuredCellCount = safeTables.reduce(
    (count, table) => count + table.logicalCellCount,
    0,
  );
  const blocked = budgetBlocked || losses.some((loss) => loss.blocked);
  return {
    state: budgetBlocked ? "txt-only" : blocked ? "blocked" : "partial",
    summary: budgetBlocked
      ? "문서가 안전하게 처리할 범위를 넘어 결과를 만들지 않았습니다. 원문과 TXT는 그대로 남아 있습니다."
      : blocked
        ? "표 구조를 안전하게 확인하지 못해 표·Excel을 만들지 않았습니다. 원문과 TXT는 그대로 남아 있습니다."
        : "표 일부는 원문 그대로 보존했습니다. 안전하게 읽은 행만 표시합니다.",
    detail:
      firstLoss?.message ??
      firstUnsafe?.issues[0] ??
      "원문을 줄이거나 표 구조를 확인한 뒤 다시 시도해 주세요.",
    sourceRowCount,
    structuredRowCount,
    sourceCellCount: analysis.budget.logicalCellCount,
    structuredCellCount,
    ...(firstLocator ? { firstLocator } : {}),
  };
}

const INPUT_KIND_LABEL: Record<AuthoringInputKind, string> = {
  plain_text: "일반 메모",
  markdown: "Markdown",
  table: "표",
  url: "URL",
  mixed: "혼합 입력",
};

const ARTIFACT_LABEL: Record<AuthoringArtifactKind, string> = {
  calendar: "캘린더",
  todo: "할 일",
  sheet: "표·Excel",
  memo: "TXT",
};

const DRAFT_STATUS_LABEL: Record<
  TextAuthoringDraftRecord["status"],
  AuthoringDraftStatus
> = {
  draft: "작성 중",
  needs_review: "확인 필요",
  previewed: "결과 확인 완료",
  ready: "준비 완료",
  archived: "보관됨",
};

function propertyValue(properties: AuthoringProperty[], key: string): string {
  return (
    [...properties].reverse().find((property) => property.key === key)?.value ??
    ""
  );
}

function roleForItem(item: CanonicalAuthoringItem): AuthoringRole {
  return item.role;
}

function sourceLineLabel(
  document: TextAuthoringDocument,
  sourceRowIds: string[],
): string {
  const lines = document.parseResult.canonical.sourceRows
    .filter((row) => sourceRowIds.includes(row.sourceRowId))
    .flatMap((row) => [row.sourceRange.startLine, row.sourceRange.endLine]);
  if (lines.length === 0) return "원문 연결";
  const start = Math.min(...lines);
  const end = Math.max(...lines);
  return start === end ? `원문 ${start}행` : `원문 ${start}~${end}행`;
}

function rawTextForItem(
  document: TextAuthoringDocument,
  sourceRowIds: string[],
): string {
  return document.parseResult.canonical.sourceRows
    .filter((row) => sourceRowIds.includes(row.sourceRowId))
    .sort((left, right) => left.order - right.order)
    .map((row) => row.rawText)
    .join("\n");
}

function rawTextForIssue(
  document: TextAuthoringDocument,
  issue: UnresolvedAuthoringIssue,
): string {
  return document.parseResult.canonical.sourceRows
    .filter((row) => issue.sourceRowIds.includes(row.sourceRowId))
    .sort((left, right) => left.order - right.order)
    .map((row) => row.rawText)
    .join("\n");
}

function itemPropertySourceValue(
  document: TextAuthoringDocument,
  item: CanonicalAuthoringItem,
  labels: string[],
): string {
  return document.parseResult.canonical.sourceRows
    .filter(
      (row) =>
        item.sourceRowIds.includes(row.sourceRowId) &&
        row.state !== "tombstone",
    )
    .sort((left, right) => left.order - right.order)
    .flatMap((row) => {
      const match = /^ {2}- ([^:：]+)[:：]\s*(.*)$/u.exec(row.rawText);
      return match && labels.includes(match[1].trim()) ? [match[2].trim()] : [];
    })
    .join("\n");
}

const INSPECTOR_STRUCTURAL_PROPERTY_KEYS = new Set([
  "date",
  "relative_date",
  "time",
  "timezone",
  "place",
  "duration",
  "repeat",
  "repeat_end",
  "condition",
  "resource",
  "source",
]);

function inspectorDetail(
  document: TextAuthoringDocument,
  item: CanonicalAuthoringItem,
): string {
  if (!item.detail) return "";
  const preservedPropertyLines = new Set<string>();
  for (const property of item.properties) {
    if (INSPECTOR_STRUCTURAL_PROPERTY_KEYS.has(property.key)) continue;
    preservedPropertyLines.add(`${property.label}: ${property.value}`.trim());
  }
  for (const row of document.parseResult.canonical.sourceRows) {
    if (
      row.rowType !== "property" ||
      !item.sourceRowIds.includes(row.sourceRowId)
    ) {
      continue;
    }
    const normalized = row.rawText
      .trim()
      .replace(/^[-*+]\s+/u, "")
      .trim();
    if (/^[^:：]{1,32}[:：]\s*.*$/u.test(normalized)) {
      preservedPropertyLines.add(normalized);
    }
  }
  return item.detail
    .split(/\r?\n/u)
    .filter((line) => !preservedPropertyLines.has(line.trim()))
    .join("\n")
    .trim();
}

function issueReason(issue: UnresolvedAuthoringIssue): string {
  const reasons: Partial<Record<UnresolvedAuthoringIssue["type"], string>> = {
    ambiguous_role: "할 일인지 설명인지 판단하지 못했어요.",
    unsupported_syntax: "이 문법을 자동으로 구조화하지 못했어요.",
    unknown_property: "지원하는 속성 이름인지 확인해 주세요.",
    unsupported_nested_item:
      "한 단계보다 깊은 하위 체크는 아직 지원하지 않아요.",
    missing_parent: "어느 항목에 이어지는 문장인지 확인이 필요해요.",
    invalid_date: "날짜는 YYYY-MM-DD 형식으로 입력해 주세요.",
    invalid_url:
      "자료나 출처 링크는 https:// 주소나 Markdown 링크 형식으로 입력해 주세요.",
    invalid_recurrence: "반복 규칙과 종료 조건을 확인해 주세요.",
    source_import_required: "링크 본문이 없어 원문을 가져와야 해요.",
    rights_review_required: "공개 전에 원문 사용 권리를 확인해야 해요.",
    safety_review_required: "공개 전에 안전 관련 근거를 확인해야 해요.",
  };
  return reasons[issue.type] ?? "이 문장을 자동으로 분류하지 못했어요.";
}

function issueExpectedInput(issue: UnresolvedAuthoringIssue): string {
  if (issue.expectedFormat) return issue.expectedFormat;
  const expected: Partial<Record<UnresolvedAuthoringIssue["type"], string>> = {
    ambiguous_role: "일반 문장은 TXT로 두고, 할 일이면 - [ ] 제목으로 시작",
    unsupported_syntax: "할 일은 - [ ] 제목, 속성은 두 칸 들여쓴 - 속성: 값",
    unknown_property: "정의된 속성명을 쓰거나 일반 설명 문장으로 입력",
    unsupported_nested_item:
      "하위 확인은 부모 할 일 바로 아래에 두 칸 들여쓴 - [ ] 제목",
    missing_parent: "먼저 - [ ] 부모 할 일을 입력한 뒤 하위 확인을 추가",
    invalid_date: "YYYY-MM-DD",
    invalid_url: "https://로 시작하는 링크 1개",
    invalid_recurrence: "예: 매주 월요일 + 반복 종료: 3회",
    source_import_required: "URL과 함께 확인할 원문을 입력",
    rights_review_required: "공개 전 출처와 사용 범위를 확인",
    safety_review_required: "공개 전 주의 근거와 중단 조건을 확인",
  };
  return expected[issue.type] ?? "원문 형식을 다시 확인";
}

function issueBlockedResult(issue: UnresolvedAuthoringIssue): string {
  const impact: Partial<Record<UnresolvedAuthoringIssue["type"], string>> = {
    ambiguous_role: "할 일·캘린더·표 포함 여부를 정할 수 없음",
    unsupported_syntax: "할 일·캘린더·표 결과를 만들 수 없음",
    unknown_property: "해당 속성을 결과에 표시할 수 없음",
    unsupported_nested_item: "하위 확인 항목을 할 일에 연결할 수 없음",
    missing_parent: "하위 확인 항목을 할 일에 연결할 수 없음",
    invalid_date: "해당 항목을 캘린더에 표시할 수 없음",
    invalid_url: "해당 링크를 결과에서 열 수 없음",
    invalid_recurrence: "반복 회차를 만들 수 없음",
    source_import_required: "URL 원문을 결과로 만들 수 없음",
    rights_review_required: "공개 준비를 완료할 수 없음",
    safety_review_required: "공개 준비를 완료할 수 없음",
  };
  return impact[issue.type] ?? "해당 내용을 결과에 반영할 수 없음";
}

function issueSortRank(
  state: "open" | "held",
  outcomes: AuthoringIssueOutcome[],
): number {
  if (state === "held") return 2;
  return outcomes.length > 0 ? 0 : 1;
}

function blockIdForItem(
  document: TextAuthoringDocument,
  itemId: string,
): string {
  return (
    document.parseResult.mappings.find(
      (mapping) =>
        mapping.targetKind === "item" && mapping.targetDraftId === itemId,
    )?.blockIds[0] ?? itemId
  );
}

export function toAuthoringItemView(
  document: TextAuthoringDocument,
  item: CanonicalAuthoringItem,
): AuthoringItemView {
  const schedule = item.schedule;
  const duration =
    schedule?.durationMinutes != null
      ? `${schedule.durationMinutes}분`
      : propertyValue(item.properties, "duration");
  return {
    itemId: item.itemId,
    blockId: blockIdForItem(document, item.itemId),
    stepId: item.stepId,
    title: item.title,
    rawText: rawTextForItem(document, item.sourceRowIds),
    sourceLineLabel: sourceLineLabel(document, item.sourceRowIds),
    role: roleForItem(item),
    included: item.included,
    detail: inspectorDetail(document, item),
    completion: item.completion?.doneWhen ?? "",
    date:
      schedule?.kind === "absolute"
        ? schedule.date
        : propertyValue(item.properties, "date"),
    relativeDate:
      schedule?.kind === "relative"
        ? schedule.raw
        : propertyValue(item.properties, "relative_date"),
    time: schedule?.time ?? propertyValue(item.properties, "time"),
    timezone: schedule?.timezone ?? propertyValue(item.properties, "timezone"),
    place: propertyValue(item.properties, "place"),
    duration,
    repeat: schedule?.repeat ?? propertyValue(item.properties, "repeat"),
    repeatEnd: propertyValue(item.properties, "repeat_end"),
    condition: propertyValue(item.properties, "condition"),
    resource:
      itemPropertySourceValue(document, item, ["자료"]) ||
      propertyValue(item.properties, "resource") ||
      item.resources
        .map((resource) => resource.url || resource.label)
        .join(", "),
    source:
      itemPropertySourceValue(document, item, ["출처"]) ||
      propertyValue(item.properties, "source") ||
      item.sources.map((source) => source.url || source.label).join(", "),
    guide:
      itemPropertySourceValue(document, item, ["안내", "가이드"]) ||
      item.guides.join("\n"),
    caution:
      itemPropertySourceValue(document, item, ["주의", "경고"]) ||
      item.cautions.join("\n"),
    userCorrected:
      Boolean(
        item.creatorTitle ||
        item.creatorDetail ||
        Object.keys(item.titleOverrides ?? {}).length ||
        Object.keys(item.detailOverrides ?? {}).length ||
        Object.keys(item.completionOverrides ?? {}).length ||
        Object.keys(item.scheduleOverrides ?? {}).length,
      ) ||
      item.properties.some((property) => property.owner !== "source") ||
      Boolean(item.completion && item.completion.owner !== "source") ||
      document.parseResult.mappings.some(
        (mapping) =>
          mapping.targetDraftId === item.itemId && mapping.userCorrected,
      ),
  };
}

export function buildAuthoringOutlineView(
  document: TextAuthoringDocument | null,
): {
  steps: AuthoringStepView[];
  items: AuthoringItemView[];
  counts: AuthoringCounts;
  issues: AuthoringIssueView[];
} {
  if (!document) {
    return {
      steps: [],
      items: [],
      counts: {
        steps: 0,
        items: 0,
        included: 0,
        unresolved: 0,
        resources: 0,
      },
      issues: [],
    };
  }
  const canonical = document.parseResult.canonical;
  const items = canonical.items
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((item) => toAuthoringItemView(document, item));
  const steps = canonical.steps
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((step) => ({
      stepId: step.stepId,
      title: step.title,
      items: step.itemIds
        .map((itemId) => items.find((item) => item.itemId === itemId))
        .filter((item): item is AuthoringItemView => Boolean(item)),
    }));
  const mappedItemIds = new Set(
    steps.flatMap((step) => step.items.map((item) => item.itemId)),
  );
  const ungrouped = items.filter((item) => !mappedItemIds.has(item.itemId));
  if (ungrouped.length > 0) {
    steps.push({
      stepId: "ungrouped",
      title: "분류되지 않은 항목",
      items: ungrouped,
    });
  }
  const unresolvedIssues = document.parseResult.issues.filter(
    isAuthoringIssueOutstanding,
  );
  const issues = unresolvedIssues
    .map((issue): AuthoringIssueView => {
      const state = authoringIssueState(issue);
      const availableOutcomes = allowedAuthoringIssueOutcomes(issue);
      return {
        issueId: issue.issueId,
        type: issue.type,
        sourceLineLabel: sourceLineLabel(document, issue.sourceRowIds),
        rawText: rawTextForIssue(document, issue),
        reason: issueReason(issue),
        expectedInput: issueExpectedInput(issue),
        blockedResult: issueBlockedResult(issue),
        sourceRowIds: [...issue.sourceRowIds],
        ...(issue.itemId ? { itemId: issue.itemId } : {}),
        state: state === "held" ? "held" : "open",
        blocking: issue.blocking,
        availableOutcomes,
      };
    })
    .sort(
      (left, right) =>
        issueSortRank(left.state, left.availableOutcomes) -
        issueSortRank(right.state, right.availableOutcomes),
    );
  return {
    steps,
    items,
    counts: {
      steps: steps.length,
      items: items.length,
      included: items.filter(
        (item) => item.included && ["item", "completion"].includes(item.role),
      ).length,
      unresolved: unresolvedIssues.length,
      resources: items.filter((item) => item.role === "resource").length,
    },
    issues,
  };
}

export function inputKindLabels(
  document: TextAuthoringDocument | null,
): string[] {
  return document?.inputKinds.map((kind) => INPUT_KIND_LABEL[kind]) ?? [];
}

export function inputKindSummary(
  document: TextAuthoringDocument | null,
): string {
  if (!document) return "입력 전";
  return document.inputKinds.map((kind) => INPUT_KIND_LABEL[kind]).join(" + ");
}

export function normalizeArtifactKind(
  value: string | undefined,
): AuthoringArtifactKind {
  if (value === "calendar" || value === "sheet" || value === "memo")
    return value;
  return "todo";
}

export function toPreflightView(
  preflight: AuthoringArtifactPreflight | null,
): AuthoringPreflightView | null {
  if (!preflight) return null;
  return {
    artifact: ARTIFACT_LABEL[preflight.artifact],
    eligibleCount: preflight.count,
    excludedCount: preflight.omittedCount,
    undatedCount: preflight.losses.filter(
      (loss) => loss.reason === "undated_item",
    ).length,
    loss: preflight.losses.map((loss) => loss.message),
    dateRange: preflight.dateRange
      ? `${preflight.dateRange.start} ~ ${preflight.dateRange.end}`
      : "확정 날짜 없음",
  };
}

export function toDraftView(
  summary: TextAuthoringDraftRecord,
): AuthoringDraftView {
  const source =
    summary.document.sourceTitle ||
    summary.document.sourceUrl ||
    summary.document.rawText.split(/\r?\n/u).find(Boolean) ||
    "출처 이름 없음";
  return {
    draftId: summary.draftId,
    title: summary.title,
    source,
    ownership: summary.ownership,
    primaryArtifact: summary.primaryArtifact
      ? ARTIFACT_LABEL[normalizeArtifactKind(summary.primaryArtifact)]
      : ARTIFACT_LABEL[
          normalizeArtifactKind(
            summary.document.parseResult.canonical.flow.primaryArtifact,
          )
        ],
    stepCount: summary.document.parseResult.canonical.steps.length,
    itemCount: summary.document.parseResult.canonical.items.length,
    issueCount: summary.document.parseResult.issues.filter(
      isAuthoringIssueOutstanding,
    ).length,
    revisionLabel: summary.revisionId,
    updatedAtLabel: formatKoreanDateTime(summary.updatedAt),
    lastSavedAtLabel: formatKoreanDateTime(summary.lastSavedAt),
    archived: summary.status === "archived",
    status: DRAFT_STATUS_LABEL[summary.status],
  };
}

export function toSaveReceiptView(
  receipt: TextAuthoringSaveReceipt,
): AuthoringReceiptView {
  return {
    receiptId: receipt.receiptId,
    title: receipt.title,
    ownership: receipt.ownership,
    ownershipLabel:
      receipt.ownership === "creator"
        ? "제작자 초안"
        : receipt.ownership === "suggestion"
          ? "수정 제안"
          : "개인 초안",
    revisionLabel: receipt.revisionId,
    artifact: ARTIFACT_LABEL[receipt.artifact],
    stepCount: receipt.stepCount,
    itemCount: receipt.itemCount,
    sourcePreserved: receipt.sourcePreserved,
    reviewRequiredCount: receipt.reviewState.requiredGateIds.length,
    reviewEvidenceCount: receipt.reviewState.evidenceRecordedGateIds.length,
    reviewPersonalOnlyCount: receipt.reviewState.personalOnlyGateIds.length,
    sourceState: receipt.sourceState.status,
    sourceOpenChangeCount: receipt.sourceState.openChangeCount,
    savedAtLabel: formatKoreanDateTime(receipt.savedAt),
  };
}

export function formatKoreanDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
