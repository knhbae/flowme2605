import {
  normalizeAuthoringText,
  stableAuthoringHash,
  stableAuthoringId,
} from "./identity";
import type {
  AuthoringParseResult,
  AuthoringSourceLocator,
  AuthoringSourceRange,
  AuthoringTargetKind,
  CanonicalAuthoringItem,
  UnresolvedAuthoringIssue,
} from "./types";

export type AuthoringFlowViewStatus =
  "current" | "raw-only-stale" | "raw-only-too-large";

/**
 * Live-editor decoration budget, separate from the P1-C source input budget.
 * Above this exact source-line count the source remains authoritative and the
 * editor fails closed to one byte-exact literal block instead of creating a
 * large decoration tree.
 */
export const AUTHORING_FLOW_VIEW_STRUCTURED_SOURCE_UNIT_LIMIT = 1_000;

export type AuthoringFlowViewAttentionReason =
  "ambiguous" | "invalid" | "unsupported" | "review";

export type AuthoringFlowViewAttention = {
  reason: AuthoringFlowViewAttentionReason;
  issueIds: readonly string[];
};

export type AuthoringFlowViewActionMarker =
  | { kind: "checkbox"; checked: boolean }
  | { kind: "bullet" }
  | { kind: "ordered"; ordinal: string };

export type AuthoringFlowViewOwner =
  | { kind: "flow"; id: string }
  | { kind: "step"; id: string }
  | { kind: "item"; id: string };

export type AuthoringFlowViewTextStyle =
  | "prose"
  | "link"
  | "blockquote"
  | "code"
  | "html"
  | "comment"
  | "table"
  | "metadata"
  | "literal";

type AuthoringFlowViewBlockBase = {
  blockId: string;
  /** Exact source slice, including its original CRLF/LF/CR terminator. */
  rawText: string;
  /** Display text derived only from the current raw source. */
  text: string;
  locator: AuthoringSourceLocator;
  /** Textarea selection range. It intentionally excludes the line terminator. */
  selectionRange: AuthoringSourceRange;
  attention?: AuthoringFlowViewAttention;
};

export type AuthoringFlowViewBlock =
  | (AuthoringFlowViewBlockBase & {
      kind: "heading";
      level: 1 | 2 | 3 | 4 | 5 | 6;
    })
  | (AuthoringFlowViewBlockBase & {
      kind: "action";
      marker: AuthoringFlowViewActionMarker;
      depth: number;
      entity: {
        kind: "item" | "subcheck";
        id: string;
        ownerItemId: string;
      };
    })
  | (AuthoringFlowViewBlockBase & {
      kind: "property";
      label: string;
      value: string;
      /** Exact indentation level read from this source line. */
      depth: number;
      owner: AuthoringFlowViewOwner;
    })
  | (AuthoringFlowViewBlockBase & {
      kind: "text";
      style: AuthoringFlowViewTextStyle;
    })
  | (AuthoringFlowViewBlockBase & {
      kind: "blank";
    });

export type AuthoringFlowViewHierarchyRole =
  | "none"
  | "root-action"
  | "child-action"
  | "flow-property"
  | "step-property"
  | "item-property";

export type AuthoringFlowViewHierarchy = {
  /** The live editor intentionally presents only the supported root/child pair. */
  depth: 0 | 1;
  role: AuthoringFlowViewHierarchyRole;
};

/**
 * Maps exact source indentation and canonical ownership to the one supported
 * visual hierarchy. This is presentation-only: it never promotes a deeper
 * source row or changes the canonical Item/ChecklistEntry relationship.
 */
export function getAuthoringFlowViewHierarchy(
  block: AuthoringFlowViewBlock,
): AuthoringFlowViewHierarchy {
  if (block.kind === "action") {
    // Canonical ownership, not visual whitespace alone, decides whether an
    // action is a child. An indented bullet/ordered row can still be its own
    // Item, so presenting it as a checklist child would change its meaning.
    const child = block.entity.kind === "subcheck";
    return {
      depth: child ? 1 : 0,
      role: child ? "child-action" : "root-action",
    };
  }

  if (block.kind === "property") {
    if (block.owner.kind === "item") {
      return { depth: 1, role: "item-property" };
    }
    return {
      depth: 0,
      role:
        block.owner.kind === "step" ? "step-property" : "flow-property",
    };
  }

  return { depth: 0, role: "none" };
}

export type AuthoringFlowViewModel = {
  status: AuthoringFlowViewStatus;
  blocks: AuthoringFlowViewBlock[];
  exactSourceCoverage: true;
};

export type BuildAuthoringFlowViewModelInput = {
  documentId: string;
  rawText: string;
  parseResult: AuthoringParseResult;
};

type ExactSourceLine = {
  line: number;
  startOffset: number;
  contentEndOffset: number;
  endOffset: number;
  content: string;
  rawText: string;
  syntaxStyle?: AuthoringFlowViewTextStyle;
};

type SemanticTarget = {
  kind: AuthoringTargetKind;
  targetId: string;
};

type ParsedActionSyntax = {
  marker: AuthoringFlowViewActionMarker;
  depth: number;
  text: string;
};

type SubcheckMatch = {
  item: CanonicalAuthoringItem;
  entry: NonNullable<CanonicalAuthoringItem["subchecks"]>[number];
  order: number;
};

const PROTECTED_LONG_DOCUMENT_STYLES = new Map<
  NonNullable<AuthoringParseResult["longDocument"]>["blocks"][number]["kind"],
  AuthoringFlowViewTextStyle
>([
  ["blockquote", "blockquote"],
  ["code_fence", "code"],
  ["html", "html"],
  ["comment", "comment"],
  ["table", "table"],
]);

const PROPERTY_TARGET_KINDS = new Set<AuthoringTargetKind>([
  "detail",
  "completion",
  "field",
  "resource",
  "guide",
  "caution",
  "source",
]);

function splitExactSourceLines(rawText: string): ExactSourceLine[] {
  if (rawText.length === 0) return [];

  const lines: ExactSourceLine[] = [];
  const matcher = /([^\r\n]*)(\r\n|\r|\n|$)/gu;
  let match: RegExpExecArray | null;
  let line = 1;
  let insideFence = false;

  while ((match = matcher.exec(rawText)) !== null) {
    if (match[0] === "") break;
    const content = match[1];
    const trimmed = content.trim();
    let syntaxStyle: AuthoringFlowViewTextStyle | undefined;

    if (/^(?:```|~~~)/u.test(trimmed)) {
      syntaxStyle = "code";
      insideFence = !insideFence;
    } else if (insideFence) {
      syntaxStyle = "code";
    } else if (/^<!--\s*flowme:/u.test(trimmed)) {
      syntaxStyle = "metadata";
    } else if (/^<!--/u.test(trimmed)) {
      syntaxStyle = "comment";
    } else if (/^>/u.test(trimmed)) {
      syntaxStyle = "blockquote";
    } else if (/^<[^>]+>/u.test(trimmed)) {
      syntaxStyle = "html";
    }

    lines.push({
      line,
      startOffset: match.index,
      contentEndOffset: match.index + content.length,
      endOffset: match.index + match[0].length,
      content,
      rawText: match[0],
      ...(syntaxStyle ? { syntaxStyle } : {}),
    });
    line += 1;
  }

  // A terminal line ending creates a real editable blank line even though its
  // exact source slice is empty. Keeping that zero-width block lets the live
  // editor place the caret after Enter without changing source coverage.
  if (/(?:\r\n|\r|\n)$/u.test(rawText)) {
    lines.push({
      line,
      startOffset: rawText.length,
      contentEndOffset: rawText.length,
      endOffset: rawText.length,
      content: "",
      rawText: "",
    });
  }

  return lines;
}

function countExactSourceUnits(rawText: string): number {
  if (rawText.length === 0) return 0;

  let units = 0;
  for (let index = 0; index < rawText.length; index += 1) {
    const character = rawText[index];
    if (character === "\r") {
      units += 1;
      if (rawText[index + 1] === "\n") index += 1;
    } else if (character === "\n") {
      units += 1;
    }
  }
  if (!/[\r\n]/u.test(rawText.at(-1) ?? "")) units += 1;
  return units;
}

function sourceRange(line: ExactSourceLine): AuthoringSourceRange {
  return {
    startOffset: line.startOffset,
    endOffset: line.contentEndOffset,
    startLine: line.line,
    endLine: line.line,
  };
}

function sourceLocator(line: ExactSourceLine): AuthoringSourceLocator {
  return {
    startOffset: line.startOffset,
    endOffset: line.endOffset,
    startLine: line.line,
    endLine: line.line,
    rawHash: stableAuthoringHash(line.rawText),
    byteExact: true,
  };
}

function rangesOverlap(
  left: AuthoringSourceRange,
  right: AuthoringSourceRange,
): boolean {
  return (
    left.startOffset < right.endOffset && right.startOffset < left.endOffset
  );
}

function indexRangesByLine<T>(
  entries: readonly T[],
  lineCount: number,
  rangeOf: (entry: T) => Pick<AuthoringSourceRange, "startLine" | "endLine">,
): Map<number, T[]> {
  const indexed = new Map<number, T[]>();
  for (const entry of entries) {
    const range = rangeOf(entry);
    const startLine = Math.max(1, Math.trunc(range.startLine));
    const endLine = Math.min(lineCount, Math.trunc(range.endLine));
    for (let line = startLine; line <= endLine; line += 1) {
      const values = indexed.get(line) ?? [];
      values.push(entry);
      indexed.set(line, values);
    }
  }
  return indexed;
}

function rangeIsCurrent(rawText: string, range: AuthoringSourceRange): boolean {
  return (
    Number.isInteger(range.startOffset) &&
    Number.isInteger(range.endOffset) &&
    range.startOffset >= 0 &&
    range.endOffset >= range.startOffset &&
    range.endOffset <= rawText.length &&
    range.startLine >= 1 &&
    range.endLine >= range.startLine
  );
}

function parseResultIsCurrent(
  documentId: string,
  rawText: string,
  parseResult: AuthoringParseResult,
): boolean {
  const expectedParseResultId = stableAuthoringId(
    "parse-result",
    documentId,
    parseResult.fixtureVersion,
    parseResult.parserVersion,
    normalizeAuthoringText(rawText),
  );
  if (parseResult.parseResultId !== expectedParseResultId) return false;

  const activeRows = parseResult.canonical.sourceRows.filter(
    (row) => row.state !== "tombstone",
  );
  const rowsCurrent = activeRows.every(
    (row) =>
      rangeIsCurrent(rawText, row.sourceRange) &&
      rawText.slice(row.sourceRange.startOffset, row.sourceRange.endOffset) ===
        row.rawText,
  );
  if (!rowsCurrent) return false;

  const blocksCurrent = parseResult.blocks
    .filter((block) => block.state !== "tombstone")
    .every(
      (block) =>
        rangeIsCurrent(rawText, block.sourceRange) &&
        rawText.slice(
          block.sourceRange.startOffset,
          block.sourceRange.endOffset,
        ) === block.rawText,
    );
  if (!blocksCurrent) return false;

  if (
    rawText.trim().length > 0 &&
    activeRows.length === 0 &&
    !parseResult.longDocument?.fallbackActive &&
    parseResult.longDocument?.status !== "txt-only"
  ) {
    return false;
  }

  return true;
}

function longDocumentIsTooLarge(parseResult: AuthoringParseResult): boolean {
  const analysis = parseResult.longDocument;
  if (!analysis) return false;
  return (
    analysis.budget.exceeded.length > 0 ||
    analysis.lossManifest.some((loss) => loss.reason === "too-large")
  );
}

function wholeLiteralBlock(
  documentId: string,
  rawText: string,
  reason: "stale-parse" | "too-large",
): AuthoringFlowViewBlock[] {
  if (rawText.length === 0) return [];
  const endLine = countExactSourceUnits(rawText);
  const locator: AuthoringSourceLocator = {
    startOffset: 0,
    endOffset: rawText.length,
    startLine: 1,
    endLine,
    rawHash: stableAuthoringHash(rawText),
    byteExact: true,
  };
  return [
    {
      blockId: stableAuthoringId(
        "flow-view-block",
        documentId,
        reason,
        locator.rawHash,
      ),
      kind: "text",
      style: "literal",
      rawText,
      text: rawText,
      locator,
      selectionRange: {
        startOffset: 0,
        endOffset: rawText.length,
        startLine: 1,
        endLine,
      },
    },
  ];
}

function baseBlock(
  documentId: string,
  line: ExactSourceLine,
  semanticIdentity: string,
  text = line.content,
  attention?: AuthoringFlowViewAttention,
): AuthoringFlowViewBlockBase {
  const locator = sourceLocator(line);
  return {
    blockId: stableAuthoringId(
      "flow-view-block",
      documentId,
      semanticIdentity,
      locator.startOffset,
      locator.endOffset,
      locator.rawHash,
    ),
    rawText: line.rawText,
    text,
    locator,
    selectionRange: sourceRange(line),
    ...(attention ? { attention } : {}),
  };
}

function textBlock(
  documentId: string,
  line: ExactSourceLine,
  style: AuthoringFlowViewTextStyle,
  attention?: AuthoringFlowViewAttention,
): AuthoringFlowViewBlock {
  return {
    ...baseBlock(
      documentId,
      line,
      `text:${style}:${attention?.reason ?? "quiet"}`,
      line.content,
      attention,
    ),
    kind: "text",
    style,
  };
}

function isQuietPlainIssue(issue: UnresolvedAuthoringIssue): boolean {
  return (
    issue.type === "ambiguous_role" &&
    issue.messageKey === "authoring.ambiguous_plain_sentence"
  );
}

function attentionForIssues(
  issues: UnresolvedAuthoringIssue[],
): AuthoringFlowViewAttention | undefined {
  const actionable = issues.filter((issue) => !isQuietPlainIssue(issue));
  if (actionable.length === 0) return undefined;

  let reason: AuthoringFlowViewAttentionReason;
  if (
    actionable.some((issue) =>
      ["invalid_date", "invalid_url", "invalid_recurrence"].includes(
        issue.type,
      ),
    )
  ) {
    reason = "invalid";
  } else if (actionable.some((issue) => issue.type === "ambiguous_role")) {
    reason = "ambiguous";
  } else if (
    actionable.some((issue) =>
      [
        "source_import_required",
        "rights_review_required",
        "safety_review_required",
      ].includes(issue.type),
    )
  ) {
    reason = "review";
  } else {
    reason = "unsupported";
  }

  return {
    reason,
    issueIds: actionable.map((issue) => issue.issueId),
  };
}

function propertyParts(value: string): { label: string; value: string } {
  const normalized = value
    .trim()
    .replace(/^[-*+]\s+/u, "")
    .trim();
  const match = /^([^:：]{1,32})[:：]\s*(.*)$/u.exec(normalized);
  if (!match) return { label: "원문 정보", value: normalized };
  return { label: match[1].trim(), value: match[2] };
}

function indentationDepth(value: string): number {
  return Math.floor(value.replace(/\t/gu, "  ").length / 2);
}

function sourceIndentationDepth(value: string): number {
  return indentationDepth(/^[ \t]*/u.exec(value)?.[0] ?? "");
}

function parseActionSyntax(value: string): ParsedActionSyntax | undefined {
  const checkbox = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.+)$/u.exec(value);
  if (checkbox) {
    return {
      marker: {
        kind: "checkbox",
        checked: checkbox[2].toLocaleLowerCase() === "x",
      },
      depth: indentationDepth(checkbox[1]),
      text: checkbox[3].trim(),
    };
  }

  const ordered = /^(\s*)(\d+)[.)]\s+(.+)$/u.exec(value);
  if (ordered) {
    return {
      marker: { kind: "ordered", ordinal: ordered[2] },
      depth: indentationDepth(ordered[1]),
      text: ordered[3].trim(),
    };
  }

  const bullet = /^(\s*)[-*+]\s+(.+)$/u.exec(value);
  if (bullet) {
    return {
      marker: { kind: "bullet" },
      depth: indentationDepth(bullet[1]),
      text: bullet[2].trim(),
    };
  }

  return undefined;
}

function parseHeadingSyntax(
  value: string,
): { level: 1 | 2 | 3 | 4 | 5 | 6; text: string } | undefined {
  const match = /^\s*(#{1,6})\s+(.+)$/u.exec(value);
  if (!match) return undefined;
  return {
    level: match[1].length as 1 | 2 | 3 | 4 | 5 | 6,
    text: match[2].trim(),
  };
}

function uniqueTargets(targets: SemanticTarget[]): SemanticTarget[] {
  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.kind}:${target.targetId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function protectedStyleForLine(
  line: ExactSourceLine,
  longBlocks: NonNullable<AuthoringParseResult["longDocument"]>["blocks"],
): AuthoringFlowViewTextStyle | undefined {
  const lineRange = sourceRange(line);
  const longBlock = longBlocks.find(
    (block) =>
      PROTECTED_LONG_DOCUMENT_STYLES.has(block.kind) &&
      rangesOverlap(lineRange, block.locator),
  );
  return longBlock
    ? PROTECTED_LONG_DOCUMENT_STYLES.get(longBlock.kind)
    : line.syntaxStyle;
}

function textStyleForUnmappedLine(
  line: ExactSourceLine,
  rowTypes: Set<
    AuthoringParseResult["canonical"]["sourceRows"][number]["rowType"]
  >,
): AuthoringFlowViewTextStyle {
  if (rowTypes.has("table_row") || line.content.includes("\t")) return "table";
  if (/^https?:\/\/\S+$/iu.test(line.content.trim())) return "link";
  if (rowTypes.has("unsupported")) return "literal";
  return "prose";
}

function resolveOwner(
  target: SemanticTarget,
  parseResult: AuthoringParseResult,
  itemById: Map<string, CanonicalAuthoringItem>,
  stepIds: Set<string>,
  ownerByFieldId: Map<string, AuthoringFlowViewOwner>,
): AuthoringFlowViewOwner | undefined {
  if (itemById.has(target.targetId)) {
    return { kind: "item", id: target.targetId };
  }
  if (stepIds.has(target.targetId)) {
    return { kind: "step", id: target.targetId };
  }
  if (target.targetId === parseResult.canonical.flow.flowId) {
    return { kind: "flow", id: target.targetId };
  }
  return ownerByFieldId.get(target.targetId);
}

function buildCurrentBlocks(
  input: BuildAuthoringFlowViewModelInput,
): AuthoringFlowViewBlock[] {
  const { documentId, rawText, parseResult } = input;
  const sourceLines = splitExactSourceLines(rawText);
  const lineCount = sourceLines.length;
  const sourceRows = parseResult.canonical.sourceRows.filter(
    (row) => row.state !== "tombstone",
  );
  const parserBlocks = parseResult.blocks.filter(
    (block) => block.state !== "tombstone",
  );
  const sourceRowsByLine = indexRangesByLine(
    sourceRows,
    lineCount,
    (row) => row.sourceRange,
  );
  const parserBlocksByLine = indexRangesByLine(
    parserBlocks,
    lineCount,
    (block) => block.sourceRange,
  );
  const issuesByLine = indexRangesByLine(
    parseResult.issues,
    lineCount,
    (issue) => issue.sourceRange,
  );
  const issuesBySourceRowId = new Map<string, UnresolvedAuthoringIssue[]>();
  for (const issue of parseResult.issues) {
    for (const sourceRowId of issue.sourceRowIds) {
      const values = issuesBySourceRowId.get(sourceRowId) ?? [];
      values.push(issue);
      issuesBySourceRowId.set(sourceRowId, values);
    }
  }
  const protectedLongBlocks = (parseResult.longDocument?.blocks ?? []).filter(
    (block) => PROTECTED_LONG_DOCUMENT_STYLES.has(block.kind),
  );
  const protectedLongBlocksByLine = indexRangesByLine(
    protectedLongBlocks,
    lineCount,
    (block) => block.locator,
  );
  const itemById = new Map(
    parseResult.canonical.items.map((item) => [item.itemId, item]),
  );
  const stepIds = new Set(
    parseResult.canonical.steps.map((step) => step.stepId),
  );
  const ownerByFieldId = new Map<string, AuthoringFlowViewOwner>(
    parseResult.canonical.fields.map((field) => [
      field.fieldId,
      { kind: field.owner.type, id: field.owner.id },
    ]),
  );

  const subcheckBySourceRowId = new Map<string, SubcheckMatch>();
  let subcheckOrder = 0;
  for (const item of parseResult.canonical.items) {
    for (const entry of item.subchecks ?? []) {
      for (const sourceRowId of entry.sourceRowIds) {
        if (!subcheckBySourceRowId.has(sourceRowId)) {
          subcheckBySourceRowId.set(sourceRowId, {
            item,
            entry,
            order: subcheckOrder,
          });
        }
      }
      subcheckOrder += 1;
    }
  }

  const mappingByBlockId = new Map<string, SemanticTarget[]>();
  for (const mapping of parseResult.mappings) {
    for (const blockId of mapping.blockIds) {
      const targets = mappingByBlockId.get(blockId) ?? [];
      targets.push({
        kind: mapping.targetKind,
        targetId: mapping.targetDraftId,
      });
      mappingByBlockId.set(blockId, targets);
    }
  }

  return sourceLines.map((line): AuthoringFlowViewBlock => {
    const range = sourceRange(line);
    if (line.content.length === 0) {
      return {
        ...baseBlock(documentId, line, "blank"),
        kind: "blank",
      };
    }

    const rows = (sourceRowsByLine.get(line.line) ?? []).filter((row) =>
      rangesOverlap(range, row.sourceRange),
    );
    const rowIds = new Set(rows.map((row) => row.sourceRowId));
    const issueCandidates = new Map<string, UnresolvedAuthoringIssue>();
    for (const issue of issuesByLine.get(line.line) ?? []) {
      issueCandidates.set(issue.issueId, issue);
    }
    for (const sourceRowId of rowIds) {
      for (const issue of issuesBySourceRowId.get(sourceRowId) ?? []) {
        issueCandidates.set(issue.issueId, issue);
      }
    }
    const issues = [...issueCandidates.values()].filter(
      (issue) =>
        issue.sourceRowIds.some((sourceRowId) => rowIds.has(sourceRowId)) ||
        rangesOverlap(range, issue.sourceRange),
    );
    const rowTypes = new Set(rows.map((row) => row.rowType));

    const protectedStyle = protectedStyleForLine(
      line,
      protectedLongBlocksByLine.get(line.line) ?? [],
    );
    if (protectedStyle || rowTypes.has("table_row")) {
      return textBlock(documentId, line, protectedStyle ?? "table");
    }
    if (/^https?:\/\/\S+$/iu.test(line.content.trim())) {
      return textBlock(documentId, line, "link");
    }

    if (issues.length > 0) {
      const attention = attentionForIssues(issues);
      return textBlock(
        documentId,
        line,
        attention ? "literal" : "prose",
        attention,
      );
    }

    const overlappingBlocks = (parserBlocksByLine.get(line.line) ?? []).filter(
      (block) => rangesOverlap(range, block.sourceRange),
    );
    const targets = uniqueTargets(
      overlappingBlocks.flatMap(
        (block) => mappingByBlockId.get(block.blockId) ?? [],
      ),
    );
    if (targets.length !== 1) {
      return textBlock(
        documentId,
        line,
        targets.length > 1
          ? "literal"
          : textStyleForUnmappedLine(line, rowTypes),
        targets.length > 1 ? { reason: "ambiguous", issueIds: [] } : undefined,
      );
    }

    const target = targets[0];
    const subcheck = [...rowIds]
      .map((sourceRowId) => subcheckBySourceRowId.get(sourceRowId))
      .filter((candidate) => candidate !== undefined)
      .sort((left, right) => left.order - right.order)[0];
    if (subcheck) {
      const syntax = parseActionSyntax(line.content);
      if (syntax?.marker.kind === "checkbox") {
        return {
          ...baseBlock(
            documentId,
            line,
            `action:subcheck:${subcheck.entry.subcheckId}`,
            syntax.text,
          ),
          kind: "action",
          marker: syntax.marker,
          depth: syntax.depth,
          entity: {
            kind: "subcheck",
            id: subcheck.entry.subcheckId,
            ownerItemId: subcheck.item.itemId,
          },
        };
      }
      return textBlock(documentId, line, "literal");
    }

    const heading = parseHeadingSyntax(line.content);
    if (
      heading &&
      ((target.kind === "flow" &&
        target.targetId === parseResult.canonical.flow.flowId) ||
        (target.kind === "step" && stepIds.has(target.targetId)))
    ) {
      return {
        ...baseBlock(
          documentId,
          line,
          `heading:${target.kind}:${target.targetId}`,
          heading.text,
        ),
        kind: "heading",
        level: heading.level,
      };
    }

    if (target.kind === "item") {
      const item = itemById.get(target.targetId);
      const syntax = parseActionSyntax(line.content);
      if (item && syntax) {
        return {
          ...baseBlock(
            documentId,
            line,
            `action:item:${item.itemId}`,
            syntax.text,
          ),
          kind: "action",
          marker: syntax.marker,
          depth: syntax.depth,
          entity: {
            kind: "item",
            id: item.itemId,
            ownerItemId: item.itemId,
          },
        };
      }
      return textBlock(documentId, line, item ? "prose" : "literal");
    }

    if (rowTypes.has("property") || PROPERTY_TARGET_KINDS.has(target.kind)) {
      const owner = resolveOwner(
        target,
        parseResult,
        itemById,
        stepIds,
        ownerByFieldId,
      );
      if (owner) {
        const parts = propertyParts(line.content);
        return {
          ...baseBlock(
            documentId,
            line,
            `property:${target.kind}:${target.targetId}`,
            line.content,
          ),
          kind: "property",
          label: parts.label,
          value: parts.value,
          depth: sourceIndentationDepth(line.content),
          owner,
        };
      }
      return textBlock(documentId, line, "literal");
    }

    return textBlock(
      documentId,
      line,
      textStyleForUnmappedLine(line, rowTypes),
    );
  });
}

function modelFromBlocks(
  rawText: string,
  status: AuthoringFlowViewStatus,
  blocks: AuthoringFlowViewBlock[],
): AuthoringFlowViewModel {
  if (blocks.map((block) => block.rawText).join("") !== rawText) {
    throw new Error("Flow view source coverage invariant failed.");
  }
  return {
    status,
    blocks,
    exactSourceCoverage: true,
  };
}

/**
 * Builds the source-ordered semantic decoration model for the hybrid editor.
 * It never changes source, canonical data, revision history, or projections.
 * Visible text and markers come from exact raw source; canonical data is used
 * only to validate semantic mapping and ownership. Stale or ambiguous lineage
 * fails closed to literal source that remains directly editable.
 */
export function buildAuthoringFlowViewModel(
  input: BuildAuthoringFlowViewModelInput,
): AuthoringFlowViewModel {
  const { documentId, rawText, parseResult } = input;
  if (
    countExactSourceUnits(rawText) >
    AUTHORING_FLOW_VIEW_STRUCTURED_SOURCE_UNIT_LIMIT
  ) {
    return modelFromBlocks(
      rawText,
      "raw-only-too-large",
      wholeLiteralBlock(documentId, rawText, "too-large"),
    );
  }
  if (longDocumentIsTooLarge(parseResult)) {
    return modelFromBlocks(
      rawText,
      "raw-only-too-large",
      wholeLiteralBlock(documentId, rawText, "too-large"),
    );
  }
  if (!parseResultIsCurrent(documentId, rawText, parseResult)) {
    return modelFromBlocks(
      rawText,
      "raw-only-stale",
      wholeLiteralBlock(documentId, rawText, "stale-parse"),
    );
  }
  return modelFromBlocks(rawText, "current", buildCurrentBlocks(input));
}
