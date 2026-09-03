export const PERSONAL_WORKSPACE_POC_AUTHORING_FIDELITY_VERSION = 1 as const;

export type PersonalWorkspacePocAuthoringFidelityCode =
  | 'unknown-property'
  | 'nested-checklist-unsupported'
  | 'recurrence-unsupported'
  | 'execution-time-unsupported'
  | 'table-unsupported'
  | 'near-miss-checkbox';

export type PersonalWorkspacePocAuthoringFidelityNextStep =
  | 'review'
  | 'correct'
  | 'defer';

/** Offsets use JavaScript string units and always address the supplied rawText. */
export type PersonalWorkspacePocAuthoringSourceLocator = Readonly<{
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  rawText: string;
  rawHash: string;
  exact: true;
}>;

export type PersonalWorkspacePocAuthoringSourceLineKind =
  | 'blank'
  | 'prose'
  | 'title'
  | 'section'
  | 'item'
  | 'property'
  | 'fenced-code'
  | 'table';

export type PersonalWorkspacePocAuthoringSourceLineOwner =
  | 'source'
  | 'flow'
  | 'item';

export type PersonalWorkspacePocAuthoringSourceLineSupport =
  | 'supported'
  | 'source-only'
  | 'unsupported';

/**
 * One deterministic record exists for every logical source line, including
 * the final empty line after a trailing line terminator. `rawLine` excludes
 * its terminator while `locator.rawText` includes it, so concatenating all
 * locator slices reproduces the exact JS string bytes.
 */
export type PersonalWorkspacePocAuthoringSourceLine = Readonly<{
  line: number;
  rawLine: string;
  kind: PersonalWorkspacePocAuthoringSourceLineKind;
  owner: PersonalWorkspacePocAuthoringSourceLineOwner;
  support: PersonalWorkspacePocAuthoringSourceLineSupport;
  severity: 'none' | 'blocking';
  reason: string;
  locator: PersonalWorkspacePocAuthoringSourceLocator;
  ownerItemLine?: number;
}>;

export type PersonalWorkspacePocAuthoringFidelityEntry = Readonly<{
  entryId: string;
  code: PersonalWorkspacePocAuthoringFidelityCode;
  field: string;
  message: string;
  source: PersonalWorkspacePocAuthoringSourceLocator;
  sourcePreserved: true;
  material: true;
  commit: 'block';
  next: PersonalWorkspacePocAuthoringFidelityNextStep;
  ownerItemLine?: number;
}>;

export type PersonalWorkspacePocAuthoringFidelityManifest = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_AUTHORING_FIDELITY_VERSION;
  manifestId: string;
  sourceFingerprint: string;
  sourceLength: number;
  sourcePreserved: true;
  sourceLines: readonly PersonalWorkspacePocAuthoringSourceLine[];
  entries: readonly PersonalWorkspacePocAuthoringFidelityEntry[];
  blockingCodes: readonly PersonalWorkspacePocAuthoringFidelityCode[];
}>;

export type PersonalWorkspacePocAuthoringFidelityAnalysis = Readonly<{
  manifest: PersonalWorkspacePocAuthoringFidelityManifest;
  /** Lines that the explicit Flow grammar must never interpret. */
  protectedLineNumbers: readonly number[];
}>;

type ExactSourceLine = Readonly<{
  line: number;
  startOffset: number;
  endOffset: number;
  terminatorEndOffset: number;
  text: string;
}>;

type OpenFence = Readonly<{
  marker: '`' | '~';
  length: number;
}>;

const KNOWN_ITEM_PROPERTIES = new Set([
  '설명',
  '상대 날짜',
  '날짜',
  '시간',
  '시간대',
  '장소',
  '소요 시간',
  '자료',
  '출처',
  '반복',
  '반복 종료',
  '실행 조건',
  '완료 기준',
  '안내',
  '주의',
]);

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

function splitExactSourceLines(rawText: string): ExactSourceLine[] {
  const lines: ExactSourceLine[] = [];
  let startOffset = 0;
  let line = 1;

  while (startOffset < rawText.length) {
    let endOffset = startOffset;
    while (
      endOffset < rawText.length
      && rawText[endOffset] !== '\r'
      && rawText[endOffset] !== '\n'
    ) {
      endOffset += 1;
    }

    let terminatorEndOffset = endOffset;
    if (rawText[endOffset] === '\r' && rawText[endOffset + 1] === '\n') {
      terminatorEndOffset += 2;
    } else if (rawText[endOffset] === '\r' || rawText[endOffset] === '\n') {
      terminatorEndOffset += 1;
    }

    lines.push({
      line,
      startOffset,
      endOffset,
      terminatorEndOffset,
      text: rawText.slice(startOffset, endOffset),
    });
    startOffset = terminatorEndOffset;
    line += 1;
  }

  if (rawText.length === 0 || /[\r\n]$/u.test(rawText)) {
    lines.push({
      line,
      startOffset: rawText.length,
      endOffset: rawText.length,
      terminatorEndOffset: rawText.length,
      text: '',
    });
  }

  return lines;
}

function locatorForLines(
  rawText: string,
  first: ExactSourceLine,
  last: ExactSourceLine = first,
): PersonalWorkspacePocAuthoringSourceLocator {
  const source = rawText.slice(first.startOffset, last.endOffset);
  return {
    startOffset: first.startOffset,
    endOffset: last.endOffset,
    startLine: first.line,
    endLine: last.line,
    rawText: source,
    rawHash: `slice-v1:${source.length}:${stableHash(source)}`,
    exact: true,
  };
}

function locatorForExactSourceLine(
  rawText: string,
  line: ExactSourceLine,
): PersonalWorkspacePocAuthoringSourceLocator {
  const source = rawText.slice(line.startOffset, line.terminatorEndOffset);
  return {
    startOffset: line.startOffset,
    endOffset: line.terminatorEndOffset,
    startLine: line.line,
    endLine: line.line,
    rawText: source,
    rawHash: `slice-v1:${source.length}:${stableHash(source)}`,
    exact: true,
  };
}

function readOpeningFence(line: string): OpenFence | null {
  const match = /^ {0,3}(`{3,}|~{3,})/u.exec(line);
  if (!match) return null;
  return {
    marker: match[1][0] as OpenFence['marker'],
    length: match[1].length,
  };
}

function closesFence(line: string, fence: OpenFence): boolean {
  const trimmed = line.trim();
  if (trimmed.length < fence.length) return false;
  if ([...trimmed].some((character) => character !== fence.marker)) return false;
  return trimmed.length >= fence.length;
}

function collectCodeFenceLines(lines: readonly ExactSourceLine[]): Set<number> {
  const protectedLines = new Set<number>();
  let openFence: OpenFence | null = null;

  for (const line of lines) {
    if (openFence) {
      protectedLines.add(line.line);
      if (closesFence(line.text, openFence)) openFence = null;
      continue;
    }

    const nextFence = readOpeningFence(line.text);
    if (!nextFence) continue;
    openFence = nextFence;
    protectedLines.add(line.line);
  }

  return protectedLines;
}

function nearMissCheckboxTitle(line: string): string | null {
  const patterns = [
    /^- \[\][ \t]+(.+)$/u,
    /^-\[\][ \t]+(.+)$/u,
    /^- \[ {2}\][ \t]+(.+)$/u,
  ];
  for (const pattern of patterns) {
    const title = pattern.exec(line)?.[1]?.trim();
    if (title) return title;
  }
  return null;
}

function markdownSeparatorColumns(line: string): number | null {
  let body = line.trim();
  if (!body.includes('|')) return null;
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|')) body = body.slice(0, -1);
  const cells = body.split('|').map((cell) => cell.trim());
  if (
    cells.length < 2
    || cells.some((cell) => !/^:?-{3,}:?$/u.test(cell))
  ) {
    return null;
  }
  return cells.length;
}

function delimitedColumnCount(
  line: string,
  delimiter: ',' | '\t',
): number | null {
  if (
    !line.includes(delimiter)
    || /^\s*(?:#|- )/u.test(line)
    || /^(?: {2,}|\t+)- [^:\r\n]+:/u.test(line)
  ) {
    return null;
  }

  let columns = 1;
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') index += 1;
      else inQuotes = !inQuotes;
    } else if (!inQuotes && character === delimiter) {
      columns += 1;
    }
  }
  return !inQuotes && columns >= 2 ? columns : null;
}

function createEntry(
  sourceFingerprint: string,
  code: PersonalWorkspacePocAuthoringFidelityCode,
  field: string,
  message: string,
  source: PersonalWorkspacePocAuthoringSourceLocator,
  next: PersonalWorkspacePocAuthoringFidelityNextStep,
  ownerItemLine?: number,
): PersonalWorkspacePocAuthoringFidelityEntry {
  return {
    entryId: `fidelity-entry-${stableHash([
      sourceFingerprint,
      code,
      field,
      source.startOffset,
      source.endOffset,
      source.rawHash,
    ].join('\u001f'))}`,
    code,
    field,
    message,
    source,
    sourcePreserved: true,
    material: true,
    commit: 'block',
    next,
    ...(ownerItemLine ? { ownerItemLine } : {}),
  };
}

function sourceLineKindForUnsupported(
  entries: readonly PersonalWorkspacePocAuthoringFidelityEntry[],
): PersonalWorkspacePocAuthoringSourceLineKind {
  if (entries.some((entry) => entry.code === 'table-unsupported')) return 'table';
  if (entries.some((entry) => (
    entry.code === 'near-miss-checkbox'
    || entry.code === 'nested-checklist-unsupported'
  ))) return 'item';
  return 'property';
}

function buildSourceLineRecords(input: Readonly<{
  rawText: string;
  lines: readonly ExactSourceLine[];
  fencedCodeLines: ReadonlySet<number>;
  entries: readonly PersonalWorkspacePocAuthoringFidelityEntry[];
}>): PersonalWorkspacePocAuthoringSourceLine[] {
  const records: PersonalWorkspacePocAuthoringSourceLine[] = [];
  let activeItemLine: number | undefined;

  for (const line of input.lines) {
    const locator = locatorForExactSourceLine(input.rawText, line);
    const unsupported = input.entries.filter((entry) => (
      line.line >= entry.source.startLine && line.line <= entry.source.endLine
    ));
    if (unsupported.length > 0) {
      const ownerItemLine = unsupported.find((entry) => entry.ownerItemLine)?.ownerItemLine;
      records.push({
        line: line.line,
        rawLine: line.text,
        kind: sourceLineKindForUnsupported(unsupported),
        owner: ownerItemLine ? 'item' : 'source',
        support: 'unsupported',
        severity: 'blocking',
        reason: [...new Set(unsupported.map((entry) => entry.code))].join('|'),
        locator,
        ...(ownerItemLine ? { ownerItemLine } : {}),
      });
      if (unsupported.some((entry) => entry.code === 'near-miss-checkbox')) {
        activeItemLine = undefined;
      }
      continue;
    }

    if (input.fencedCodeLines.has(line.line)) {
      records.push({
        line: line.line,
        rawLine: line.text,
        kind: 'fenced-code',
        owner: 'source',
        support: 'source-only',
        severity: 'none',
        reason: 'fenced-code-preserved',
        locator,
      });
      continue;
    }

    if (!line.text.trim()) {
      records.push({
        line: line.line,
        rawLine: line.text,
        kind: 'blank',
        owner: 'source',
        support: 'source-only',
        severity: 'none',
        reason: 'blank-source-line',
        locator,
      });
      continue;
    }

    const title = /^# (.*)$/u.exec(line.text);
    if (title) {
      const material = Boolean(title[1].trim());
      records.push({
        line: line.line,
        rawLine: line.text,
        kind: 'title',
        owner: material ? 'flow' : 'source',
        support: material ? 'supported' : 'source-only',
        severity: 'none',
        reason: material ? 'flow-title' : 'blank-title-scaffold',
        locator,
      });
      activeItemLine = undefined;
      continue;
    }

    const section = /^## (.*)$/u.exec(line.text);
    if (section) {
      const material = Boolean(section[1].trim());
      records.push({
        line: line.line,
        rawLine: line.text,
        kind: 'section',
        owner: material ? 'item' : 'source',
        support: material ? 'supported' : 'source-only',
        severity: 'none',
        reason: material ? 'item-section' : 'blank-section-scaffold',
        locator,
      });
      activeItemLine = undefined;
      continue;
    }

    const rootCheckbox = /^- \[([ xX])\](?: (.*))?$/u.exec(line.text);
    if (rootCheckbox) {
      const material = Boolean(rootCheckbox[2]?.trim());
      activeItemLine = material ? line.line : undefined;
      records.push({
        line: line.line,
        rawLine: line.text,
        kind: 'item',
        owner: material ? 'item' : 'source',
        support: material ? 'supported' : 'source-only',
        severity: 'none',
        reason: material ? 'personal-flow-item' : 'blank-item-scaffold',
        locator,
        ...(material ? { ownerItemLine: line.line } : {}),
      });
      continue;
    }

    const subcheck = /^ {2}- \[([ xX])\](?:[ \t]+(.*))?$/u.exec(line.text);
    if (subcheck && activeItemLine) {
      const material = Boolean(subcheck[2]?.trim());
      records.push({
        line: line.line,
        rawLine: line.text,
        kind: 'item',
        owner: material ? 'item' : 'source',
        support: material ? 'supported' : 'source-only',
        severity: 'none',
        reason: material ? 'item-subcheck' : 'blank-subcheck-scaffold',
        locator,
        ...(material ? { ownerItemLine: activeItemLine } : {}),
      });
      continue;
    }

    const anchor = /^\s*- 기준일:\s*(.*)$/u.exec(line.text);
    if (anchor) {
      const material = Boolean(anchor[1].trim());
      records.push({
        line: line.line,
        rawLine: line.text,
        kind: 'property',
        owner: material ? 'flow' : 'source',
        support: material ? 'supported' : 'source-only',
        severity: 'none',
        reason: material ? 'flow-anchor' : 'blank-anchor-scaffold',
        locator,
      });
      continue;
    }

    const property = /^(?: {2,}|\t+)- ([^:\r\n]+):[ \t]*(.*)$/u.exec(line.text);
    if (property) {
      const field = property[1].trim();
      const material = Boolean(property[2].trim());
      const sourceBackedDescription = Boolean(
        activeItemLine
        && material
        && field
        && /^ {2}- /u.test(line.text)
        && !KNOWN_ITEM_PROPERTIES.has(field),
      );
      const supported = Boolean(
        activeItemLine
        && material
        && (KNOWN_ITEM_PROPERTIES.has(field) || sourceBackedDescription),
      );
      records.push({
        line: line.line,
        rawLine: line.text,
        kind: 'property',
        owner: activeItemLine ? 'item' : 'source',
        support: supported ? 'supported' : 'source-only',
        severity: 'none',
        reason: supported
          ? sourceBackedDescription
            ? 'source-backed-item-description'
            : 'supported-item-property'
          : !material
            ? 'blank-item-property'
            : 'orphan-or-unknown-item-property',
        locator,
        ...(activeItemLine ? { ownerItemLine: activeItemLine } : {}),
      });
      continue;
    }

    records.push({
      line: line.line,
      rawLine: line.text,
      kind: 'prose',
      owner: 'source',
      support: 'source-only',
      severity: 'none',
      reason: 'ordinary-source-prose',
      locator,
    });
  }
  return records;
}

function detectDelimitedTableRuns(
  rawText: string,
  sourceFingerprint: string,
  lines: readonly ExactSourceLine[],
  unavailableLines: Set<number>,
  delimiter: ',' | '\t',
  format: 'CSV' | 'TSV',
): PersonalWorkspacePocAuthoringFidelityEntry[] {
  const entries: PersonalWorkspacePocAuthoringFidelityEntry[] = [];
  let index = 0;

  while (index < lines.length) {
    const first = lines[index];
    if (unavailableLines.has(first.line)) {
      index += 1;
      continue;
    }
    const columns = delimitedColumnCount(first.text, delimiter);
    if (columns === null) {
      index += 1;
      continue;
    }

    let endIndex = index + 1;
    while (
      endIndex < lines.length
      && !unavailableLines.has(lines[endIndex].line)
      && delimitedColumnCount(lines[endIndex].text, delimiter) === columns
    ) {
      endIndex += 1;
    }

    const minimumRows = delimiter === ',' && columns === 2 ? 3 : 2;
    if (endIndex - index < minimumRows) {
      index += 1;
      continue;
    }

    const last = lines[endIndex - 1];
    const source = locatorForLines(rawText, first, last);
    entries.push(createEntry(
      sourceFingerprint,
      'table-unsupported',
      format.toLowerCase(),
      `${format} 표 구조는 아직 개인 Flow로 손실 없이 옮길 수 없어 원문에서 수정해야 합니다.`,
      source,
      'defer',
    ));
    for (let lineIndex = index; lineIndex < endIndex; lineIndex += 1) {
      unavailableLines.add(lines[lineIndex].line);
    }
    index = endIndex;
  }

  return entries;
}

export function analyzePersonalWorkspacePocAuthoringFidelity(input: Readonly<{
  rawText: string;
  sourceFingerprint: string;
}>): PersonalWorkspacePocAuthoringFidelityAnalysis {
  const lines = splitExactSourceLines(input.rawText);
  const fencedCodeLines = collectCodeFenceLines(lines);
  const protectedLines = new Set(fencedCodeLines);
  const entries: PersonalWorkspacePocAuthoringFidelityEntry[] = [];
  let activeItemLine: number | undefined;

  for (const line of lines) {
    if (protectedLines.has(line.line)) continue;

    if (/^#{1,2} /u.test(line.text)) {
      activeItemLine = undefined;
      continue;
    }

    const rootCheckbox = /^- \[([ xX])\](?: (.*))?$/u.exec(line.text);
    if (rootCheckbox) {
      activeItemLine = rootCheckbox[2]?.trim() ? line.line : undefined;
      continue;
    }

    const nearMissTitle = nearMissCheckboxTitle(line.text);
    if (nearMissTitle) {
      entries.push(createEntry(
        input.sourceFingerprint,
        'near-miss-checkbox',
        'checkbox',
        '체크 표식이 할 일 문법과 조금 다릅니다. 원문의 표식만 명시적으로 고쳐야 합니다.',
        locatorForLines(input.rawText, line),
        'correct',
      ));
      activeItemLine = undefined;
      continue;
    }

    const supportedSubcheck = /^ {2}- \[([ xX])\](?:[ \t]+(.*))?$/u.exec(
      line.text,
    );
    if (supportedSubcheck && activeItemLine) {
      continue;
    }

    const nestedCheckbox = /^(?: {4,}|\t+)- \[([ xX])\](?:[ \t]+(.*))?$/u.exec(
      line.text,
    );
    const nestedTitle = nestedCheckbox?.[2]?.trim();
    if (nestedTitle) {
      entries.push(createEntry(
        input.sourceFingerprint,
        'nested-checklist-unsupported',
        'nested-checklist',
        '하위 체크는 아직 개인 Flow 구조로 손실 없이 옮길 수 없어 원문에서 수정해야 합니다.',
        locatorForLines(input.rawText, line),
        'defer',
        activeItemLine,
      ));
      continue;
    }

    const property = /^(?: {2,}|\t+)- ([^:\r\n]+):[ \t]*(.*)$/u.exec(
      line.text,
    );
    if (!property || !activeItemLine) continue;
    const field = property[1].trim();
    const value = property[2].trim();
    if (!value) continue;

    if (
      !KNOWN_ITEM_PROPERTIES.has(field)
      && (!field || !/^ {2}- /u.test(line.text))
    ) {
      entries.push(createEntry(
        input.sourceFingerprint,
        'unknown-property',
        field,
        `알 수 없는 항목 정보 '${field}'를 구조화할 수 없어 원문에서 확인해야 합니다.`,
        locatorForLines(input.rawText, line),
        'review',
        activeItemLine,
      ));
    }
  }

  for (let index = 0; index + 1 < lines.length; index += 1) {
    const first = lines[index];
    const separator = lines[index + 1];
    if (
      protectedLines.has(first.line)
      || protectedLines.has(separator.line)
      || !first.text.includes('|')
      || markdownSeparatorColumns(separator.text) === null
    ) {
      continue;
    }

    let endIndex = index + 2;
    while (
      endIndex < lines.length
      && !protectedLines.has(lines[endIndex].line)
      && lines[endIndex].text.trim().length > 0
      && lines[endIndex].text.includes('|')
    ) {
      endIndex += 1;
    }
    const last = lines[endIndex - 1];
    entries.push(createEntry(
      input.sourceFingerprint,
      'table-unsupported',
      'markdown',
      'Markdown 표 구조는 아직 개인 Flow로 손실 없이 옮길 수 없어 원문에서 수정해야 합니다.',
      locatorForLines(input.rawText, first, last),
      'defer',
    ));
    for (let lineIndex = index; lineIndex < endIndex; lineIndex += 1) {
      protectedLines.add(lines[lineIndex].line);
    }
    index = endIndex - 1;
  }

  entries.push(...detectDelimitedTableRuns(
    input.rawText,
    input.sourceFingerprint,
    lines,
    protectedLines,
    '\t',
    'TSV',
  ));
  entries.push(...detectDelimitedTableRuns(
    input.rawText,
    input.sourceFingerprint,
    lines,
    protectedLines,
    ',',
    'CSV',
  ));

  entries.sort((left, right) => (
    left.source.startOffset - right.source.startOffset
    || left.source.endOffset - right.source.endOffset
    || left.code.localeCompare(right.code)
    || left.field.localeCompare(right.field)
  ));
  const blockingCodes = [...new Set(entries.map((entry) => entry.code))];
  const sourceLines = buildSourceLineRecords({
    rawText: input.rawText,
    lines,
    fencedCodeLines,
    entries,
  });
  const manifestId = `fidelity-manifest-${stableHash([
    input.sourceFingerprint,
    ...entries.map((entry) => entry.entryId),
    ...sourceLines.map((line) => [
      line.line,
      line.kind,
      line.owner,
      line.support,
      line.severity,
      line.reason,
      line.locator.rawHash,
      line.ownerItemLine ?? '',
    ].join('\u001e')),
  ].join('\u001f'))}`;

  return {
    manifest: {
      version: PERSONAL_WORKSPACE_POC_AUTHORING_FIDELITY_VERSION,
      manifestId,
      sourceFingerprint: input.sourceFingerprint,
      sourceLength: input.rawText.length,
      sourcePreserved: true,
      sourceLines,
      entries,
      blockingCodes,
    },
    protectedLineNumbers: [...protectedLines].sort((left, right) => left - right),
  };
}

/**
 * Rebuilds a manifest from the exact source bytes and compares the whole
 * deterministic contract. Persisted manifests therefore cannot silently drift
 * away from their source locator, blocking decision, or source fingerprint.
 */
export function isPersonalWorkspacePocAuthoringFidelityManifestForSource(
  value: unknown,
  input: Readonly<{
    rawText: string;
    sourceFingerprint: string;
  }>,
): value is PersonalWorkspacePocAuthoringFidelityManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const expected = analyzePersonalWorkspacePocAuthoringFidelity(input).manifest;
  try {
    return JSON.stringify(value) === JSON.stringify(expected);
  } catch {
    return false;
  }
}

/**
 * Read-only compatibility for additive-v1 handoffs written before complete
 * per-line fidelity records existed. New materialization never emits this
 * shape; callers must not use it as a commit contract.
 */
export function isLegacyPersonalWorkspacePocAuthoringFidelityManifestForSource(
  value: unknown,
  input: Readonly<{
    rawText: string;
    sourceFingerprint: string;
  }>,
): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const current = analyzePersonalWorkspacePocAuthoringFidelity(input).manifest;
  const legacyManifestId = `fidelity-manifest-${stableHash([
    input.sourceFingerprint,
    ...current.entries.map((entry) => entry.entryId),
  ].join('\u001f'))}`;
  const legacy = {
    version: current.version,
    manifestId: legacyManifestId,
    sourceFingerprint: current.sourceFingerprint,
    sourceLength: current.sourceLength,
    sourcePreserved: current.sourcePreserved,
    entries: current.entries,
    blockingCodes: current.blockingCodes,
  };
  try {
    return JSON.stringify(value) === JSON.stringify(legacy);
  } catch {
    return false;
  }
}
