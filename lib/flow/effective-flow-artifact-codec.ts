export type EffectiveFlowArtifactResource = Readonly<{
  label?: string;
  url: string;
}>;

export type EffectiveFlowLabeledField = Readonly<{
  label: string;
  value: string;
}>;

export type EffectiveFlowLabeledMemoRecord = Readonly<{
  order: number;
  title: string;
  fields: readonly EffectiveFlowLabeledField[];
}>;

export type EffectiveFlowLabeledMemoDocument = Readonly<{
  title: string;
  summary: string;
  records: readonly EffectiveFlowLabeledMemoRecord[];
  footerFields?: readonly EffectiveFlowLabeledField[];
}>;

function hasTsvControlCharacter(value: string): boolean {
  return /["\t\r\n]/u.test(value);
}

/**
 * Encodes one TSV cell using RFC4180-style double-quote escaping. TSV uses a
 * tab delimiter instead of a comma, but quoted newlines, tabs, CRLF, and
 * doubled quotes follow the same reversible rules.
 */
export function encodeEffectiveFlowTsvCell(value: string): string {
  if (!hasTsvControlCharacter(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

export function encodeEffectiveFlowTsv(
  rows: readonly (readonly string[])[],
): string {
  if (rows.length === 0) return '';
  return `${rows
    .map((row) => row.map(encodeEffectiveFlowTsvCell).join('\t'))
    .join('\n')}\n`;
}

/**
 * Parses TSV produced by encodeEffectiveFlowTsv. Row separators may be LF,
 * CRLF, or CR. Line endings inside quoted cells are returned exactly as they
 * appeared in the payload.
 */
export function parseEffectiveFlowTsv(payload: string): string[][] {
  if (!payload) return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let endedWithRowSeparator = false;

  const finishCell = () => {
    row.push(cell);
    cell = '';
  };
  const finishRow = () => {
    finishCell();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < payload.length; index += 1) {
    const character = payload[index]!;
    endedWithRowSeparator = false;

    if (quoted) {
      if (character === '"') {
        if (payload[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"' && cell.length === 0) {
      quoted = true;
      continue;
    }
    if (character === '\t') {
      finishCell();
      continue;
    }
    if (character === '\r' || character === '\n') {
      if (character === '\r' && payload[index + 1] === '\n') index += 1;
      finishRow();
      endedWithRowSeparator = true;
      continue;
    }
    cell += character;
  }

  if (quoted) throw new Error('Unclosed quoted TSV cell.');
  if (!endedWithRowSeparator || row.length > 0 || cell.length > 0) finishRow();
  return rows;
}

/**
 * Resources are stored as JSON Lines inside one quoted TSV cell. JSON Lines
 * keeps resource order and preserves labels and URLs without relying on a
 * lossy display separator such as `label - url`.
 */
export function encodeEffectiveFlowArtifactResources(
  resources: readonly EffectiveFlowArtifactResource[],
): string {
  return resources
    .map((resource) => JSON.stringify({
      ...(resource.label !== undefined ? { label: resource.label } : {}),
      url: resource.url,
    }))
    .join('\n');
}

export function parseEffectiveFlowArtifactResources(
  payload: string,
): EffectiveFlowArtifactResource[] {
  if (!payload) return [];
  return payload.split('\n').map((line) => {
    const parsed: unknown = JSON.parse(line);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Artifact resource must be a JSON object.');
    }
    const candidate = parsed as { label?: unknown; url?: unknown };
    if (typeof candidate.url !== 'string') {
      throw new Error('Artifact resource URL must be a string.');
    }
    if (candidate.label !== undefined && typeof candidate.label !== 'string') {
      throw new Error('Artifact resource label must be a string when present.');
    }
    return {
      ...(candidate.label !== undefined ? { label: candidate.label } : {}),
      url: candidate.url,
    };
  });
}

function normalizeMemoLineEndings(value: string): string {
  return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

function appendLabeledField(
  lines: string[],
  field: EffectiveFlowLabeledField,
  indent: string,
): void {
  const [first = '', ...rest] = normalizeMemoLineEndings(field.value).split('\n');
  lines.push(`${indent}${field.label}: ${first}`);
  rest.forEach((line) => lines.push(`${indent}   ${line}`));
}

/**
 * Emits a readable, deterministic numbered Memo. Continuation indentation is
 * part of the grammar, so field values may contain tabs, quotes, colons, and
 * lines that look like another label without becoming ambiguous.
 */
export function encodeEffectiveFlowLabeledMemo(
  document: EffectiveFlowLabeledMemoDocument,
): string {
  const lines = [document.title, '', document.summary];
  document.records.forEach((record) => {
    lines.push('', `${record.order}. ${record.title}`);
    record.fields.forEach((field) => appendLabeledField(lines, field, '   '));
  });
  if (document.footerFields?.length) {
    lines.push('');
    document.footerFields.forEach((field) => appendLabeledField(lines, field, ''));
  }
  return `${lines.join('\n')}\n`;
}

function parseLabeledField(
  lines: readonly string[],
  startIndex: number,
  indent: string,
): { field: EffectiveFlowLabeledField; nextIndex: number } | undefined {
  const line = lines[startIndex];
  if (line === undefined || !line.startsWith(indent)) return undefined;
  const content = line.slice(indent.length);
  const separator = content.indexOf(': ');
  if (separator <= 0) return undefined;

  const label = content.slice(0, separator);
  const values = [content.slice(separator + 2)];
  const continuationIndent = `${indent}   `;
  let nextIndex = startIndex + 1;
  while (lines[nextIndex]?.startsWith(continuationIndent)) {
    values.push(lines[nextIndex]!.slice(continuationIndent.length));
    nextIndex += 1;
  }
  return {
    field: { label, value: values.join('\n') },
    nextIndex,
  };
}

export function parseEffectiveFlowLabeledMemo(
  payload: string,
): EffectiveFlowLabeledMemoDocument {
  const normalized = normalizeMemoLineEndings(payload);
  const lines = normalized.endsWith('\n')
    ? normalized.slice(0, -1).split('\n')
    : normalized.split('\n');
  if (lines.length < 3 || lines[1] !== '') {
    throw new Error('Labeled Memo must contain a title, blank line, and summary.');
  }

  const records: EffectiveFlowLabeledMemoRecord[] = [];
  const footerFields: EffectiveFlowLabeledField[] = [];
  let index = 3;

  while (index < lines.length) {
    if (lines[index] === '') {
      index += 1;
      continue;
    }

    const heading = /^(\d+)\. (.*)$/u.exec(lines[index]!);
    if (heading) {
      const fields: EffectiveFlowLabeledField[] = [];
      index += 1;
      while (index < lines.length && lines[index] !== '') {
        const parsed = parseLabeledField(lines, index, '   ');
        if (!parsed) throw new Error(`Invalid labeled Memo row at line ${index + 1}.`);
        fields.push(parsed.field);
        index = parsed.nextIndex;
      }
      records.push({ order: Number(heading[1]), title: heading[2]!, fields });
      continue;
    }

    const parsedFooter = parseLabeledField(lines, index, '');
    if (!parsedFooter) throw new Error(`Invalid labeled Memo footer at line ${index + 1}.`);
    footerFields.push(parsedFooter.field);
    index = parsedFooter.nextIndex;
  }

  return {
    title: lines[0]!,
    summary: lines[2]!,
    records,
    ...(footerFields.length > 0 ? { footerFields } : {}),
  };
}
