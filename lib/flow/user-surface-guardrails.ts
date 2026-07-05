export type SourceSlugHit = {
  signal: string;
  line: string;
};

export type FirstTaskRepetitionHit = {
  title: string;
  count: number;
  extraLines: string[];
};

export type UserSurfaceGuardrailInput = {
  primaryLines: string[];
  sourceLines?: string[];
  sourceSlugSignals?: string[];
  firstTaskTitles?: string[];
};

export type UserSurfaceGuardrailResult = {
  sourceSlugSignals: string[];
  sourceSlugHits: SourceSlugHit[];
  structuralDisplayHits: string[];
  trailingFlowSuffixHits: string[];
  rawIsoDateHits: string[];
  firstTaskRepetitionHits: FirstTaskRepetitionHit[];
};

const RAW_ISO_DATE_PATTERN = /\b20\d{2}-\d{2}-\d{2}\b/u;
const STRUCTURAL_DISPLAY_PATTERNS = [
  /\bFlow Map\b/iu,
  /일정\s*지도/u,
  /저장한\s*지도/u,
  /지도\s*일정/u,
  /지도\s*루틴/u,
];

const ALLOWED_TRAILING_FLOW_LINES = new Set([
  'Flow',
  '내 Flow',
  'Flow 찾기',
  'FlowMe',
  '내 Flow에 저장',
  '내 Flow에서 보기',
]);

const SOURCE_SIGNAL_KEYS = new Set([
  'label',
  'sourceTitle',
  'source_title',
  'sourceName',
  'source_name',
  'creatorName',
  'creator_name',
]);

const SOURCE_SIGNAL_STOP_WORDS = new Set([
  'AI',
  'CSV',
  'D',
  'Flow',
  'FLOW',
  'HTTP',
  'HTTPS',
  'ICS',
  'JSON',
  'NO',
  'OK',
  'PDF',
  'URL',
  'WWW',
]);

export function normalizeGuardrailLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

export function normalizeGuardrailLines(lines: string[]): string[] {
  return lines.map(normalizeGuardrailLine).filter(Boolean);
}

export function collectSourceSlugSignals(input: unknown): string[] {
  const signals = new Set<string>();
  const contentTitleSignals = new Set<string>();

  const addSignalFromText = (text: string) => {
    const signal = extractLeadingAsciiSignal(text);
    if (signal) signals.add(signal);
  };
  const addContentTitleSignal = (text: string) => {
    for (const signal of extractAsciiSignals(text)) {
      contentTitleSignals.add(signal);
    }
  };

  visitSourceSignalText(input, addSignalFromText);
  visitContentTitleText(input, addContentTitleSignal);
  for (const signal of contentTitleSignals) {
    signals.delete(signal);
  }
  return Array.from(signals).sort((a, b) => a.localeCompare(b));
}

export function collectSourceSlugSignalsFromLines(lines: string[]): string[] {
  const signals = new Set<string>();
  for (const line of normalizeGuardrailLines(lines)) {
    const signal = extractLeadingAsciiSignal(line);
    if (signal) signals.add(signal);
  }
  return Array.from(signals).sort((a, b) => a.localeCompare(b));
}

export function findSourceSlugHits(primaryLines: string[], sourceSlugSignals: string[]): SourceSlugHit[] {
  const normalizedLines = normalizeGuardrailLines(primaryLines);
  const normalizedSignals = Array.from(new Set(sourceSlugSignals.map((signal) => signal.trim()).filter(Boolean)));
  const hits: SourceSlugHit[] = [];

  for (const line of normalizedLines) {
    for (const signal of normalizedSignals) {
      const regex = new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegExp(signal)}(?=$|\\s|[가-힣]|D-)`, 'iu');
      if (regex.test(line)) {
        hits.push({ signal, line });
      }
    }
  }

  return hits;
}

export function findStructuralDisplayHits(primaryLines: string[]): string[] {
  return normalizeGuardrailLines(primaryLines).filter((line) =>
    STRUCTURAL_DISPLAY_PATTERNS.some((pattern) => pattern.test(line)),
  );
}

export function findTrailingFlowSuffixHits(primaryLines: string[]): string[] {
  return normalizeGuardrailLines(primaryLines).filter((line) =>
    /[\p{L}\p{N})\]]\s*Flow$/u.test(line) && !ALLOWED_TRAILING_FLOW_LINES.has(line),
  );
}

export function findRawIsoDateHits(primaryLines: string[]): string[] {
  return normalizeGuardrailLines(primaryLines).filter((line) => RAW_ISO_DATE_PATTERN.test(line));
}

export function countLineOccurrences(lines: string[], needle: string): number {
  const normalizedNeedle = normalizeGuardrailLine(needle);
  if (!normalizedNeedle) return 0;

  return normalizeGuardrailLines(lines).reduce((count, line) => {
    let cursor = 0;
    let nextIndex = line.indexOf(normalizedNeedle, cursor);
    let lineCount = 0;
    while (nextIndex !== -1) {
      lineCount += 1;
      cursor = nextIndex + normalizedNeedle.length;
      nextIndex = line.indexOf(normalizedNeedle, cursor);
    }
    return count + lineCount;
  }, 0);
}

export function findFirstTaskRepetitionHits(
  lines: string[],
  firstTaskTitle: string,
  options: { maxCount?: number } = {},
): FirstTaskRepetitionHit[] {
  const normalizedTitle = normalizeGuardrailLine(firstTaskTitle);
  const maxCount = options.maxCount ?? 1;
  if (!normalizedTitle) return [];

  const matchingLines = normalizeGuardrailLines(lines).filter((line) => line.includes(normalizedTitle));
  if (matchingLines.length <= maxCount) return [];

  return [{
    title: normalizedTitle,
    count: matchingLines.length,
    extraLines: matchingLines.slice(maxCount),
  }];
}

export function scanUserSurfaceGuardrails(input: UserSurfaceGuardrailInput): UserSurfaceGuardrailResult {
  const primaryLines = normalizeGuardrailLines(input.primaryLines);
  const sourceLines = normalizeGuardrailLines(input.sourceLines ?? []);
  const sourceSlugSignals = input.sourceSlugSignals?.length
    ? input.sourceSlugSignals
    : collectSourceSlugSignalsFromLines(sourceLines);

  return {
    sourceSlugSignals,
    sourceSlugHits: findSourceSlugHits(primaryLines, sourceSlugSignals),
    structuralDisplayHits: findStructuralDisplayHits(primaryLines),
    trailingFlowSuffixHits: findTrailingFlowSuffixHits(primaryLines),
    rawIsoDateHits: findRawIsoDateHits(primaryLines),
    firstTaskRepetitionHits: (input.firstTaskTitles ?? []).flatMap((title) =>
      findFirstTaskRepetitionHits(primaryLines, title, { maxCount: 1 }),
    ),
  };
}

function visitSourceSignalText(value: unknown, visitor: (text: string) => void, keyHint = '') {
  if (typeof value === 'string') {
    if (SOURCE_SIGNAL_KEYS.has(keyHint)) visitor(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) visitSourceSignalText(item, visitor, keyHint);
    return;
  }

  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    visitSourceSignalText(child, visitor, key);
  }
}

function visitContentTitleText(value: unknown, visitor: (text: string) => void, keyHint = '') {
  if (typeof value === 'string') {
    if (keyHint === 'title') visitor(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) visitContentTitleText(item, visitor, keyHint);
    return;
  }

  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    visitContentTitleText(child, visitor, key);
  }
}

function extractLeadingAsciiSignal(text: string): string {
  const normalized = normalizeGuardrailLine(text).replace(/^[([{'"`]+/, '');
  const match = normalized.match(/^([A-Za-z][A-Za-z0-9._&+-]{1,})(?=$|\s+(?:[가-힣]|D[+-]\d+)|[가-힣])/u);
  if (!match) return '';

  const signal = match[1].replace(/[.,:;]+$/u, '');
  return isAllowedAsciiSignal(signal) ? signal : '';
}

function extractAsciiSignals(text: string): string[] {
  const normalized = normalizeGuardrailLine(text);
  return Array.from(normalized.matchAll(/[A-Za-z][A-Za-z0-9._&+-]{1,}/gu))
    .map((match) => match[0].replace(/[.,:;]+$/u, ''))
    .filter(isAllowedAsciiSignal);
}

function isAllowedAsciiSignal(signal: string): boolean {
  if (signal.length < 2) return false;
  if (/^D[+-]\d+$/iu.test(signal)) return false;
  if (SOURCE_SIGNAL_STOP_WORDS.has(signal)) return false;
  if (/^https?$/iu.test(signal)) return false;
  if (/^www$/iu.test(signal)) return false;
  return true;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
