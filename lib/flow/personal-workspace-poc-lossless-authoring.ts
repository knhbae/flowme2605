export const PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_VERSION = 1 as const;

export type PersonalWorkspacePocLosslessAuthoringLimits = Readonly<{
  utf8Bytes: number;
  physicalLines: number;
  logicalCells: number;
}>;

export const PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_LIMITS: PersonalWorkspacePocLosslessAuthoringLimits = Object.freeze({
  utf8Bytes: 1024 * 1024,
  physicalLines: 20_000,
  logicalCells: 50_000,
});

export type PersonalWorkspacePocLosslessSourceLocator = Readonly<{
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  rawHash: string;
  byteExact: true;
}>;

export type PersonalWorkspacePocLosslessBlockKind =
  | 'blank'
  | 'prose'
  | 'blockquote'
  | 'code-fence'
  | 'html'
  | 'comment'
  | 'table'
  | 'unknown';

export type PersonalWorkspacePocLosslessBlock = Readonly<{
  blockId: string;
  kind: PersonalWorkspacePocLosslessBlockKind;
  rawText: string;
  locator: PersonalWorkspacePocLosslessSourceLocator;
  sourcePreserved: true;
}>;

export type PersonalWorkspacePocLosslessTableFormat = 'csv' | 'tsv' | 'markdown';

export type PersonalWorkspacePocLosslessTableCell = Readonly<{
  cellId: string;
  rowIndex: number;
  columnIndex: number;
  value: string;
  rawText: string;
  locator: PersonalWorkspacePocLosslessSourceLocator;
  sourcePreserved: true;
}>;

export type PersonalWorkspacePocLosslessTableRow = Readonly<{
  rowId: string;
  rowIndex: number;
  kind: 'header' | 'separator' | 'body';
  values: readonly string[];
  rawText: string;
  locator: PersonalWorkspacePocLosslessSourceLocator;
  cells: readonly PersonalWorkspacePocLosslessTableCell[];
  sourcePreserved: true;
}>;

export type PersonalWorkspacePocLosslessTable = Readonly<{
  tableId: string;
  format: PersonalWorkspacePocLosslessTableFormat;
  delimiter: ',' | '\t' | '|';
  state: 'safe' | 'unsafe';
  headers: readonly string[];
  rows: readonly (readonly string[])[];
  sourceRows: readonly PersonalWorkspacePocLosslessTableRow[];
  logicalCellCount: number;
  rawText: string;
  locator: PersonalWorkspacePocLosslessSourceLocator;
  issues: readonly PersonalWorkspacePocLosslessIssue[];
  sourcePreserved: true;
}>;

export type PersonalWorkspacePocLosslessIssue =
  | 'ambiguous-delimiter'
  | 'duplicate-header'
  | 'empty-header'
  | 'inconsistent-column-count'
  | 'invalid-markdown-separator'
  | 'missing-body'
  | 'missing-header'
  | 'unclosed-quote'
  | 'unexpected-quote'
  | 'characters-after-closing-quote'
  | 'formula-like-cell'
  | 'multiple-tables'
  | 'byte-limit'
  | 'line-limit'
  | 'cell-limit';

export type PersonalWorkspacePocLosslessProjectionCell = Readonly<{
  columnIndex: number;
  header: string;
  value: string;
  rawText: string;
  locator: PersonalWorkspacePocLosslessSourceLocator;
}>;

export type PersonalWorkspacePocLosslessProjectionRow = Readonly<{
  projectionRowId: string;
  sourceTableId: string;
  sourceRowId: string;
  sourceRowIndex: number;
  cells: readonly PersonalWorkspacePocLosslessProjectionCell[];
}>;

export type PersonalWorkspacePocLosslessAuthoringAnalysis = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_VERSION;
  status: 'raw-preserved' | 'safe-table' | 'raw-fallback';
  rawText: string;
  sourceFingerprint: string;
  lineEndings: 'none' | 'lf' | 'crlf' | 'cr' | 'mixed';
  budget: Readonly<{
    utf8Bytes: number;
    physicalLines: number;
    logicalCells: number;
    limits: PersonalWorkspacePocLosslessAuthoringLimits;
    exceeded: readonly ('bytes' | 'lines' | 'cells')[];
  }>;
  blocks: readonly PersonalWorkspacePocLosslessBlock[];
  tables: readonly PersonalWorkspacePocLosslessTable[];
  projection: Readonly<{
    kind: 'sheet-source-rows' | 'none';
    tableId?: string;
    headers: readonly string[];
    rows: readonly PersonalWorkspacePocLosslessProjectionRow[];
    /** Factual table rows never become inferred actions or calendar events. */
    generatedItemCount: 0;
    generatedTodoCount: 0;
    generatedCalendarCount: 0;
  }>;
  fallback: Readonly<{
    active: boolean;
    reason: PersonalWorkspacePocLosslessIssue | null;
    rawText: string;
    availableAs: readonly ['raw-text', 'txt-copy'];
  }>;
  issues: readonly PersonalWorkspacePocLosslessIssue[];
  sourceMutationCount: 0;
  sourcePreserved: true;
}>;

type SourceLine = Readonly<{
  raw: string;
  terminator: string;
  startOffset: number;
  contentEndOffset: number;
  endOffset: number;
  line: number;
}>;

type ParsedCellSpan = Readonly<{ start: number; end: number; raw: string }>;

type ParsedRecord = Readonly<{
  values: readonly string[];
  spans: readonly ParsedCellSpan[];
  complete: boolean;
  issues: readonly PersonalWorkspacePocLosslessIssue[];
}>;

type TableCandidate = Readonly<{
  format: PersonalWorkspacePocLosslessTableFormat;
  startLineIndex: number;
  endLineIndex: number;
  records: readonly ParsedRecord[];
  recordLineRanges: readonly Readonly<{ start: number; end: number }>[];
  rowKinds: readonly PersonalWorkspacePocLosslessTableRow['kind'][];
  issues: readonly PersonalWorkspacePocLosslessIssue[];
}>;

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

function stableId(kind: string, ...parts: readonly (string | number)[]): string {
  return `${kind}-${stableHash(parts.join('\u001f'))}`;
}

export function fingerprintPersonalWorkspacePocLosslessSource(rawText: string): string {
  return `lossless-source-v1:${rawText.length}:${stableHash(rawText)}`;
}

function splitSourceLines(rawText: string): SourceLine[] {
  if (rawText.length === 0) {
    return [{
      raw: '', terminator: '', startOffset: 0, contentEndOffset: 0,
      endOffset: 0, line: 1,
    }];
  }
  const lines: SourceLine[] = [];
  let startOffset = 0;
  let line = 1;
  while (startOffset < rawText.length) {
    let contentEndOffset = startOffset;
    while (
      contentEndOffset < rawText.length
      && rawText[contentEndOffset] !== '\r'
      && rawText[contentEndOffset] !== '\n'
    ) contentEndOffset += 1;
    let endOffset = contentEndOffset;
    if (rawText[endOffset] === '\r' && rawText[endOffset + 1] === '\n') endOffset += 2;
    else if (rawText[endOffset] === '\r' || rawText[endOffset] === '\n') endOffset += 1;
    lines.push({
      raw: rawText.slice(startOffset, contentEndOffset),
      terminator: rawText.slice(contentEndOffset, endOffset),
      startOffset,
      contentEndOffset,
      endOffset,
      line,
    });
    startOffset = endOffset;
    line += 1;
  }
  return lines;
}

function physicalLineCount(rawText: string): number {
  if (!rawText) return 1;
  let count = 1;
  for (let index = 0; index < rawText.length; index += 1) {
    if (rawText[index] === '\r') {
      count += 1;
      if (rawText[index + 1] === '\n') index += 1;
    } else if (rawText[index] === '\n') count += 1;
  }
  return count;
}

function utf8ByteCount(value: string): number {
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
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}

function detectLineEndings(lines: readonly SourceLine[]): PersonalWorkspacePocLosslessAuthoringAnalysis['lineEndings'] {
  const endings = new Set(lines.map((line) => line.terminator).filter(Boolean));
  if (endings.size === 0) return 'none';
  if (endings.size > 1) return 'mixed';
  const [ending] = [...endings];
  if (ending === '\r\n') return 'crlf';
  if (ending === '\r') return 'cr';
  return 'lf';
}

function locatorFor(
  rawText: string,
  lines: readonly SourceLine[],
  startOffset: number,
  endOffset: number,
): PersonalWorkspacePocLosslessSourceLocator {
  const safeStart = Math.max(0, Math.min(startOffset, rawText.length));
  const safeEnd = Math.max(safeStart, Math.min(endOffset, rawText.length));
  const lineFor = (offset: number) => lines.find(
    (line) => offset < line.endOffset || offset <= line.contentEndOffset,
  )?.line ?? lines.at(-1)?.line ?? 1;
  return {
    startOffset: safeStart,
    endOffset: safeEnd,
    startLine: lineFor(safeStart),
    endLine: lineFor(safeEnd > safeStart ? safeEnd - 1 : safeStart),
    rawHash: stableHash(rawText.slice(safeStart, safeEnd)),
    byteExact: true,
  };
}

export function locatePersonalWorkspacePocLosslessSource(
  rawText: string,
  locator: PersonalWorkspacePocLosslessSourceLocator,
): Readonly<{ valid: boolean; rawText: string }> {
  const selected = rawText.slice(locator.startOffset, locator.endOffset);
  return {
    valid:
      locator.byteExact
      && locator.startOffset >= 0
      && locator.endOffset >= locator.startOffset
      && locator.endOffset <= rawText.length
      && stableHash(selected) === locator.rawHash,
    rawText: selected,
  };
}

function uniqueIssues(
  issues: readonly PersonalWorkspacePocLosslessIssue[],
): PersonalWorkspacePocLosslessIssue[] {
  return [...new Set(issues)];
}

function finishDelimitedCell(
  values: string[],
  spans: ParsedCellSpan[],
  raw: string,
  start: number,
  end: number,
  value: string,
  quoted: boolean,
): void {
  values.push(quoted ? value : value.trim());
  spans.push({ start, end, raw: raw.slice(start, end) });
}

/** RFC4180-style bounded reader used for both CSV and TSV source rows. */
function parseDelimitedRecord(raw: string, delimiter: ',' | '\t'): ParsedRecord {
  const values: string[] = [];
  const spans: ParsedCellSpan[] = [];
  const issues: PersonalWorkspacePocLosslessIssue[] = [];
  let cellStart = 0;
  let value = '';
  let quoted = false;
  let wasQuoted = false;
  let afterQuote = false;

  for (let index = 0; index < raw.length; index += 1) {
    const character = raw[index];
    if (quoted) {
      if (character === '"') {
        if (raw[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else value += character;
      continue;
    }

    if (afterQuote) {
      if (character === delimiter) {
        finishDelimitedCell(values, spans, raw, cellStart, index, value, true);
        cellStart = index + 1;
        value = '';
        wasQuoted = false;
        afterQuote = false;
      } else if (character !== ' ' && character !== '\t') {
        issues.push('characters-after-closing-quote');
        value += character;
      }
      continue;
    }

    if (character === delimiter) {
      finishDelimitedCell(values, spans, raw, cellStart, index, value, wasQuoted);
      cellStart = index + 1;
      value = '';
      wasQuoted = false;
      continue;
    }
    if (character === '"') {
      if (index === cellStart) {
        quoted = true;
        wasQuoted = true;
      } else {
        issues.push('unexpected-quote');
        value += character;
      }
      continue;
    }
    value += character;
  }

  if (quoted) issues.push('unclosed-quote');
  finishDelimitedCell(values, spans, raw, cellStart, raw.length, value, wasQuoted);
  return { values, spans, complete: !quoted, issues: uniqueIssues(issues) };
}

function parseMarkdownRecord(raw: string): ParsedRecord {
  const values: string[] = [];
  const spans: ParsedCellSpan[] = [];
  const firstNonSpace = raw.search(/\S/u);
  const outerStart = firstNonSpace >= 0 && raw[firstNonSpace] === '|'
    ? firstNonSpace + 1
    : Math.max(0, firstNonSpace);
  let end = raw.trimEnd().length;
  if (end > outerStart && raw[end - 1] === '|') end -= 1;
  let cellStart = outerStart;
  let escaped = false;
  for (let index = outerStart; index <= end; index += 1) {
    const character = raw[index];
    if (index < end && character === '\\' && !escaped) {
      escaped = true;
      continue;
    }
    if (index === end || (character === '|' && !escaped)) {
      const cellRaw = raw.slice(cellStart, index);
      values.push(cellRaw.trim().replace(/\\\|/gu, '|'));
      spans.push({ start: cellStart, end: index, raw: cellRaw });
      cellStart = index + 1;
    }
    escaped = false;
  }
  return { values, spans, complete: true, issues: [] };
}

function isMarkdownSeparator(record: ParsedRecord): boolean {
  return record.values.length >= 2
    && record.values.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

function headerIssues(record: ParsedRecord): PersonalWorkspacePocLosslessIssue[] {
  const normalized = record.values.map((value) => value.trim());
  return uniqueIssues([
    ...(normalized.length < 2 ? ['missing-header' as const] : []),
    ...(normalized.some((value) => value.length === 0) ? ['empty-header' as const] : []),
    ...(new Set(normalized).size !== normalized.length ? ['duplicate-header' as const] : []),
  ]);
}

function contentLooksLikeFormula(value: string): boolean {
  return /^[=+@]/u.test(value.trim());
}

function collectDelimitedCandidate(
  lines: readonly SourceLine[],
  startLineIndex: number,
  delimiter: ',' | '\t',
  format: 'csv' | 'tsv',
): TableCandidate | null {
  if (!lines[startLineIndex]?.raw.includes(delimiter)) return null;
  const records: ParsedRecord[] = [];
  const recordLineRanges: Array<{ start: number; end: number }> = [];
  let lineIndex = startLineIndex;
  while (lineIndex < lines.length) {
    const recordStart = lineIndex;
    let recordRaw = lines[lineIndex].raw;
    let parsed = parseDelimitedRecord(recordRaw, delimiter);
    while (!parsed.complete && lineIndex + 1 < lines.length) {
      recordRaw += lines[lineIndex].terminator;
      lineIndex += 1;
      recordRaw += lines[lineIndex].raw;
      parsed = parseDelimitedRecord(recordRaw, delimiter);
    }
    if (
      records.length > 0
      && parsed.complete
      && parsed.values.length === 1
      && !recordRaw.includes(delimiter)
    ) break;
    records.push(parsed);
    recordLineRanges.push({ start: recordStart, end: lineIndex });
    lineIndex += 1;
    if (!parsed.complete) break;
    if (lineIndex < lines.length && !lines[lineIndex].raw.includes(delimiter)) break;
  }

  // A comma in prose is not enough to claim a CSV table. A single TSV row is
  // retained as an unsafe candidate because pasted spreadsheet rows are common.
  if (records.length < 2 && format === 'csv') return null;
  const width = records[0]?.values.length ?? 0;
  if (width < 2) return null;
  const delimiterAmbiguous = lines[startLineIndex].raw.includes(
    delimiter === ',' ? '\t' : ',',
  );
  const body = records.slice(1);
  const issues = uniqueIssues([
    ...headerIssues(records[0]),
    ...(body.length === 0 ? ['missing-body' as const] : []),
    ...(delimiterAmbiguous ? ['ambiguous-delimiter' as const] : []),
    ...records.flatMap((record) => record.issues),
    ...(records.some((record) => record.values.length !== width)
      ? ['inconsistent-column-count' as const]
      : []),
    ...(body.some((record) => record.values.some(contentLooksLikeFormula))
      ? ['formula-like-cell' as const]
      : []),
  ]);
  return {
    format,
    startLineIndex,
    endLineIndex: recordLineRanges.at(-1)?.end ?? startLineIndex,
    records,
    recordLineRanges,
    rowKinds: records.map((_, index) => (index === 0 ? 'header' : 'body')),
    issues,
  };
}

function collectMarkdownCandidate(
  lines: readonly SourceLine[],
  startLineIndex: number,
): TableCandidate | null {
  const headerLine = lines[startLineIndex];
  const separatorLine = lines[startLineIndex + 1];
  if (!headerLine?.raw.includes('|') || !separatorLine?.raw.includes('|')) return null;
  const header = parseMarkdownRecord(headerLine.raw);
  const separator = parseMarkdownRecord(separatorLine.raw);
  if (!isMarkdownSeparator(separator)) return null;
  const records: ParsedRecord[] = [header, separator];
  const rowKinds: PersonalWorkspacePocLosslessTableRow['kind'][] = ['header', 'separator'];
  const recordLineRanges: Array<{ start: number; end: number }> = [
    { start: startLineIndex, end: startLineIndex },
    { start: startLineIndex + 1, end: startLineIndex + 1 },
  ];
  let lineIndex = startLineIndex + 2;
  while (lineIndex < lines.length && lines[lineIndex].raw.includes('|')) {
    const row = parseMarkdownRecord(lines[lineIndex].raw);
    if (row.values.length < 2) break;
    records.push(row);
    rowKinds.push('body');
    recordLineRanges.push({ start: lineIndex, end: lineIndex });
    lineIndex += 1;
  }
  const width = header.values.length;
  const body = records.filter((_, index) => rowKinds[index] === 'body');
  const issues = uniqueIssues([
    ...headerIssues(header),
    ...(separator.values.length !== width ? ['invalid-markdown-separator' as const] : []),
    ...(body.length === 0 ? ['missing-body' as const] : []),
    ...(records.some((record) => record.values.length !== width)
      ? ['inconsistent-column-count' as const]
      : []),
    ...(body.some((record) => record.values.some(contentLooksLikeFormula))
      ? ['formula-like-cell' as const]
      : []),
  ]);
  return {
    format: 'markdown',
    startLineIndex,
    endLineIndex: recordLineRanges.at(-1)?.end ?? startLineIndex + 1,
    records,
    recordLineRanges,
    rowKinds,
    issues,
  };
}

function fenceRun(raw: string): Readonly<{ marker: '`' | '~'; length: number }> | null {
  const match = /^ {0,3}(`{3,}|~{3,})/u.exec(raw);
  return match ? { marker: match[1][0] as '`' | '~', length: match[1].length } : null;
}

function protectedLineIndexes(lines: readonly SourceLine[]): Set<number> {
  const protectedIndexes = new Set<number>();
  let fence: Readonly<{ marker: '`' | '~'; length: number }> | null = null;
  let inComment = false;
  let htmlClosing: string | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index].raw;
    const trimmed = raw.trim();
    if (fence) {
      protectedIndexes.add(index);
      const closing = fenceRun(raw);
      if (closing?.marker === fence.marker && closing.length >= fence.length) fence = null;
      continue;
    }
    const openingFence = fenceRun(raw);
    if (openingFence) {
      protectedIndexes.add(index);
      fence = openingFence;
      continue;
    }
    if (inComment) {
      protectedIndexes.add(index);
      if (raw.includes('-->')) inComment = false;
      continue;
    }
    if (raw.includes('<!--')) {
      protectedIndexes.add(index);
      if (!raw.slice(raw.indexOf('<!--') + 4).includes('-->')) inComment = true;
      continue;
    }
    if (htmlClosing) {
      protectedIndexes.add(index);
      if (raw.includes(htmlClosing)) htmlClosing = null;
      continue;
    }
    const html = /^<([A-Za-z][\w:-]*)(?:\s[^>]*)?>/u.exec(trimmed);
    if (html) {
      protectedIndexes.add(index);
      const closing = `</${html[1]}>`;
      if (!trimmed.includes(closing) && !/\/>$/u.test(trimmed)) htmlClosing = closing;
      continue;
    }
    if (/^>/u.test(trimmed)) protectedIndexes.add(index);
  }
  return protectedIndexes;
}

function candidateAt(
  lines: readonly SourceLine[],
  protectedIndexes: ReadonlySet<number>,
  index: number,
): TableCandidate | null {
  if (protectedIndexes.has(index)) return null;
  const markdown = !protectedIndexes.has(index + 1)
    ? collectMarkdownCandidate(lines, index)
    : null;
  if (markdown) return markdown;
  if (lines[index].raw.includes('\t')) {
    return collectDelimitedCandidate(lines, index, '\t', 'tsv');
  }
  return collectDelimitedCandidate(lines, index, ',', 'csv');
}

function tableFromCandidate(
  rawText: string,
  lines: readonly SourceLine[],
  candidate: TableCandidate,
): PersonalWorkspacePocLosslessTable {
  const startOffset = lines[candidate.startLineIndex].startOffset;
  const endOffset = lines[candidate.endLineIndex].endOffset;
  const sourceRows = candidate.records.map((record, rowIndex) => {
    const lineRange = candidate.recordLineRanges[rowIndex];
    const rowStart = lines[lineRange.start].startOffset;
    const rowEnd = lines[lineRange.end].contentEndOffset;
    const rowRawText = rawText.slice(rowStart, rowEnd);
    const cells = record.spans.map((span, columnIndex) => {
      const cellStart = Math.min(rowEnd, rowStart + span.start);
      const cellEnd = Math.min(rowEnd, rowStart + span.end);
      const rawCell = rawText.slice(cellStart, cellEnd);
      return {
        cellId: stableId('lossless-cell', startOffset, rowIndex, columnIndex, rawCell),
        rowIndex,
        columnIndex,
        value: record.values[columnIndex] ?? '',
        rawText: rawCell,
        locator: locatorFor(rawText, lines, cellStart, cellEnd),
        sourcePreserved: true as const,
      };
    });
    return {
      rowId: stableId('lossless-row', startOffset, rowIndex, rowRawText),
      rowIndex,
      kind: candidate.rowKinds[rowIndex],
      values: [...record.values],
      rawText: rowRawText,
      locator: locatorFor(rawText, lines, rowStart, rowEnd),
      cells,
      sourcePreserved: true as const,
    };
  });
  const headers = sourceRows.find((row) => row.kind === 'header')?.values ?? [];
  const rows = sourceRows.filter((row) => row.kind === 'body');
  const logicalCellCount = sourceRows
    .filter((row) => row.kind !== 'separator')
    .reduce((sum, row) => sum + row.values.length, 0);
  return {
    tableId: stableId(
      'lossless-table', candidate.format, startOffset,
      rawText.slice(startOffset, endOffset),
    ),
    format: candidate.format,
    delimiter: candidate.format === 'csv' ? ',' : candidate.format === 'tsv' ? '\t' : '|',
    state: candidate.issues.length === 0 ? 'safe' : 'unsafe',
    headers: [...headers],
    rows: rows.map((row) => [...row.values]),
    sourceRows,
    logicalCellCount,
    rawText: rawText.slice(startOffset, endOffset),
    locator: locatorFor(rawText, lines, startOffset, endOffset),
    issues: [...candidate.issues],
    sourcePreserved: true,
  };
}

function blockKind(raw: string): Exclude<PersonalWorkspacePocLosslessBlockKind, 'table' | 'unknown'> {
  const trimmed = raw.trim();
  if (!trimmed) return 'blank';
  if (fenceRun(raw)) return 'code-fence';
  if (trimmed.startsWith('<!--')) return 'comment';
  if (/^<[^>]+>/u.test(trimmed)) return 'html';
  if (trimmed.startsWith('>')) return 'blockquote';
  return 'prose';
}

function sourceBlocks(
  rawText: string,
  lines: readonly SourceLine[],
  tableRanges: readonly Readonly<{ start: number; end: number }>[],
): PersonalWorkspacePocLosslessBlock[] {
  const blocks: PersonalWorkspacePocLosslessBlock[] = [];
  const pushBlock = (
    kind: PersonalWorkspacePocLosslessBlockKind,
    startLineIndex: number,
    endLineIndex: number,
  ) => {
    const start = lines[startLineIndex].startOffset;
    const end = lines[endLineIndex].endOffset;
    const blockRawText = rawText.slice(start, end);
    blocks.push({
      blockId: stableId('lossless-block', kind, start, end, blockRawText),
      kind,
      rawText: blockRawText,
      locator: locatorFor(rawText, lines, start, end),
      sourcePreserved: true,
    });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const table = tableRanges.find((range) => range.start === index);
    if (table) {
      pushBlock('table', table.start, table.end);
      index = table.end;
      continue;
    }
    if (tableRanges.some((range) => index > range.start && index <= range.end)) continue;

    const kind = blockKind(lines[index].raw);
    let endIndex = index;
    if (kind === 'code-fence') {
      const opening = fenceRun(lines[index].raw);
      for (let cursor = index + 1; opening && cursor < lines.length; cursor += 1) {
        endIndex = cursor;
        const closing = fenceRun(lines[cursor].raw);
        if (closing?.marker === opening.marker && closing.length >= opening.length) break;
      }
    } else if (kind === 'comment' && !lines[index].raw.includes('-->')) {
      while (endIndex + 1 < lines.length) {
        endIndex += 1;
        if (lines[endIndex].raw.includes('-->')) break;
      }
    } else if (kind === 'html') {
      const opening = /^<([A-Za-z][\w:-]*)(?:\s[^>]*)?>/u.exec(lines[index].raw.trim());
      const closing = opening ? `</${opening[1]}>` : null;
      if (closing && !lines[index].raw.includes(closing)) {
        while (endIndex + 1 < lines.length) {
          endIndex += 1;
          if (lines[endIndex].raw.includes(closing)) break;
        }
      }
    } else {
      while (
        endIndex + 1 < lines.length
        && !tableRanges.some((range) => range.start === endIndex + 1)
        && blockKind(lines[endIndex + 1].raw) === kind
      ) endIndex += 1;
    }
    pushBlock(kind, index, endIndex);
    index = endIndex;
  }
  return blocks;
}

function rawFallbackBlock(
  rawText: string,
  lines: readonly SourceLine[],
): PersonalWorkspacePocLosslessBlock {
  return {
    blockId: stableId('lossless-block', 'unknown', rawText),
    kind: 'unknown',
    rawText,
    locator: locatorFor(rawText, lines, 0, rawText.length),
    sourcePreserved: true,
  };
}

function projectionFor(
  table: PersonalWorkspacePocLosslessTable | null,
): PersonalWorkspacePocLosslessAuthoringAnalysis['projection'] {
  if (!table) {
    return {
      kind: 'none', headers: [], rows: [], generatedItemCount: 0,
      generatedTodoCount: 0, generatedCalendarCount: 0,
    };
  }
  const sourceRows = table.sourceRows.filter((row) => row.kind === 'body');
  return {
    kind: 'sheet-source-rows',
    tableId: table.tableId,
    headers: table.headers,
    rows: sourceRows.map((row) => ({
      projectionRowId: stableId('lossless-projection-row', table.tableId, row.rowId),
      sourceTableId: table.tableId,
      sourceRowId: row.rowId,
      sourceRowIndex: row.rowIndex,
      cells: row.cells.map((cell) => ({
        columnIndex: cell.columnIndex,
        header: table.headers[cell.columnIndex] ?? '',
        value: cell.value,
        rawText: cell.rawText,
        locator: cell.locator,
      })),
    })),
    generatedItemCount: 0,
    generatedTodoCount: 0,
    generatedCalendarCount: 0,
  };
}

export function analyzePersonalWorkspacePocLosslessAuthoring(
  rawText: string,
  options: Readonly<{
    limits?: Partial<PersonalWorkspacePocLosslessAuthoringLimits>;
  }> = {},
): PersonalWorkspacePocLosslessAuthoringAnalysis {
  const limits = Object.freeze({
    ...PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_LIMITS,
    ...options.limits,
  });
  const utf8Bytes = utf8ByteCount(rawText);
  const physicalLines = physicalLineCount(rawText);
  const lines = splitSourceLines(rawText);
  const exceeded: Array<'bytes' | 'lines' | 'cells'> = [];
  if (utf8Bytes > limits.utf8Bytes) exceeded.push('bytes');
  if (physicalLines > limits.physicalLines) exceeded.push('lines');

  const tables: PersonalWorkspacePocLosslessTable[] = [];
  const tableRanges: Array<{ start: number; end: number }> = [];
  if (exceeded.length === 0) {
    const protectedIndexes = protectedLineIndexes(lines);
    for (let index = 0; index < lines.length; index += 1) {
      const candidate = candidateAt(lines, protectedIndexes, index);
      if (!candidate) continue;
      const table = tableFromCandidate(rawText, lines, candidate);
      tables.push(table);
      tableRanges.push({ start: candidate.startLineIndex, end: candidate.endLineIndex });
      index = candidate.endLineIndex;
    }
  }

  const logicalCells = tables.reduce((sum, table) => sum + table.logicalCellCount, 0);
  if (logicalCells > limits.logicalCells) exceeded.push('cells');
  const tableIssues = tables.flatMap((table) => table.issues);
  if (tables.length > 1) tableIssues.push('multiple-tables');
  const issues = uniqueIssues([
    ...tableIssues,
    ...(exceeded.includes('bytes') ? ['byte-limit' as const] : []),
    ...(exceeded.includes('lines') ? ['line-limit' as const] : []),
    ...(exceeded.includes('cells') ? ['cell-limit' as const] : []),
  ]);
  const safeTable = exceeded.length === 0
    && tables.length === 1
    && tables[0].state === 'safe'
    ? tables[0]
    : null;
  const fallbackActive = exceeded.length > 0 || tableIssues.length > 0;
  const status = fallbackActive
    ? 'raw-fallback'
    : safeTable
      ? 'safe-table'
      : 'raw-preserved';
  const blocks = exceeded.length > 0
    ? [rawFallbackBlock(rawText, lines)]
    : sourceBlocks(rawText, lines, tableRanges);

  return {
    version: PERSONAL_WORKSPACE_POC_LOSSLESS_AUTHORING_VERSION,
    status,
    rawText,
    sourceFingerprint: fingerprintPersonalWorkspacePocLosslessSource(rawText),
    lineEndings: detectLineEndings(lines),
    budget: {
      utf8Bytes,
      physicalLines,
      logicalCells,
      limits,
      exceeded,
    },
    blocks,
    tables,
    projection: projectionFor(safeTable),
    fallback: {
      active: fallbackActive,
      reason: issues[0] ?? null,
      rawText,
      availableAs: ['raw-text', 'txt-copy'],
    },
    issues,
    sourceMutationCount: 0,
    sourcePreserved: true,
  };
}

export function roundTripPersonalWorkspacePocLosslessAuthoring(
  analysis: PersonalWorkspacePocLosslessAuthoringAnalysis,
): string {
  return analysis.rawText;
}
