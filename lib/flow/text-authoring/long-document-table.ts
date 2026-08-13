import { stableAuthoringHash, stableAuthoringId } from "./identity";
import type {
  AuthoringInputBudgetLimits,
  AuthoringLongDocumentAnalysis,
  AuthoringLongDocumentBlock,
  AuthoringLongDocumentBlockKind,
  AuthoringLongDocumentLoss,
  AuthoringLongDocumentTable,
  AuthoringLongDocumentTableCell,
  AuthoringLongDocumentTableRow,
  AuthoringSourceLocator,
  AuthoringTableBlockLossManifest,
  AuthoringTableLossManifest,
  AuthoringTableLossPreservedShape,
  AuthoringTableLossUnsupportedShape,
} from "./types";

export const AUTHORING_LONG_DOCUMENT_LIMITS: AuthoringInputBudgetLimits = {
  utf8Bytes: 1024 * 1024,
  lines: 20_000,
  logicalCells: 50_000,
};

export type AnalyzeAuthoringLongDocumentOptions = {
  enabled?: boolean;
  safeFallbackWhenDisabled?: boolean;
  limits?: Partial<AuthoringInputBudgetLimits>;
  documentId?: string;
  workingRevisionId?: string;
};

const LOSS_CONTRACT_VERSION = "p1-c-long-document-v1" as const;
const TABLE_LOSS_CONTRACT_VERSION = "p1-c-table-loss-v1" as const;

type SourceLine = {
  raw: string;
  eol: string;
  contentEndOffset: number;
  endOffset: number;
  startOffset: number;
  line: number;
};

type ParsedDelimitedRecord = {
  values: string[];
  cellSpans: Array<{ start: number; end: number; raw: string }>;
  complete: boolean;
  overflow: boolean;
};

type TableCandidate = {
  format: AuthoringLongDocumentTable["format"];
  start: number;
  end: number;
  records: ParsedDelimitedRecord[];
  kinds: AuthoringLongDocumentTableRow["kind"][];
  recordLines: Array<{ start: number; end: number }>;
  issues: string[];
  cellOverflow?: true;
};

function splitSourceLines(rawText: string): SourceLine[] {
  const lines: SourceLine[] = [];
  const matcher = /([^\r\n]*)(\r\n|\r|\n|$)/gu;
  let match: RegExpExecArray | null;
  let line = 1;
  while ((match = matcher.exec(rawText)) !== null) {
    if (match[0] === "") break;
    const startOffset = match.index;
    lines.push({
      raw: match[1],
      eol: match[2],
      contentEndOffset: startOffset + match[1].length,
      endOffset: startOffset + match[0].length,
      startOffset,
      line,
    });
    line += 1;
    if (match[2] === "") break;
  }
  if (rawText === "") {
    lines.push({
      raw: "",
      eol: "",
      contentEndOffset: 0,
      endOffset: 0,
      startOffset: 0,
      line: 1,
    });
  }
  return lines;
}

function countSourceLines(rawText: string, stopAfter?: number): number {
  if (!rawText) return 1;
  let count = 1;
  for (let index = 0; index < rawText.length; index += 1) {
    const character = rawText[index];
    if (character === "\r") {
      count += 1;
      if (rawText[index + 1] === "\n") index += 1;
    } else if (character === "\n") {
      count += 1;
    }
    if (stopAfter !== undefined && count > stopAfter) return count;
  }
  return count;
}

function utf8Bytes(value: string, stopAfter?: number): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
    if (stopAfter !== undefined && bytes > stopAfter) return bytes;
  }
  return bytes;
}

function locatorFor(
  rawText: string,
  lines: SourceLine[],
  startOffset: number,
  endOffset: number,
): AuthoringSourceLocator {
  const safeStart = Math.max(0, Math.min(startOffset, rawText.length));
  const safeEnd = Math.max(safeStart, Math.min(endOffset, rawText.length));
  const startLine =
    lines.find(
      (line) =>
        safeStart < line.endOffset || safeStart <= line.contentEndOffset,
    )?.line ??
    lines.at(-1)?.line ??
    1;
  const endProbe = safeEnd > safeStart ? safeEnd - 1 : safeStart;
  const endLine =
    lines.find(
      (line) => endProbe < line.endOffset || endProbe <= line.contentEndOffset,
    )?.line ??
    lines.at(-1)?.line ??
    startLine;
  return {
    startOffset: safeStart,
    endOffset: safeEnd,
    startLine,
    endLine,
    rawHash: stableAuthoringHash(rawText.slice(safeStart, safeEnd)),
    byteExact: true,
  };
}

function quotedDelimitedRecord(
  raw: string,
  delimiter: "," | "\t",
  maxCells = Number.POSITIVE_INFINITY,
): ParsedDelimitedRecord {
  const values: string[] = [];
  const cellSpans: ParsedDelimitedRecord["cellSpans"] = [];
  let value = "";
  let quoted = false;
  let cellStart = 0;
  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (character === '"') {
      if (quoted && raw[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === delimiter && !quoted) {
      if (values.length >= maxCells) {
        return { values: [], cellSpans: [], complete: true, overflow: true };
      }
      values.push(value.trim());
      cellSpans.push({
        start: cellStart,
        end: index,
        raw: raw.slice(cellStart, index),
      });
      value = "";
      cellStart = index + 1;
      continue;
    }
    value += character;
  }
  if (values.length >= maxCells) {
    return { values: [], cellSpans: [], complete: true, overflow: true };
  }
  values.push(value.trim());
  cellSpans.push({
    start: cellStart,
    end: raw.length,
    raw: raw.slice(cellStart),
  });
  return { values, cellSpans, complete: !quoted, overflow: false };
}

function csvRecord(raw: string): ParsedDelimitedRecord {
  return quotedDelimitedRecord(raw, ",");
}

function markdownRecord(
  raw: string,
  maxCells = Number.POSITIVE_INFINITY,
): ParsedDelimitedRecord {
  const values: string[] = [];
  const cellSpans: ParsedDelimitedRecord["cellSpans"] = [];
  const trimmedStart = raw.search(/\S/u);
  const outerStart =
    trimmedStart >= 0 && raw[trimmedStart] === "|"
      ? trimmedStart + 1
      : Math.max(0, trimmedStart);
  let end = raw.trimEnd().length;
  if (end > outerStart && raw[end - 1] === "|") end -= 1;
  let start = outerStart;
  let escaped = false;
  for (let index = outerStart; index <= end; index += 1) {
    const character = raw[index];
    if (index < end && character === "\\" && !escaped) {
      escaped = true;
      continue;
    }
    if (index === end || (character === "|" && !escaped)) {
      if (values.length >= maxCells) {
        return { values: [], cellSpans: [], complete: true, overflow: true };
      }
      const cellRaw = raw.slice(start, index);
      values.push(cellRaw.trim().replace(/\\\|/gu, "|"));
      cellSpans.push({ start, end: index, raw: cellRaw });
      start = index + 1;
    }
    escaped = false;
  }
  return { values, cellSpans, complete: true, overflow: false };
}

function isMarkdownSeparator(record: ParsedDelimitedRecord): boolean {
  return (
    record.values.length >= 2 &&
    record.values.every((cell) => /^:?-{3,}:?$/u.test(cell))
  );
}

function looksLikeCsvHeader(record: ParsedDelimitedRecord): boolean {
  if (!record.complete || record.values.length < 2) return false;
  return record.values.every((cell) => cell.length > 0 && cell.length <= 80);
}

function isPlausibleHeader(record: ParsedDelimitedRecord): boolean {
  return (
    record.complete &&
    record.values.length >= 2 &&
    record.values.some((cell) => cell.length > 0) &&
    record.values.every((cell) => cell.length <= 80)
  );
}

function collectQuotedCandidate(
  lines: SourceLine[],
  start: number,
  delimiter: "," | "\t",
  format: "csv" | "tsv",
  maxLogicalCells = Number.POSITIVE_INFINITY,
): TableCandidate | undefined {
  if (!lines[start]?.raw.includes(delimiter)) return undefined;
  const records: ParsedDelimitedRecord[] = [];
  const recordLines: TableCandidate["recordLines"] = [];
  let index = start;
  while (index < lines.length) {
    let rawRecord = lines[index].raw;
    const recordStart = index;
    const remainingCells = Math.max(
      0,
      maxLogicalCells -
        records.reduce((sum, record) => sum + record.values.length, 0),
    );
    let parsed = quotedDelimitedRecord(rawRecord, delimiter, remainingCells);
    if (parsed.overflow) {
      return {
        format,
        start,
        end: index,
        records: [],
        kinds: [],
        recordLines: [],
        issues: ["logical-cell-limit"],
        cellOverflow: true,
      };
    }
    while (!parsed.complete && index + 1 < lines.length) {
      index += 1;
      rawRecord += lines[index - 1].eol;
      rawRecord += lines[index].raw;
      parsed = quotedDelimitedRecord(rawRecord, delimiter, remainingCells);
      if (parsed.overflow) {
        return {
          format,
          start,
          end: index,
          records: [],
          kinds: [],
          recordLines: [],
          issues: ["logical-cell-limit"],
          cellOverflow: true,
        };
      }
    }
    if (
      records.length > 0 &&
      parsed.values.length === 1 &&
      !rawRecord.includes(delimiter)
    )
      break;
    records.push(parsed);
    recordLines.push({ start: recordStart, end: index });
    index += 1;
    if (!parsed.complete) break;
  }
  if (records.length < 2 || records[0].values.length < 2) return undefined;
  const width = records[0].values.length;
  const body = records.slice(1);
  if (!body.some((record) => record.values.length > 1)) return undefined;
  const headerValid =
    format === "csv"
      ? looksLikeCsvHeader(records[0])
      : isPlausibleHeader(records[0]);
  const issues = [
    ...(headerValid ? [] : ["invalid-header"]),
    ...(records[0].values.some((cell) => !cell) ? ["empty-header-cell"] : []),
    ...records.flatMap((record, recordIndex) => [
      ...(record.complete ? [] : [`row-${recordIndex + 1}-unclosed-quote`]),
      ...(record.values.length === width
        ? []
        : [`row-${recordIndex + 1}-column-count`]),
    ]),
  ];
  return {
    format,
    start,
    end: recordLines.at(-1)?.end ?? start,
    records,
    kinds: records.map((_, index) => (index === 0 ? "header" : "body")),
    recordLines,
    issues,
  };
}

function tableCandidateAt(
  lines: SourceLine[],
  start: number,
  maxLogicalCells = Number.POSITIVE_INFINITY,
): TableCandidate | undefined {
  const first = lines[start];
  const next = lines[start + 1];
  if (!first) return undefined;
  if (first.raw.includes("|") && next?.raw.includes("|")) {
    const header = markdownRecord(first.raw, maxLogicalCells);
    if (header.overflow) {
      return {
        format: "markdown",
        start,
        end: start,
        records: [],
        kinds: [],
        recordLines: [],
        issues: ["logical-cell-limit"],
        cellOverflow: true,
      };
    }
    const separator = markdownRecord(
      next.raw,
      Math.max(1, header.values.length),
    );
    if (separator.overflow) {
      return {
        format: "markdown",
        start,
        end: start + 1,
        records: [],
        kinds: [],
        recordLines: [],
        issues: ["separator-cell-limit"],
        cellOverflow: true,
      };
    }
    if (header.values.length >= 2 && isMarkdownSeparator(separator)) {
      const records = [header, separator];
      const kinds: TableCandidate["kinds"] = ["header", "separator"];
      const recordLines = [
        { start, end: start },
        { start: start + 1, end: start + 1 },
      ];
      let index = start + 2;
      let logicalCellCount = header.values.length;
      while (index < lines.length && lines[index].raw.includes("|")) {
        const record = markdownRecord(
          lines[index].raw,
          Math.max(0, maxLogicalCells - logicalCellCount),
        );
        if (record.overflow) {
          return {
            format: "markdown",
            start,
            end: index,
            records: [],
            kinds: [],
            recordLines: [],
            issues: ["logical-cell-limit"],
            cellOverflow: true,
          };
        }
        if (record.values.length < 2) break;
        logicalCellCount += record.values.length;
        records.push(record);
        kinds.push("body");
        recordLines.push({ start: index, end: index });
        index += 1;
      }
      const width = header.values.length;
      return {
        format: "markdown",
        start,
        end: index - 1,
        records,
        kinds,
        recordLines,
        issues: records.flatMap((record, recordIndex) =>
          record.values.length === width
            ? []
            : [`row-${recordIndex + 1}-column-count`],
        ),
      };
    }
  }
  if (first.raw.includes("\t")) {
    const tsv = collectQuotedCandidate(
      lines,
      start,
      "\t",
      "tsv",
      maxLogicalCells,
    );
    if (tsv) return tsv;
  }
  return collectQuotedCandidate(lines, start, ",", "csv", maxLogicalCells);
}

function fenceMarker(raw: string): "`" | "~" | undefined {
  const marker = /^(?:\s*)(`{3,}|~{3,})/u.exec(raw)?.[1];
  return marker ? (marker[0] as "`" | "~") : undefined;
}

function isolatedDelimitedCandidate(
  lines: SourceLine[],
  start: number,
): TableCandidate | undefined {
  const first = lines[start];
  if (!first?.raw.includes("\t")) return undefined;
  const record = quotedDelimitedRecord(first.raw, "\t");
  if (record.values.length < 2) return undefined;
  return {
    format: "tsv",
    start,
    end: start,
    records: [record],
    kinds: ["body"],
    recordLines: [{ start, end: start }],
    issues: ["missing-header-or-body"],
  };
}

function tableFromCandidate(
  rawText: string,
  lines: SourceLine[],
  candidate: TableCandidate,
): AuthoringLongDocumentTable {
  const startOffset = lines[candidate.start].startOffset;
  const endOffset = lines[candidate.end].endOffset;
  const sourceRows: AuthoringLongDocumentTableRow[] = candidate.records.map(
    (record, rowIndex) => {
      const lineSpan = candidate.recordLines[rowIndex];
      const rowStart = lines[lineSpan.start].startOffset;
      const rowEnd = lines[lineSpan.end].contentEndOffset;
      const raw = rawText.slice(rowStart, rowEnd);
      const cells: AuthoringLongDocumentTableCell[] = record.cellSpans.map(
        (span, columnIndex) => {
          // Multiline CSV cells use the exact record-relative range. Line
          // endings are intentionally included when the quoted cell spans them.
          const cellStart = Math.min(rowEnd, rowStart + span.start);
          const cellEnd = Math.min(rowEnd, rowStart + span.end);
          return {
            cellId: stableAuthoringId(
              "long-document-cell",
              startOffset,
              rowIndex,
              columnIndex,
              span.raw,
            ),
            rowIndex,
            columnIndex,
            value: record.values[columnIndex] ?? "",
            rawText: rawText.slice(cellStart, cellEnd),
            locator: locatorFor(rawText, lines, cellStart, cellEnd),
            sourcePreserved: true,
          };
        },
      );
      return {
        rowId: stableAuthoringId(
          "long-document-row",
          startOffset,
          rowIndex,
          raw,
        ),
        rowIndex,
        kind: candidate.kinds[rowIndex],
        values: [...record.values],
        rawText: raw,
        locator: locatorFor(rawText, lines, rowStart, rowEnd),
        cells,
        sourcePreserved: true,
      };
    },
  );
  const header = sourceRows.find((row) => row.kind === "header");
  const body = sourceRows.filter((row) => row.kind === "body");
  const incompleteQuote = candidate.issues.some((issue) =>
    issue.includes("unclosed-quote"),
  );
  const state = incompleteQuote
    ? "table-invalid"
    : candidate.issues.length > 0
      ? "table-loss-risk"
      : "table-safe";
  return {
    tableId: stableAuthoringId(
      "long-document-table",
      candidate.format,
      startOffset,
      rawText.slice(startOffset, endOffset),
    ),
    format: candidate.format,
    state,
    headers: [...(header?.values ?? [])],
    rows: body.map((row) => [...row.values]),
    sourceRows,
    logicalCellCount: sourceRows
      .filter((row) => row.kind !== "separator")
      .reduce((sum, row) => sum + row.values.length, 0),
    rawText: rawText.slice(startOffset, endOffset),
    locator: locatorFor(rawText, lines, startOffset, endOffset),
    sourcePreserved: true,
    issues: [...candidate.issues],
  };
}

function blockKind(raw: string): AuthoringLongDocumentBlockKind {
  const trimmed = raw.trim();
  if (!trimmed) return "blank";
  if (/^(?:```|~~~)/u.test(trimmed)) return "code_fence";
  if (/^<!--/u.test(trimmed)) return "comment";
  if (/^<[^>]+>/u.test(trimmed)) return "html";
  if (/^>/u.test(trimmed)) return "blockquote";
  return "prose";
}

function rawLineBlocks(
  rawText: string,
  lines: SourceLine[],
  tableRanges: Array<{ start: number; end: number }>,
): AuthoringLongDocumentBlock[] {
  const blocks: AuthoringLongDocumentBlock[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const table = tableRanges.find((range) => range.start === index);
    if (table) {
      const start = lines[table.start].startOffset;
      const end = lines[table.end].endOffset;
      blocks.push({
        blockId: stableAuthoringId("long-document-block", "table", start, end),
        kind: "table",
        rawText: rawText.slice(start, end),
        locator: locatorFor(rawText, lines, start, end),
        sourcePreserved: true,
      });
      index = table.end;
      continue;
    }
    if (tableRanges.some((range) => index > range.start && index <= range.end))
      continue;
    const line = lines[index];
    const trimmed = line.raw.trim();
    if (/^(?:```|~~~)/u.test(trimmed)) {
      const marker = trimmed.slice(0, 3);
      let endIndex = index;
      for (
        let candidate = index + 1;
        candidate < lines.length;
        candidate += 1
      ) {
        endIndex = candidate;
        if (lines[candidate].raw.trim().startsWith(marker)) break;
      }
      const start = line.startOffset;
      const end = lines[endIndex].endOffset;
      blocks.push({
        blockId: stableAuthoringId(
          "long-document-block",
          "code_fence",
          start,
          end,
        ),
        kind: "code_fence",
        rawText: rawText.slice(start, end),
        locator: locatorFor(rawText, lines, start, end),
        sourcePreserved: true,
      });
      index = endIndex;
      continue;
    }
    const kind = blockKind(line.raw);
    let endIndex = index;
    if (kind === "comment" && !trimmed.includes("-->")) {
      while (endIndex + 1 < lines.length) {
        endIndex += 1;
        if (lines[endIndex].raw.includes("-->")) break;
      }
    } else if (kind === "html") {
      const opening = /^<([A-Za-z][\w:-]*)(?:\s[^>]*)?>/u.exec(trimmed);
      const closing = opening ? `</${opening[1]}>` : "";
      if (closing && !trimmed.includes(closing)) {
        while (endIndex + 1 < lines.length) {
          endIndex += 1;
          if (lines[endIndex].raw.includes(closing)) break;
        }
      }
    } else if (kind === "blockquote" || kind === "prose") {
      while (
        endIndex + 1 < lines.length &&
        !tableRanges.some(
          (range) => endIndex + 1 >= range.start && endIndex + 1 <= range.end,
        ) &&
        blockKind(lines[endIndex + 1].raw) === kind
      ) {
        endIndex += 1;
      }
    }
    const start = line.startOffset;
    const end = lines[endIndex].endOffset;
    blocks.push({
      blockId: stableAuthoringId("long-document-block", kind, start, end),
      kind,
      rawText: rawText.slice(start, end),
      locator: locatorFor(rawText, lines, start, end),
      sourcePreserved: true,
    });
    index = endIndex;
  }
  return blocks;
}

function loss(
  result: AuthoringLongDocumentLoss["result"],
  reason: AuthoringLongDocumentLoss["reason"],
  message: string,
  locator?: AuthoringSourceLocator,
  table?: AuthoringLongDocumentTable,
  trace?: Pick<
    AnalyzeAuthoringLongDocumentOptions,
    "documentId" | "workingRevisionId"
  >,
): AuthoringLongDocumentLoss {
  return {
    lossId: stableAuthoringId(
      "long-document-loss",
      result,
      reason,
      locator?.rawHash,
    ),
    contractVersion: LOSS_CONTRACT_VERSION,
    result,
    reason,
    message,
    ...(locator ? { locator } : {}),
    ...(trace?.documentId ? { documentId: trace.documentId } : {}),
    ...(trace?.workingRevisionId
      ? { workingRevisionId: trace.workingRevisionId }
      : {}),
    ...(table
      ? {
          tableId: table.tableId,
          tableFormat: table.format,
          delimiter:
            table.format === "csv"
              ? ("," as const)
              : table.format === "tsv"
                ? ("\t" as const)
                : ("|" as const),
          rowCount: table.rows.length,
          cellCount: table.logicalCellCount,
        }
      : {}),
    fallback: "txt-raw-preserved",
    blocked: reason !== "non-executable-table",
    sourcePreserved: true,
  };
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function tableDelimiter(
  format: AuthoringLongDocumentTable["format"],
): "," | "\t" | "|" {
  if (format === "csv") return ",";
  if (format === "tsv") return "\t";
  return "|";
}

type BoundedOverflowTableBlock = {
  tableId: string;
  format: AuthoringLongDocumentTable["format"];
  locator: AuthoringSourceLocator;
  sourceRowsLowerBound: number;
  sourceCellsLowerBound: number;
};

const TABLE_LOSS_FALLBACKS = [
  "raw-txt",
  "source-download",
  "source-edit",
] as const;

function tableBlockManifestId(
  documentId: string | undefined,
  tableId: string,
  sourceRange: AuthoringSourceLocator,
): string {
  return stableAuthoringId(
    "table-block-loss-manifest",
    TABLE_LOSS_CONTRACT_VERSION,
    documentId,
    tableId,
    sourceRange.rawHash,
  );
}

function tableBlockLossManifest(
  table: AuthoringLongDocumentTable,
  options: AnalyzeAuthoringLongDocumentOptions,
  tableCount: number,
): AuthoringTableBlockLossManifest {
  const sourceRows = table.locator.endLine - table.locator.startLine + 1;
  const sourceCells = table.sourceRows.reduce(
    (sum, row) => sum + row.values.length,
    0,
  );
  const parsedRows = table.sourceRows.filter(
    (row) => row.kind !== "separator",
  ).length;
  const unsafe = table.state !== "table-safe";
  const multiple = tableCount > 1;
  const risk =
    table.state === "table-invalid"
      ? ("confirmed" as const)
      : unsafe || multiple
        ? ("possible" as const)
        : ("none" as const);
  const unsupportedShapes: AuthoringTableLossUnsupportedShape[] = [
    "calendar-from-factual-table",
    "todo-from-factual-table",
    ...(unsafe ? ["unsafe-sheet-shape" as const] : []),
    ...(multiple ? ["multiple-table-sheet" as const] : []),
  ];
  const exactCount = (rows: number, cells: number) => ({
    rows,
    cells,
    rowAccuracy: "exact" as const,
    cellAccuracy: "exact" as const,
  });
  return {
    blockManifestId: tableBlockManifestId(
      options.documentId,
      table.tableId,
      table.locator,
    ),
    ...(options.documentId ? { documentId: options.documentId } : {}),
    ...(options.workingRevisionId
      ? { workingRevisionId: options.workingRevisionId }
      : {}),
    tableId: table.tableId,
    tableState: table.state,
    format: table.format,
    delimiter: tableDelimiter(table.format),
    encoding: "utf-8",
    sourceRange: table.locator,
    counts: {
      source: exactCount(sourceRows, sourceCells),
      parsed: exactCount(parsedRows, table.logicalCellCount),
      preserved: exactCount(sourceRows, sourceCells),
    },
    preservedShapes: [
      "raw-source",
      "line-endings",
      "table-raw",
      "table-row-boundaries",
      "table-cell-boundaries",
    ],
    unsupportedShapes,
    risk,
    affectedArtifacts: risk === "none" ? [] : ["sheet"],
    fallbacks: [...TABLE_LOSS_FALLBACKS],
    generatedAt: null,
    generatedAtPolicy: "deterministic-analysis-no-timestamp",
    sourcePreserved: true,
  };
}

function overflowTableBlockLossManifest(
  overflow: BoundedOverflowTableBlock,
  options: AnalyzeAuthoringLongDocumentOptions,
): AuthoringTableBlockLossManifest {
  const lowerBoundCount = (rows: number, cells: number) => ({
    rows,
    cells,
    rowAccuracy: "lower-bound" as const,
    cellAccuracy: "lower-bound" as const,
  });
  return {
    blockManifestId: tableBlockManifestId(
      options.documentId,
      overflow.tableId,
      overflow.locator,
    ),
    ...(options.documentId ? { documentId: options.documentId } : {}),
    ...(options.workingRevisionId
      ? { workingRevisionId: options.workingRevisionId }
      : {}),
    tableId: overflow.tableId,
    tableState: "budget-blocked",
    format: overflow.format,
    delimiter: tableDelimiter(overflow.format),
    encoding: "utf-8",
    sourceRange: overflow.locator,
    counts: {
      source: lowerBoundCount(
        overflow.sourceRowsLowerBound,
        overflow.sourceCellsLowerBound,
      ),
      parsed: {
        rows: 0,
        cells: 0,
        rowAccuracy: "exact",
        cellAccuracy: "exact",
      },
      preserved: lowerBoundCount(
        overflow.sourceRowsLowerBound,
        overflow.sourceCellsLowerBound,
      ),
    },
    preservedShapes: ["raw-source", "line-endings", "table-raw"],
    unsupportedShapes: ["structured-results-over-budget"],
    risk: "confirmed",
    affectedArtifacts: ["calendar", "todo", "sheet"],
    fallbacks: [...TABLE_LOSS_FALLBACKS],
    generatedAt: null,
    generatedAtPolicy: "deterministic-analysis-no-timestamp",
    sourcePreserved: true,
  };
}

function tableLossManifestId(input: {
  sourceRange: AuthoringSourceLocator;
  documentId?: string;
  workingRevisionId?: string;
  tableBlocks: AuthoringTableBlockLossManifest[];
  risk: AuthoringTableLossManifest["risk"];
}): string {
  return stableAuthoringId(
    "table-loss-manifest",
    TABLE_LOSS_CONTRACT_VERSION,
    input.documentId,
    input.workingRevisionId,
    input.sourceRange.rawHash,
    input.tableBlocks.map((block) => block.blockManifestId).join(","),
    input.risk,
  );
}

function buildTableLossManifest(input: {
  options: AnalyzeAuthoringLongDocumentOptions;
  wholeLocator: AuthoringSourceLocator;
  measuredLineCount: number;
  lineCountAccuracy: "exact" | "lower-bound";
  cellExceeded: boolean;
  limits: AuthoringInputBudgetLimits;
  blocks: AuthoringLongDocumentBlock[];
  tables: AuthoringLongDocumentTable[];
  retainedTables: AuthoringLongDocumentTable[];
  overflowBlock?: BoundedOverflowTableBlock;
  lossManifest: AuthoringLongDocumentLoss[];
  enabled: boolean;
  budgetExceeded: Array<"bytes" | "lines" | "cells">;
}): AuthoringTableLossManifest {
  const parsedRows = input.retainedTables.reduce(
    (sum, table) =>
      sum + table.sourceRows.filter((row) => row.kind !== "separator").length,
    0,
  );
  const parsedCells = input.retainedTables.reduce(
    (sum, table) => sum + table.logicalCellCount,
    0,
  );
  const detectedSourceCells = input.tables.reduce(
    (sum, table) =>
      sum +
      table.sourceRows.reduce((rowSum, row) => rowSum + row.values.length, 0),
    0,
  );
  const sourceCells = input.cellExceeded
    ? Math.max(
        input.limits.logicalCells + 1,
        detectedSourceCells + (input.overflowBlock?.sourceCellsLowerBound ?? 0),
      )
    : detectedSourceCells;
  const sourceCellAccuracy = input.cellExceeded ? "lower-bound" : "exact";
  const preservedShapes: AuthoringTableLossPreservedShape[] = [
    "raw-source",
    "line-endings",
    ...input.blocks.flatMap((block): AuthoringTableLossPreservedShape[] => {
      if (block.kind === "blank") return ["blank-lines"];
      if (block.kind === "prose") return ["prose"];
      if (block.kind === "blockquote") return ["blockquote"];
      if (block.kind === "code_fence") return ["code-fence"];
      if (block.kind === "html") return ["html"];
      if (block.kind === "comment") return ["comment"];
      return ["table-raw"];
    }),
    ...(input.retainedTables.length > 0
      ? (["table-row-boundaries", "table-cell-boundaries"] as const)
      : []),
    ...(input.cellExceeded ? (["table-raw"] as const) : []),
  ];
  const unsupportedShapes: AuthoringTableLossUnsupportedShape[] = [];
  if (input.tables.length > 0) {
    unsupportedShapes.push(
      "calendar-from-factual-table",
      "todo-from-factual-table",
    );
  }
  if (input.tables.some((table) => table.state !== "table-safe")) {
    unsupportedShapes.push("unsafe-sheet-shape");
  }
  if (input.tables.length > 1) unsupportedShapes.push("multiple-table-sheet");
  if (input.budgetExceeded.length > 0) {
    unsupportedShapes.push("structured-results-over-budget");
  }
  if (!input.enabled && input.options.safeFallbackWhenDisabled) {
    unsupportedShapes.push("structured-results-gate-off");
  }
  const risk =
    input.budgetExceeded.length > 0 ||
    (!input.enabled && input.options.safeFallbackWhenDisabled) ||
    input.tables.some((table) => table.state === "table-invalid")
      ? ("confirmed" as const)
      : input.tables.length > 1 ||
          input.tables.some((table) => table.state === "table-loss-risk")
        ? ("possible" as const)
        : ("none" as const);
  const tableBlocks = [
    ...input.retainedTables.map((table) =>
      tableBlockLossManifest(table, input.options, input.retainedTables.length),
    ),
    ...(input.overflowBlock
      ? [overflowTableBlockLossManifest(input.overflowBlock, input.options)]
      : []),
  ];
  const manifestId = tableLossManifestId({
    sourceRange: input.wholeLocator,
    ...(input.options.documentId
      ? { documentId: input.options.documentId }
      : {}),
    ...(input.options.workingRevisionId
      ? { workingRevisionId: input.options.workingRevisionId }
      : {}),
    tableBlocks,
    risk,
  });
  return {
    manifestId,
    contractVersion: TABLE_LOSS_CONTRACT_VERSION,
    scope: "document",
    encoding: "utf-8",
    ...(input.options.documentId
      ? { documentId: input.options.documentId }
      : {}),
    ...(input.options.workingRevisionId
      ? { workingRevisionId: input.options.workingRevisionId }
      : {}),
    tableIds: tableBlocks.map((block) => block.tableId),
    sourceRange: input.wholeLocator,
    detectedFormats: uniqueValues(tableBlocks.map((block) => block.format)),
    delimiters: uniqueValues(tableBlocks.map((block) => block.delimiter)),
    counts: {
      source: {
        rows: input.measuredLineCount,
        cells: sourceCells,
        rowAccuracy: input.lineCountAccuracy,
        cellAccuracy: sourceCellAccuracy,
      },
      parsed: {
        rows: parsedRows,
        cells: parsedCells,
        rowAccuracy: "exact",
        cellAccuracy: "exact",
      },
      preserved: {
        rows: input.measuredLineCount,
        cells: sourceCells,
        rowAccuracy: input.lineCountAccuracy,
        cellAccuracy: sourceCellAccuracy,
      },
    },
    preservedShapes: uniqueValues(preservedShapes),
    unsupportedShapes: uniqueValues(unsupportedShapes),
    risk,
    affectedArtifacts: uniqueValues(
      input.lossManifest.flatMap((entry) =>
        entry.reason === "too-large" || entry.reason === "feature-gate-off"
          ? [entry.result]
          : entry.reason === "table-invalid" ||
              entry.reason === "table-loss-risk"
            ? [entry.result]
            : [],
      ),
    ),
    fallbacks: [...TABLE_LOSS_FALLBACKS],
    generatedAt: null,
    generatedAtPolicy: "deterministic-analysis-no-timestamp",
    tableBlocks,
    entries: input.lossManifest,
    sourcePreserved: true,
  };
}

export function withAuthoringLongDocumentTrace(
  analysis: AuthoringLongDocumentAnalysis,
  trace: { documentId?: string; workingRevisionId?: string },
): AuthoringLongDocumentAnalysis {
  const lossManifest = analysis.lossManifest.map((entry) => ({
    ...entry,
    ...(trace.documentId ? { documentId: trace.documentId } : {}),
    ...(trace.workingRevisionId
      ? { workingRevisionId: trace.workingRevisionId }
      : {}),
  }));
  const tableBlocks = analysis.tableLossManifest.tableBlocks.map((block) => ({
    ...block,
    blockManifestId: tableBlockManifestId(
      trace.documentId ?? block.documentId,
      block.tableId,
      block.sourceRange,
    ),
    ...(trace.documentId ? { documentId: trace.documentId } : {}),
    ...(trace.workingRevisionId
      ? { workingRevisionId: trace.workingRevisionId }
      : {}),
  }));
  const tracedManifest = {
    ...analysis.tableLossManifest,
    ...(trace.documentId ? { documentId: trace.documentId } : {}),
    ...(trace.workingRevisionId
      ? { workingRevisionId: trace.workingRevisionId }
      : {}),
    tableBlocks,
    entries: lossManifest,
  };
  return {
    ...analysis,
    lossManifest,
    tableLossManifest: {
      ...tracedManifest,
      manifestId: tableLossManifestId({
        sourceRange: tracedManifest.sourceRange,
        ...(tracedManifest.documentId
          ? { documentId: tracedManifest.documentId }
          : {}),
        ...(tracedManifest.workingRevisionId
          ? { workingRevisionId: tracedManifest.workingRevisionId }
          : {}),
        tableBlocks,
        risk: tracedManifest.risk,
      }),
    },
  };
}

export function analyzeAuthoringLongDocument(
  rawText: string,
  options: AnalyzeAuthoringLongDocumentOptions = {},
): AuthoringLongDocumentAnalysis {
  const enabled = options.enabled === true;
  const limits: AuthoringInputBudgetLimits = {
    ...AUTHORING_LONG_DOCUMENT_LIMITS,
    ...options.limits,
  };
  const measuredUtf8Bytes = utf8Bytes(rawText, limits.utf8Bytes);
  const byteExceeded = measuredUtf8Bytes > limits.utf8Bytes;
  const measuredLineCount = countSourceLines(rawText, limits.lines);
  const lineExceeded = measuredLineCount > limits.lines;
  const lines = byteExceeded || lineExceeded ? [] : splitSourceLines(rawText);
  const tables: AuthoringLongDocumentTable[] = [];
  const tableRanges: Array<{ start: number; end: number }> = [];
  const mayAnalyzeStructure =
    enabled && measuredUtf8Bytes <= limits.utf8Bytes && !lineExceeded;
  let cellExceeded = false;
  let overflowCandidate:
    | (Pick<TableCandidate, "format" | "start" | "end"> & {
        sourceCellsLowerBound: number;
      })
    | undefined;
  if (mayAnalyzeStructure) {
    let activeFence: "`" | "~" | undefined;
    for (let index = 0; index < lines.length; index += 1) {
      const marker = fenceMarker(lines[index].raw);
      if (marker) {
        if (!activeFence) activeFence = marker;
        else if (activeFence === marker) activeFence = undefined;
        continue;
      }
      if (activeFence) continue;
      const currentCellCount = tables.reduce(
        (sum, table) => sum + table.logicalCellCount,
        0,
      );
      const remainingCellBudget = Math.max(
        0,
        limits.logicalCells - currentCellCount,
      );
      const candidate =
        tableCandidateAt(lines, index, remainingCellBudget) ??
        isolatedDelimitedCandidate(lines, index);
      if (!candidate) continue;
      if (candidate.cellOverflow) {
        cellExceeded = true;
        overflowCandidate = {
          format: candidate.format,
          start: candidate.start,
          end: candidate.end,
          sourceCellsLowerBound: remainingCellBudget + 1,
        };
        break;
      }
      const candidateCellCount = candidate.records
        .filter(
          (_, recordIndex) => candidate.kinds[recordIndex] !== "separator",
        )
        .reduce((sum, record) => sum + record.values.length, 0);
      if (currentCellCount + candidateCellCount > limits.logicalCells) {
        cellExceeded = true;
        overflowCandidate = {
          format: candidate.format,
          start: candidate.start,
          end: candidate.end,
          sourceCellsLowerBound: candidateCellCount,
        };
        break;
      }
      tables.push(tableFromCandidate(rawText, lines, candidate));
      tableRanges.push({ start: candidate.start, end: candidate.end });
      index = candidate.end;
    }
  }
  const budget = {
    utf8Bytes: measuredUtf8Bytes,
    lineCount: measuredLineCount,
    logicalCellCount: tables.reduce(
      (sum, table) => sum + table.logicalCellCount,
      0,
    ),
    limits,
    exceeded: [] as Array<"bytes" | "lines" | "cells">,
  };
  if (budget.utf8Bytes > limits.utf8Bytes) budget.exceeded.push("bytes");
  if (lineExceeded) budget.exceeded.push("lines");
  if (cellExceeded) budget.exceeded.push("cells");
  const locatorLines =
    lines.length > 0
      ? lines
      : [
          {
            raw: "",
            eol: "",
            contentEndOffset: rawText.length,
            endOffset: rawText.length,
            startOffset: 0,
            line: 1,
          },
        ];
  const wholeLocator = locatorFor(rawText, locatorLines, 0, rawText.length);
  const overflowBlock =
    overflowCandidate && lines[overflowCandidate.start]
      ? (() => {
          const endIndex = Math.min(
            overflowCandidate.end,
            Math.max(0, lines.length - 1),
          );
          const locator = locatorFor(
            rawText,
            lines,
            lines[overflowCandidate.start].startOffset,
            lines[endIndex].endOffset,
          );
          return {
            tableId: stableAuthoringId(
              "long-document-table-overflow",
              overflowCandidate.format,
              locator.rawHash,
            ),
            format: overflowCandidate.format,
            locator,
            sourceRowsLowerBound: endIndex - overflowCandidate.start + 1,
            sourceCellsLowerBound: overflowCandidate.sourceCellsLowerBound,
          } satisfies BoundedOverflowTableBlock;
        })()
      : undefined;
  const lossManifest: AuthoringLongDocumentLoss[] = [];
  if (!enabled) {
    lossManifest.push(
      ...(["calendar", "todo", "sheet"] as const).map((result) =>
        loss(
          result,
          "feature-gate-off",
          "긴 문서 표 처리가 꺼져 있어 TXT 원문만 보존합니다.",
          wholeLocator,
          undefined,
          options,
        ),
      ),
    );
  } else if (budget.exceeded.length > 0) {
    for (const result of ["calendar", "todo", "sheet"] as const) {
      lossManifest.push(
        loss(
          result,
          "too-large",
          "문서 처리 범위를 넘어 원문을 줄이거나 자르지 않고 TXT로 보존합니다.",
          wholeLocator,
          undefined,
          options,
        ),
      );
    }
  } else {
    for (const table of tables) {
      lossManifest.push(
        loss(
          "calendar",
          "non-executable-table",
          "표의 사실 행은 캘린더 일정으로 자동 변환하지 않습니다.",
          table.locator,
          table,
          options,
        ),
        loss(
          "todo",
          "non-executable-table",
          "표의 사실 행은 할 일로 자동 변환하지 않습니다.",
          table.locator,
          table,
          options,
        ),
      );
      if (table.state !== "table-safe") {
        lossManifest.push(
          loss(
            "sheet",
            table.state === "table-invalid"
              ? "table-invalid"
              : "table-loss-risk",
            "열 또는 셀 모양을 안전하게 보존할 수 없어 표·Excel 결과를 막고 원문으로 이동합니다.",
            table.locator,
            table,
            options,
          ),
        );
      }
    }
    if (
      tables.length > 1 &&
      tables.every((table) => table.state === "table-safe")
    ) {
      lossManifest.push(
        loss(
          "sheet",
          "table-loss-risk",
          "서로 다른 여러 표를 하나의 표·Excel 결과로 합치지 않습니다. 표를 하나 선택하기 전에는 TXT 원문으로 보존합니다.",
          tables[1].locator,
          tables[1],
          options,
        ),
      );
    }
  }
  const blocks =
    budget.exceeded.length > 0
      ? [
          {
            blockId: stableAuthoringId(
              "long-document-block",
              "prose",
              0,
              rawText.length,
            ),
            kind: "prose" as const,
            rawText,
            locator: wholeLocator,
            sourcePreserved: true as const,
          },
        ]
      : rawLineBlocks(rawText, lines, tableRanges);
  const boundedTables = budget.exceeded.length > 0 ? [] : tables;
  const hasSheetBlock = lossManifest.some(
    (entry) => entry.result === "sheet" && entry.reason !== "feature-gate-off",
  );
  const tableLossManifest = buildTableLossManifest({
    options,
    wholeLocator,
    measuredLineCount,
    lineCountAccuracy: lineExceeded ? "lower-bound" : "exact",
    cellExceeded,
    limits,
    blocks,
    tables,
    retainedTables: boundedTables,
    ...(overflowBlock ? { overflowBlock } : {}),
    lossManifest,
    enabled,
    budgetExceeded: budget.exceeded,
  });
  return {
    status:
      !enabled || budget.exceeded.length > 0
        ? "txt-only"
        : hasSheetBlock
          ? "result-specific-blocked"
          : tables.length > 0
            ? "partially-structured"
            : "raw-preserved",
    featureEnabled: enabled,
    fallbackActive: false,
    sourceHash: stableAuthoringHash(rawText),
    budget,
    blocks,
    tables: boundedTables,
    lossManifest,
    tableLossManifest,
    sourcePreserved: true,
  };
}

export function locateAuthoringSource(
  rawText: string,
  locator: AuthoringSourceLocator,
): { valid: boolean; rawText: string } {
  const value = rawText.slice(locator.startOffset, locator.endOffset);
  return {
    valid:
      locator.byteExact === true &&
      locator.startOffset >= 0 &&
      locator.endOffset >= locator.startOffset &&
      locator.endOffset <= rawText.length &&
      stableAuthoringHash(value) === locator.rawHash,
    rawText: value,
  };
}
