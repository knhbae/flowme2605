import {
  analyzePersonalWorkspacePocAuthoringFidelity,
} from './personal-workspace-poc-authoring-fidelity';
import {
  fingerprintPersonalWorkspacePocAuthoringSource,
  parsePersonalWorkspacePocAuthoringRecurrence,
} from './personal-workspace-poc-authoring';

export const PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG_VERSION = 2 as const;
export const PERSONAL_WORKSPACE_POC_AUTHORING_SOURCE_TRANSACTION_VERSION = 1 as const;

export const PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_KEYS = [
  'date',
  'relativeDate',
  'time',
  'timezone',
  'place',
  'duration',
  'detail',
  'completion',
  'condition',
  'resource',
  'repeat',
  'repeatEnd',
  'guide',
  'caution',
  'source',
  'subcheck',
] as const;

export type PersonalWorkspacePocAuthoringPropertyKey =
  (typeof PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_KEYS)[number];

export type PersonalWorkspacePocAuthoringPropertyCatalogEntry = Readonly<{
  key: PersonalWorkspacePocAuthoringPropertyKey;
  label: string;
  sourceLabel: string;
  aliases: readonly string[];
  group: 'schedule' | 'execution' | 'content' | 'provenance';
  editor: 'inline' | 'native-date' | 'native-time' | 'dependent';
  valueKind: 'date' | 'relative-date' | 'time' | 'time-zone' | 'duration' | 'recurrence' | 'recurrence-end' | 'url' | 'text' | 'child-action';
  sourceKind: 'property' | 'child-action';
  writeSupport: 'editable' | 'blocked';
  handoffSupport: 'projected' | 'preserved-blocking';
  blockedReason?: 'requires-lossless-parser';
}>;

function catalogEntry(
  entry: PersonalWorkspacePocAuthoringPropertyCatalogEntry,
): PersonalWorkspacePocAuthoringPropertyCatalogEntry {
  return Object.freeze({ ...entry, aliases: Object.freeze([...entry.aliases]) });
}

/**
 * Versioned catalog for the bounded integrated PoC. Authoring edits change the
 * working source only. Saving later creates a separate personal projection;
 * result-side edits never write back into this source.
 */
export const PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG = Object.freeze([
  catalogEntry({
    key: 'date', label: '날짜', sourceLabel: '날짜', aliases: ['날짜'],
    group: 'schedule', editor: 'native-date', valueKind: 'date', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'projected',
  }),
  catalogEntry({
    key: 'relativeDate', label: '기준일 기준 날짜', sourceLabel: '상대 날짜', aliases: ['상대 날짜', '상대날짜', '상대일'],
    group: 'schedule', editor: 'dependent', valueKind: 'relative-date', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'projected',
  }),
  catalogEntry({
    key: 'time', label: '시간', sourceLabel: '시간', aliases: ['시간'],
    group: 'schedule', editor: 'native-time', valueKind: 'time', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'preserved-blocking',
  }),
  catalogEntry({
    key: 'timezone', label: '시간대', sourceLabel: '시간대', aliases: ['시간대'],
    group: 'schedule', editor: 'dependent', valueKind: 'time-zone', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'preserved-blocking',
  }),
  catalogEntry({
    key: 'place', label: '장소', sourceLabel: '장소', aliases: ['장소', '위치'],
    group: 'schedule', editor: 'inline', valueKind: 'text', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'projected',
  }),
  catalogEntry({
    key: 'duration', label: '소요 시간', sourceLabel: '소요 시간', aliases: ['소요 시간', '소요시간', '예상 시간', '예상시간'],
    group: 'schedule', editor: 'inline', valueKind: 'duration', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'preserved-blocking',
  }),
  catalogEntry({
    key: 'detail', label: '설명', sourceLabel: '설명', aliases: ['설명', '상세', '자세히', '방법'],
    group: 'content', editor: 'inline', valueKind: 'text', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'preserved-blocking',
  }),
  catalogEntry({
    key: 'completion', label: '완료 기준', sourceLabel: '완료 기준', aliases: ['완료 기준', '완료기준'],
    group: 'execution', editor: 'inline', valueKind: 'text', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'projected',
  }),
  catalogEntry({
    key: 'condition', label: '조건 메모', sourceLabel: '실행 조건', aliases: ['실행 조건', '실행조건', '조건'],
    group: 'execution', editor: 'inline', valueKind: 'text', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'preserved-blocking',
  }),
  catalogEntry({
    key: 'resource', label: '관련 링크', sourceLabel: '자료', aliases: ['자료', '링크', '영상'],
    group: 'content', editor: 'inline', valueKind: 'url', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'projected',
  }),
  catalogEntry({
    key: 'repeat', label: '반복', sourceLabel: '반복', aliases: ['반복'],
    group: 'schedule', editor: 'dependent', valueKind: 'recurrence', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'preserved-blocking',
  }),
  catalogEntry({
    key: 'repeatEnd', label: '반복 종료', sourceLabel: '반복 종료', aliases: ['반복 종료', '반복종료'],
    group: 'schedule', editor: 'dependent', valueKind: 'recurrence-end', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'preserved-blocking',
  }),
  catalogEntry({
    key: 'guide', label: '안내', sourceLabel: '안내', aliases: ['안내', '가이드'],
    group: 'content', editor: 'inline', valueKind: 'text', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'preserved-blocking',
  }),
  catalogEntry({
    key: 'caution', label: '주의', sourceLabel: '주의', aliases: ['주의', '경고'],
    group: 'content', editor: 'inline', valueKind: 'text', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'preserved-blocking',
  }),
  catalogEntry({
    key: 'source', label: '원문 출처', sourceLabel: '출처', aliases: ['출처'],
    group: 'provenance', editor: 'inline', valueKind: 'url', sourceKind: 'property',
    writeSupport: 'editable', handoffSupport: 'preserved-blocking',
  }),
  catalogEntry({
    key: 'subcheck', label: '하위 체크', sourceLabel: '하위 체크', aliases: [],
    group: 'execution', editor: 'inline', valueKind: 'child-action', sourceKind: 'child-action',
    writeSupport: 'editable', handoffSupport: 'preserved-blocking',
  }),
] satisfies readonly PersonalWorkspacePocAuthoringPropertyCatalogEntry[]);

const CATALOG_BY_KEY = new Map(
  PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG.map((entry) => [entry.key, entry]),
);

const PROPERTY_KEY_BY_LABEL = new Map<string, PersonalWorkspacePocAuthoringPropertyKey>();
for (const entry of PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG) {
  // The integrated parser currently recognizes canonical Korean labels only.
  // Aliases stay catalog metadata until the parser can prove lossless support.
  if (entry.sourceLabel) {
    PROPERTY_KEY_BY_LABEL.set(compactLabel(entry.sourceLabel), entry.key);
  }
}

export function getPersonalWorkspacePocAuthoringProperty(
  key: string,
): PersonalWorkspacePocAuthoringPropertyCatalogEntry | null {
  return CATALOG_BY_KEY.get(key as PersonalWorkspacePocAuthoringPropertyKey) ?? null;
}

export function listEditablePersonalWorkspacePocAuthoringProperties(): readonly PersonalWorkspacePocAuthoringPropertyCatalogEntry[] {
  return PERSONAL_WORKSPACE_POC_AUTHORING_PROPERTY_CATALOG.filter(
    (entry) => entry.writeSupport === 'editable',
  );
}

type ExactSourceLine = Readonly<{
  line: number;
  startOffset: number;
  endOffset: number;
  terminatorEndOffset: number;
  text: string;
}>;

type SourceSelection = Readonly<{ start: number; end: number }>;
type SourceChange = Readonly<{ from: number; to: number; insert: string }>;

export type PersonalWorkspacePocAuthoringSourceTransaction = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_AUTHORING_SOURCE_TRANSACTION_VERSION;
  transactionId: string;
  kind: 'property-edit' | 'property-batch-edit' | 'near-miss-repair';
  beforeFingerprint: string;
  afterFingerprint: string;
  beforeRawText: string;
  afterRawText: string;
  beforeSelection: SourceSelection;
  afterSelection: SourceSelection;
  changes: readonly SourceChange[];
}>;

export type PersonalWorkspacePocAuthoringPropertyLocation = Readonly<{
  status: 'located';
  key: PersonalWorkspacePocAuthoringPropertyKey;
  itemSourceLine: number;
  propertySourceLine: number;
  sourceLabel: string;
  rawValue: string;
  selection: SourceSelection;
  mutationCount: 0;
}>;

export type PersonalWorkspacePocAuthoringPropertyLocationResult =
  | PersonalWorkspacePocAuthoringPropertyLocation
  | Readonly<{
      status: 'blocked';
      key: string;
      rawText: string;
      reason: 'stale-source' | 'unknown-property' | 'not-root-item' | 'property-not-found' | 'duplicate-property' | 'unsafe-source-shape';
      mutationCount: 0;
    }>;

export type PersonalWorkspacePocAuthoringPropertyEditResult =
  | Readonly<{
      status: 'applied';
      key: PersonalWorkspacePocAuthoringPropertyKey;
      nextRawText: string;
      selection: SourceSelection;
      transaction: PersonalWorkspacePocAuthoringSourceTransaction;
      mutationCount: 1;
    }>
  | Readonly<{
      status: 'no-op' | 'cancelled';
      key: string;
      rawText: string;
      mutationCount: 0;
    }>
  | Readonly<{
      status: 'blocked';
      key: string;
      rawText: string;
      reason: 'stale-source' | 'unknown-property' | 'unsupported-property' | 'not-root-item' | 'duplicate-property' | 'conflicting-schedule' | 'missing-dependency' | 'invalid-value' | 'unsafe-source-shape';
      mutationCount: 0;
    }>;

export type PersonalWorkspacePocAuthoringPropertyBatchEditResult =
  | Readonly<{
      status: 'applied';
      keys: readonly PersonalWorkspacePocAuthoringPropertyKey[];
      nextRawText: string;
      selection: SourceSelection;
      transaction: PersonalWorkspacePocAuthoringSourceTransaction;
      mutationCount: 1;
    }>
  | Readonly<{
      status: 'no-op' | 'cancelled';
      keys: readonly string[];
      rawText: string;
      mutationCount: 0;
    }>
  | Readonly<{
      status: 'blocked';
      keys: readonly string[];
      rawText: string;
      reason: 'stale-source' | 'invalid-batch' | 'invalid-value' | 'duplicate-property' | 'conflicting-schedule' | 'missing-dependency' | 'unsafe-source-shape';
      mutationCount: 0;
    }>;

export type PersonalWorkspacePocAuthoringNearMissTarget = Readonly<{
  targetId: string;
  sourceFingerprint: string;
  sourceLine: number;
  title: string;
  prefixRange: Readonly<{ from: number; to: number }>;
}>;

export type PersonalWorkspacePocAuthoringNearMissRepairResult =
  | Readonly<{
      status: 'repaired';
      targetId: string;
      nextRawText: string;
      selection: SourceSelection;
      transaction: PersonalWorkspacePocAuthoringSourceTransaction;
      mutationCount: 1;
    }>
  | Readonly<{
      status: 'cancelled';
      targetId: string;
      rawText: string;
      mutationCount: 0;
    }>
  | Readonly<{
      status: 'blocked';
      targetId: string;
      rawText: string;
      reason: 'stale-source' | 'unknown-target' | 'target-changed';
      mutationCount: 0;
    }>;

export type PersonalWorkspacePocAuthoringUndoResult =
  | Readonly<{
      status: 'undone';
      nextRawText: string;
      selection: SourceSelection;
      mutationCount: 1;
    }>
  | Readonly<{
      status: 'cancelled';
      rawText: string;
      mutationCount: 0;
    }>
  | Readonly<{
      status: 'blocked';
      rawText: string;
      reason: 'stale-source' | 'invalid-transaction';
      mutationCount: 0;
    }>;

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

function compactLabel(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s_-]+/gu, '');
}

function splitExactSourceLines(rawText: string): ExactSourceLine[] {
  const lines: ExactSourceLine[] = [];
  let startOffset = 0;
  let line = 1;
  while (startOffset < rawText.length) {
    let endOffset = startOffset;
    while (endOffset < rawText.length && rawText[endOffset] !== '\r' && rawText[endOffset] !== '\n') {
      endOffset += 1;
    }
    let terminatorEndOffset = endOffset;
    if (rawText[endOffset] === '\r' && rawText[endOffset + 1] === '\n') terminatorEndOffset += 2;
    else if (rawText[endOffset] === '\r' || rawText[endOffset] === '\n') terminatorEndOffset += 1;
    lines.push({ line, startOffset, endOffset, terminatorEndOffset, text: rawText.slice(startOffset, endOffset) });
    startOffset = terminatorEndOffset;
    line += 1;
  }
  if (rawText.length === 0 || /[\r\n]$/u.test(rawText)) {
    lines.push({ line, startOffset: rawText.length, endOffset: rawText.length, terminatorEndOffset: rawText.length, text: '' });
  }
  return lines;
}

function isRootItem(line: string): boolean {
  return /^- \[ \](?:[ \t]+\S.*)?$/u.test(line);
}

function isItemBoundary(line: string): boolean {
  return /^(?:#{1,2}(?: |$)|- \[[ xX]\](?: |$)|-[ \t]*\[[ \t]*\][ \t]+\S)/u.test(line);
}

function protectedSourceLines(lines: readonly ExactSourceLine[]): ReadonlySet<number> {
  const protectedLines = new Set<number>();
  let fence: { marker: '`' | '~'; length: number } | null = null;
  let inHtmlComment = false;
  for (const line of lines) {
    if (fence) {
      protectedLines.add(line.line);
      const trimmed = line.text.trim();
      if (
        trimmed.length >= fence.length
        && [...trimmed].every((character) => character === fence?.marker)
      ) {
        fence = null;
      }
      continue;
    }
    if (inHtmlComment) {
      protectedLines.add(line.line);
      if (line.text.includes('-->')) inHtmlComment = false;
      continue;
    }
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/u.exec(line.text);
    if (fenceMatch) {
      fence = { marker: fenceMatch[1][0] as '`' | '~', length: fenceMatch[1].length };
      protectedLines.add(line.line);
      continue;
    }
    if (line.text.includes('<!--')) {
      protectedLines.add(line.line);
      if (!line.text.slice(line.text.indexOf('<!--') + 4).includes('-->')) {
        inHtmlComment = true;
      }
    }
  }
  return protectedLines;
}

function sourceSpanForItem(
  rawText: string,
  itemSourceLine: number,
): { lines: readonly ExactSourceLine[]; insertOffset: number; lineEnding: string; trailingNewline: boolean } | null {
  const lines = splitExactSourceLines(rawText);
  const ownerIndex = lines.findIndex((line) => line.line === itemSourceLine);
  const protectedLines = protectedSourceLines(lines);
  if (
    ownerIndex < 0
    || protectedLines.has(itemSourceLine)
    || !isRootItem(lines[ownerIndex].text)
  ) return null;
  let endIndex = ownerIndex + 1;
  while (endIndex < lines.length && !isItemBoundary(lines[endIndex].text)) endIndex += 1;
  const lineEnding = rawText.includes('\r\n') ? '\r\n' : rawText.includes('\r') ? '\r' : '\n';
  return {
    lines: lines.slice(ownerIndex, endIndex),
    insertOffset: endIndex < lines.length ? lines[endIndex].startOffset : rawText.length,
    lineEnding,
    trailingNewline: /[\r\n]$/u.test(rawText),
  };
}

type PropertySourceMatch = Readonly<{
  key: PersonalWorkspacePocAuthoringPropertyKey;
  line: ExactSourceLine;
  sourceLabel: string;
  rawValue: string;
  valueStart: number;
  valueEnd: number;
}>;

function matchPropertyLine(line: ExactSourceLine): PropertySourceMatch | null {
  const match = /^(?: {2,}|\t+)- ([^:：\r\n]{1,32})[:：]([ \t]*)(.*)$/u.exec(line.text);
  if (!match) return null;
  const key = PROPERTY_KEY_BY_LABEL.get(compactLabel(match[1]));
  if (!key || key === 'subcheck') return null;
  const rawValue = match[3];
  const valueStart = line.startOffset + match[0].length - rawValue.length;
  return {
    key,
    line,
    sourceLabel: match[1],
    rawValue,
    valueStart,
    valueEnd: valueStart + rawValue.trimEnd().length,
  };
}

function propertyMatches(
  rawText: string,
  itemSourceLine: number,
  key: PersonalWorkspacePocAuthoringPropertyKey,
): { span: NonNullable<ReturnType<typeof sourceSpanForItem>>; matches: PropertySourceMatch[] } | null {
  const span = sourceSpanForItem(rawText, itemSourceLine);
  if (!span) return null;
  const protectedLines = protectedSourceLines(splitExactSourceLines(rawText));
  return {
    span,
    matches: span.lines.slice(1).filter((line) => !protectedLines.has(line.line)).map(matchPropertyLine).filter(
      (match): match is PropertySourceMatch => Boolean(match && match.key === key),
    ),
  };
}

export function locatePersonalWorkspacePocAuthoringPropertyValue(input: Readonly<{
  rawText: string;
  expectedSourceFingerprint: string;
  itemSourceLine: number;
  key: string;
  propertySourceLine?: number;
}>): PersonalWorkspacePocAuthoringPropertyLocationResult {
  if (fingerprintPersonalWorkspacePocAuthoringSource(input.rawText) !== input.expectedSourceFingerprint) {
    return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'stale-source', mutationCount: 0 };
  }
  const entry = getPersonalWorkspacePocAuthoringProperty(input.key);
  if (!entry) {
    return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'unknown-property', mutationCount: 0 };
  }
  if (entry.sourceKind === 'child-action') {
    const span = sourceSpanForItem(input.rawText, input.itemSourceLine);
    if (!span) {
      return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'not-root-item', mutationCount: 0 };
    }
    const protectedLines = protectedSourceLines(splitExactSourceLines(input.rawText));
    const matches = span.lines.slice(1).flatMap((line) => {
      if (protectedLines.has(line.line)) return [];
      const match = /^ {2}- \[[ xX]\]([ \t]*)(.*)$/u.exec(line.text);
      if (!match || !match[2].trim()) return [];
      const rawValue = match[2];
      const valueStart = line.startOffset + match[0].length - rawValue.length;
      return [{ line, rawValue, valueStart, valueEnd: valueStart + rawValue.trimEnd().length }];
    }).filter((match) => input.propertySourceLine === undefined || match.line.line === input.propertySourceLine);
    if (matches.length === 0) {
      return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'property-not-found', mutationCount: 0 };
    }
    if (matches.length > 1) {
      return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'duplicate-property', mutationCount: 0 };
    }
    const match = matches[0];
    return {
      status: 'located', key: entry.key, itemSourceLine: input.itemSourceLine,
      propertySourceLine: match.line.line, sourceLabel: entry.sourceLabel,
      rawValue: match.rawValue.trimEnd(),
      selection: { start: match.valueStart, end: match.valueEnd }, mutationCount: 0,
    };
  }
  const found = propertyMatches(input.rawText, input.itemSourceLine, entry.key);
  if (!found) {
    return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'not-root-item', mutationCount: 0 };
  }
  if (found.matches.length === 0) {
    return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'property-not-found', mutationCount: 0 };
  }
  if (found.matches.length > 1) {
    return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'duplicate-property', mutationCount: 0 };
  }
  const match = found.matches[0];
  if (match.valueStart < match.line.startOffset || match.valueEnd > match.line.endOffset) {
    return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'unsafe-source-shape', mutationCount: 0 };
  }
  return {
    status: 'located',
    key: entry.key,
    itemSourceLine: input.itemSourceLine,
    propertySourceLine: match.line.line,
    sourceLabel: match.sourceLabel,
    rawValue: match.rawValue.trimEnd(),
    selection: { start: match.valueStart, end: match.valueEnd },
    mutationCount: 0,
  };
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeEditableValue(
  entry: PersonalWorkspacePocAuthoringPropertyCatalogEntry,
  value: string,
): string | null {
  const normalized = value.trim();
  if (!normalized || /[\r\n]/u.test(normalized)) return null;
  if (entry.valueKind === 'date') return isValidDate(normalized) ? normalized : null;
  if (entry.valueKind === 'time') {
    const match = /^(\d{2}):(\d{2})$/u.exec(normalized);
    return match && Number(match[1]) <= 23 && Number(match[2]) <= 59
      ? normalized
      : null;
  }
  if (entry.valueKind === 'time-zone') {
    try {
      new Intl.DateTimeFormat('ko-KR', { timeZone: normalized }).format();
      return normalized;
    } catch {
      return null;
    }
  }
  if (entry.valueKind === 'relative-date') {
    if (/^D-Day$/iu.test(normalized) || /^D\s*[+-]?\s*0$/iu.test(normalized)) return 'D-Day';
    const match = /^D\s*([+-])\s*(\d+)$/iu.exec(normalized);
    return match ? `D${match[1]}${Number(match[2])}` : null;
  }
  if (entry.valueKind === 'duration') {
    const match = /^([1-9]\d*)\s*(분|시간)$/u.exec(normalized);
    return match && Number.isSafeInteger(Number(match[1])) ? `${Number(match[1])}${match[2]}` : null;
  }
  if (entry.valueKind === 'recurrence-end') {
    return isValidDate(normalized) || /^([1-9]\d*)\s*회$/u.test(normalized)
      ? normalized.replace(/\s+/gu, '')
      : null;
  }
  if (entry.valueKind === 'url') {
    const markdown = /^\[([^\]\r\n]+)\]\((https?:\/\/[^\s)]+)\)$/iu.exec(normalized);
    const candidate = markdown?.[2] ?? normalized;
    try {
      const url = new URL(candidate);
      return url.protocol === 'http:' || url.protocol === 'https:' ? normalized : null;
    } catch {
      return null;
    }
  }
  return normalized;
}

function createTransaction(input: Readonly<{
  kind: PersonalWorkspacePocAuthoringSourceTransaction['kind'];
  beforeRawText: string;
  afterRawText: string;
  beforeSelection: SourceSelection;
  afterSelection: SourceSelection;
  changes: readonly SourceChange[];
}>): PersonalWorkspacePocAuthoringSourceTransaction {
  const beforeFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(input.beforeRawText);
  const afterFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(input.afterRawText);
  return Object.freeze({
    version: PERSONAL_WORKSPACE_POC_AUTHORING_SOURCE_TRANSACTION_VERSION,
    transactionId: `authoring-source-tx-${stableHash([input.kind, beforeFingerprint, afterFingerprint, JSON.stringify(input.changes)].join('\u001f'))}`,
    kind: input.kind,
    beforeFingerprint,
    afterFingerprint,
    beforeRawText: input.beforeRawText,
    afterRawText: input.afterRawText,
    beforeSelection: Object.freeze({ ...input.beforeSelection }),
    afterSelection: Object.freeze({ ...input.afterSelection }),
    changes: Object.freeze(input.changes.map((change) => Object.freeze({ ...change }))),
  });
}

export function planPersonalWorkspacePocAuthoringPropertyEdit(input: Readonly<{
  intent: 'apply' | 'cancel';
  rawText: string;
  expectedSourceFingerprint: string;
  itemSourceLine: number;
  key: string;
  value: string;
  beforeSelection?: SourceSelection;
}>): PersonalWorkspacePocAuthoringPropertyEditResult {
  if (input.intent === 'cancel') {
    return { status: 'cancelled', key: input.key, rawText: input.rawText, mutationCount: 0 };
  }
  if (fingerprintPersonalWorkspacePocAuthoringSource(input.rawText) !== input.expectedSourceFingerprint) {
    return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'stale-source', mutationCount: 0 };
  }
  const entry = getPersonalWorkspacePocAuthoringProperty(input.key);
  if (!entry) {
    return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'unknown-property', mutationCount: 0 };
  }
  if (entry.writeSupport !== 'editable') {
    return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'unsupported-property', mutationCount: 0 };
  }
  const value = normalizeEditableValue(entry, input.value);
  if (value === null) {
    return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'invalid-value', mutationCount: 0 };
  }

  if (entry.sourceKind === 'child-action') {
    const span = sourceSpanForItem(input.rawText, input.itemSourceLine);
    if (!span) {
      return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'not-root-item', mutationCount: 0 };
    }
    const existing = span.lines.slice(1).filter((line) => /^ {2}- \[[ xX]\](?:[ \t]+\S.*)?$/u.test(line.text));
    if (existing.some((line) => line.text.replace(/^ {2}- \[[ xX]\][ \t]*/u, '').trim() === value)) {
      return { status: 'no-op', key: input.key, rawText: input.rawText, mutationCount: 0 };
    }
    const firstProperty = span.lines.slice(1).find((line) => matchPropertyLine(line));
    const insertAt = firstProperty?.startOffset ?? span.insertOffset;
    const precedingHasTerminator = insertAt > 0 && /[\r\n]/u.test(input.rawText[insertAt - 1]);
    const before = precedingHasTerminator ? '' : span.lineEnding;
    const after = insertAt < input.rawText.length || span.trailingNewline ? span.lineEnding : '';
    const prefix = `${before}  - [ ] `;
    const change = { from: insertAt, to: insertAt, insert: `${prefix}${value}${after}` };
    const nextRawText = `${input.rawText.slice(0, change.from)}${change.insert}${input.rawText.slice(change.to)}`;
    const selection = { start: insertAt + prefix.length, end: insertAt + prefix.length + value.length };
    const transaction = createTransaction({
      kind: 'property-edit', beforeRawText: input.rawText, afterRawText: nextRawText,
      beforeSelection: input.beforeSelection ?? { start: insertAt, end: insertAt },
      afterSelection: selection, changes: [change],
    });
    return { status: 'applied', key: entry.key, nextRawText, selection, transaction, mutationCount: 1 };
  }

  const found = propertyMatches(input.rawText, input.itemSourceLine, entry.key);
  if (!found) {
    return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'not-root-item', mutationCount: 0 };
  }
  const appendDistinct = entry.key === 'guide' || entry.key === 'caution';
  if (appendDistinct && found.matches.some((match) => match.rawValue.trimEnd() === value)) {
    return { status: 'no-op', key: input.key, rawText: input.rawText, mutationCount: 0 };
  }
  if (!appendDistinct && found.matches.length > 1) {
    return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'duplicate-property', mutationCount: 0 };
  }
  const conflictKey = entry.key === 'date' ? 'relativeDate' : entry.key === 'relativeDate' ? 'date' : null;
  if (conflictKey) {
    const conflict = propertyMatches(input.rawText, input.itemSourceLine, conflictKey);
    if (conflict?.matches.some((match) => Boolean(match.rawValue.trim()))) {
      return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'conflicting-schedule', mutationCount: 0 };
    }
  }
  const dependencyKey = entry.key === 'timezone'
    ? 'time'
    : entry.key === 'repeatEnd'
      ? 'repeat'
      : null;
  if (dependencyKey) {
    const dependency = propertyMatches(input.rawText, input.itemSourceLine, dependencyKey);
    if (!dependency || dependency.matches.length !== 1 || !dependency.matches[0].rawValue.trim()) {
      return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'missing-dependency', mutationCount: 0 };
    }
  }

  if (entry.key === 'repeat' || entry.key === 'repeatEnd') {
    const repeat = entry.key === 'repeat'
      ? value
      : propertyMatches(input.rawText, input.itemSourceLine, 'repeat')?.matches[0]?.rawValue.trim();
    const repeatEnd = entry.key === 'repeatEnd'
      ? value
      : propertyMatches(input.rawText, input.itemSourceLine, 'repeatEnd')?.matches[0]?.rawValue.trim();
    if (!repeat || !parsePersonalWorkspacePocAuthoringRecurrence({ raw: repeat, ...(repeatEnd ? { recurrenceEnd: repeatEnd } : {}) }).ok) {
      return { status: 'blocked', key: input.key, rawText: input.rawText, reason: 'invalid-value', mutationCount: 0 };
    }
  }

  let change: SourceChange;
  let beforeSelection: SourceSelection;
  if (!appendDistinct && found.matches.length === 1) {
    const match = found.matches[0];
    const currentValue = match.rawValue.trimEnd();
    if (currentValue === value) {
      return { status: 'no-op', key: input.key, rawText: input.rawText, mutationCount: 0 };
    }
    change = { from: match.valueStart, to: match.valueEnd, insert: value };
    beforeSelection = input.beforeSelection ?? { start: match.valueStart, end: match.valueEnd };
  } else {
    const insertAt = found.span.insertOffset;
    const precedingHasTerminator = insertAt > 0 && /[\r\n]/u.test(input.rawText[insertAt - 1]);
    const before = precedingHasTerminator ? '' : found.span.lineEnding;
    const after = insertAt < input.rawText.length || found.span.trailingNewline ? found.span.lineEnding : '';
    change = { from: insertAt, to: insertAt, insert: `${before}  - ${entry.sourceLabel}: ${value}${after}` };
    const valueStart = insertAt + before.length + `  - ${entry.sourceLabel}: `.length;
    beforeSelection = input.beforeSelection ?? { start: insertAt, end: insertAt };
    const nextRawText = `${input.rawText.slice(0, change.from)}${change.insert}${input.rawText.slice(change.to)}`;
    const selection = { start: valueStart, end: valueStart + value.length };
    const transaction = createTransaction({
      kind: 'property-edit', beforeRawText: input.rawText, afterRawText: nextRawText,
      beforeSelection, afterSelection: selection, changes: [change],
    });
    return { status: 'applied', key: entry.key, nextRawText, selection, transaction, mutationCount: 1 };
  }

  const nextRawText = `${input.rawText.slice(0, change.from)}${change.insert}${input.rawText.slice(change.to)}`;
  const selection = { start: change.from, end: change.from + value.length };
  const transaction = createTransaction({
    kind: 'property-edit', beforeRawText: input.rawText, afterRawText: nextRawText,
    beforeSelection, afterSelection: selection, changes: [change],
  });
  return { status: 'applied', key: entry.key, nextRawText, selection, transaction, mutationCount: 1 };
}

/**
 * Applies the two bounded dependent pairs as one replacement over the owning
 * Item span. Validation may be evaluated sequentially, but the returned native
 * edit always contains one SourceChange so browser Undo remains one step.
 */
export function planPersonalWorkspacePocAuthoringPropertyBatchEdit(input: Readonly<{
  intent: 'apply' | 'cancel';
  rawText: string;
  expectedSourceFingerprint: string;
  itemSourceLine: number;
  updates: readonly Readonly<{ key: string; value: string }>[];
  beforeSelection?: SourceSelection;
}>): PersonalWorkspacePocAuthoringPropertyBatchEditResult {
  const keys = Object.freeze(input.updates.map((update) => update.key));
  if (input.intent === 'cancel') {
    return { status: 'cancelled', keys, rawText: input.rawText, mutationCount: 0 };
  }
  if (fingerprintPersonalWorkspacePocAuthoringSource(input.rawText) !== input.expectedSourceFingerprint) {
    return { status: 'blocked', keys, rawText: input.rawText, reason: 'stale-source', mutationCount: 0 };
  }
  const unique = new Set(keys);
  const signature = [...unique].sort().join('+');
  if (
    input.updates.length !== 2
    || unique.size !== 2
    || (signature !== 'time+timezone' && signature !== 'repeat+repeatEnd')
  ) {
    return { status: 'blocked', keys, rawText: input.rawText, reason: 'invalid-batch', mutationCount: 0 };
  }
  const beforeSpan = sourceSpanForItem(input.rawText, input.itemSourceLine);
  if (!beforeSpan) {
    return { status: 'blocked', keys, rawText: input.rawText, reason: 'unsafe-source-shape', mutationCount: 0 };
  }
  const orderedUpdates = signature === 'time+timezone'
    ? ['time', 'timezone'] as const
    : ['repeat', 'repeatEnd'] as const;
  let workingRawText = input.rawText;
  let selection = input.beforeSelection ?? {
    start: beforeSpan.lines[0].startOffset,
    end: beforeSpan.lines[0].startOffset,
  };
  let appliedCount = 0;
  for (const key of orderedUpdates) {
    const update = input.updates.find((candidate) => candidate.key === key);
    if (!update) {
      return { status: 'blocked', keys, rawText: input.rawText, reason: 'invalid-batch', mutationCount: 0 };
    }
    const planned = planPersonalWorkspacePocAuthoringPropertyEdit({
      intent: 'apply',
      rawText: workingRawText,
      expectedSourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(workingRawText),
      itemSourceLine: input.itemSourceLine,
      key,
      value: update.value,
      beforeSelection: selection,
    });
    if (planned.status === 'no-op') continue;
    if (planned.status !== 'applied') {
      const reason = planned.status === 'blocked' && (
        planned.reason === 'invalid-value'
        || planned.reason === 'duplicate-property'
        || planned.reason === 'conflicting-schedule'
        || planned.reason === 'missing-dependency'
        || planned.reason === 'stale-source'
      ) ? planned.reason : 'unsafe-source-shape';
      return { status: 'blocked', keys, rawText: input.rawText, reason, mutationCount: 0 };
    }
    workingRawText = planned.nextRawText;
    selection = planned.selection;
    appliedCount += 1;
  }
  if (appliedCount === 0) {
    return { status: 'no-op', keys, rawText: input.rawText, mutationCount: 0 };
  }
  const afterSpan = sourceSpanForItem(workingRawText, input.itemSourceLine);
  if (!afterSpan) {
    return { status: 'blocked', keys, rawText: input.rawText, reason: 'unsafe-source-shape', mutationCount: 0 };
  }
  const from = beforeSpan.lines[0].startOffset;
  const change: SourceChange = {
    from,
    to: beforeSpan.insertOffset,
    insert: workingRawText.slice(from, afterSpan.insertOffset),
  };
  const nextRawText = `${input.rawText.slice(0, change.from)}${change.insert}${input.rawText.slice(change.to)}`;
  if (nextRawText !== workingRawText) {
    return { status: 'blocked', keys, rawText: input.rawText, reason: 'unsafe-source-shape', mutationCount: 0 };
  }
  const transaction = createTransaction({
    kind: 'property-batch-edit',
    beforeRawText: input.rawText,
    afterRawText: nextRawText,
    beforeSelection: input.beforeSelection ?? { start: from, end: from },
    afterSelection: selection,
    changes: [change],
  });
  return {
    status: 'applied',
    keys: orderedUpdates,
    nextRawText,
    selection,
    transaction,
    mutationCount: 1,
  };
}

function nearMissCandidate(source: string): { prefixEnd: number; titleStart: number; title: string } | null {
  const line = source.replace(/[\r\n]+$/u, '');
  const match = /^-(?<markerGap>[ \t]*)\[(?<inside>[ \t]*)\](?<titleGap>[ \t]+)(?<title>\S(?:.*?\S)?)(?<trailing>[ \t]*)$/u.exec(line);
  if (!match?.groups) return null;
  if (match.groups.markerGap.length > 0 && match.groups.inside === ' ') return null;
  const prefixEnd = 1 + match.groups.markerGap.length + 1 + match.groups.inside.length + 1;
  return {
    prefixEnd,
    titleStart: prefixEnd + match.groups.titleGap.length,
    title: match.groups.title,
  };
}

export function listPersonalWorkspacePocAuthoringNearMissTargets(
  rawText: string,
): readonly PersonalWorkspacePocAuthoringNearMissTarget[] {
  const sourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(rawText);
  const manifest = analyzePersonalWorkspacePocAuthoringFidelity({ rawText, sourceFingerprint }).manifest;
  const protectedLines = protectedSourceLines(splitExactSourceLines(rawText));
  return manifest.entries.flatMap((entry) => {
    if (
      entry.code !== 'near-miss-checkbox'
      || protectedLines.has(entry.source.startLine)
    ) return [];
    const candidate = nearMissCandidate(entry.source.rawText);
    if (!candidate) return [];
    return [{
      targetId: entry.entryId,
      sourceFingerprint,
      sourceLine: entry.source.startLine,
      title: candidate.title,
      prefixRange: {
        from: entry.source.startOffset,
        to: entry.source.startOffset + candidate.prefixEnd,
      },
    }];
  });
}

export function planPersonalWorkspacePocAuthoringNearMissRepair(input: Readonly<{
  intent: 'apply' | 'cancel';
  rawText: string;
  expectedSourceFingerprint: string;
  targetId: string;
  beforeSelection?: SourceSelection;
}>): PersonalWorkspacePocAuthoringNearMissRepairResult {
  if (input.intent === 'cancel') {
    return { status: 'cancelled', targetId: input.targetId, rawText: input.rawText, mutationCount: 0 };
  }
  if (fingerprintPersonalWorkspacePocAuthoringSource(input.rawText) !== input.expectedSourceFingerprint) {
    return { status: 'blocked', targetId: input.targetId, rawText: input.rawText, reason: 'stale-source', mutationCount: 0 };
  }
  const target = listPersonalWorkspacePocAuthoringNearMissTargets(input.rawText).find(
    (candidate) => candidate.targetId === input.targetId,
  );
  if (!target) {
    return { status: 'blocked', targetId: input.targetId, rawText: input.rawText, reason: 'unknown-target', mutationCount: 0 };
  }
  const source = input.rawText.slice(target.prefixRange.from, target.prefixRange.to);
  if (!/^-(?:[ \t]*\[[ \t]*\])$/u.test(source)) {
    return { status: 'blocked', targetId: input.targetId, rawText: input.rawText, reason: 'target-changed', mutationCount: 0 };
  }
  const insert = '- [ ]';
  const change = { from: target.prefixRange.from, to: target.prefixRange.to, insert };
  const nextRawText = `${input.rawText.slice(0, change.from)}${insert}${input.rawText.slice(change.to)}`;
  const delta = insert.length - source.length;
  const oldTitleStart = change.to + input.rawText.slice(change.to).search(/\S/u);
  const selection = { start: oldTitleStart + delta, end: oldTitleStart + delta + target.title.length };
  const transaction = createTransaction({
    kind: 'near-miss-repair', beforeRawText: input.rawText, afterRawText: nextRawText,
    beforeSelection: input.beforeSelection ?? { start: oldTitleStart, end: oldTitleStart + target.title.length },
    afterSelection: selection, changes: [change],
  });
  return { status: 'repaired', targetId: target.targetId, nextRawText, selection, transaction, mutationCount: 1 };
}

function isValidTransaction(transaction: PersonalWorkspacePocAuthoringSourceTransaction): boolean {
  if (transaction.version !== PERSONAL_WORKSPACE_POC_AUTHORING_SOURCE_TRANSACTION_VERSION) return false;
  if (
    transaction.kind !== 'property-edit'
    && transaction.kind !== 'property-batch-edit'
    && transaction.kind !== 'near-miss-repair'
  ) return false;
  if (transaction.beforeFingerprint !== fingerprintPersonalWorkspacePocAuthoringSource(transaction.beforeRawText)) return false;
  if (transaction.afterFingerprint !== fingerprintPersonalWorkspacePocAuthoringSource(transaction.afterRawText)) return false;
  if (transaction.changes.length !== 1 || transaction.beforeRawText === transaction.afterRawText) return false;
  const change = transaction.changes[0];
  if (
    !Number.isInteger(change.from)
    || !Number.isInteger(change.to)
    || change.from < 0
    || change.to < change.from
    || change.to > transaction.beforeRawText.length
  ) return false;
  const rebuilt = `${transaction.beforeRawText.slice(0, change.from)}${change.insert}${transaction.beforeRawText.slice(change.to)}`;
  if (rebuilt !== transaction.afterRawText) return false;
  for (const [selection, length] of [
    [transaction.beforeSelection, transaction.beforeRawText.length],
    [transaction.afterSelection, transaction.afterRawText.length],
  ] as const) {
    if (
      !Number.isInteger(selection.start)
      || !Number.isInteger(selection.end)
      || selection.start < 0
      || selection.end < selection.start
      || selection.end > length
    ) return false;
  }
  const expectedId = `authoring-source-tx-${stableHash([
    transaction.kind,
    transaction.beforeFingerprint,
    transaction.afterFingerprint,
    JSON.stringify(transaction.changes),
  ].join('\u001f'))}`;
  return transaction.transactionId === expectedId;
}

export function undoPersonalWorkspacePocAuthoringSourceTransaction(input: Readonly<{
  intent: 'undo' | 'cancel';
  rawText: string;
  transaction: PersonalWorkspacePocAuthoringSourceTransaction;
}>): PersonalWorkspacePocAuthoringUndoResult {
  if (input.intent === 'cancel') {
    return { status: 'cancelled', rawText: input.rawText, mutationCount: 0 };
  }
  if (!isValidTransaction(input.transaction)) {
    return { status: 'blocked', rawText: input.rawText, reason: 'invalid-transaction', mutationCount: 0 };
  }
  if (
    input.rawText !== input.transaction.afterRawText
    || fingerprintPersonalWorkspacePocAuthoringSource(input.rawText) !== input.transaction.afterFingerprint
  ) {
    return { status: 'blocked', rawText: input.rawText, reason: 'stale-source', mutationCount: 0 };
  }
  return {
    status: 'undone',
    nextRawText: input.transaction.beforeRawText,
    selection: input.transaction.beforeSelection,
    mutationCount: 1,
  };
}
