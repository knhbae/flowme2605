export type SourceSlugHit = {
  signal: string;
  line: string;
};

export type FirstTaskRepetitionHit = {
  title: string;
  count: number;
  extraLines: string[];
};

export type InternalCopyHit = {
  pattern: string;
  line: string;
};

export type UserSurfaceInputValue = {
  label?: string;
  inputType?: string;
  value?: string;
  testId?: string;
};

export type RawIsoInputValueHit = {
  label: string;
  inputType: string;
  value: string;
  testId?: string;
  reason: 'native-date-input-value' | 'user-visible-input-value';
};

export type RawIsoInputValueScanResult = {
  rawIsoInputValueHits: RawIsoInputValueHit[];
  rawIsoInputValueExemptions: RawIsoInputValueHit[];
};

export type UserSurfaceGuardrailInput = {
  primaryLines: string[];
  sourceLines?: string[];
  sourceSlugSignals?: string[];
  firstTaskTitles?: string[];
};

export type UserSurfaceGuardrailResult = {
  internalCopyHits: InternalCopyHit[];
  sourceSlugSignals: string[];
  sourceSlugHits: SourceSlugHit[];
  structuralDisplayHits: string[];
  trailingFlowSuffixHits: string[];
  rawIsoDateHits: string[];
  firstTaskRepetitionHits: FirstTaskRepetitionHit[];
};

export type UserFacingOutputGuardrailInput = {
  text: string;
  sourceSlugSignals?: string[];
};

export type DuplicatePrototypeExportEntryHit = {
  label: string;
  count: number;
};

export type PrototypeRouteGuardrailInput = {
  primaryLines: string[];
  exportEntryLabels?: string[];
};

export type PrototypeRouteGuardrailResult = {
  rawRouteSlugHits: string[];
  englishWeekdayHits: string[];
  englishUiVerbHits: string[];
  englishMonthTimeHits: string[];
  mixedExportLanguageHits: string[];
  duplicateExportEntryHits: DuplicatePrototypeExportEntryHit[];
};

export type PrototypeRouteTier = 'release-preview' | 'internal-console';

export type PrototypeRouteTierPolicy = {
  tier: PrototypeRouteTier;
  label: string;
  allowInternalDisplayGateHits: boolean;
  requiresNoindex: boolean;
  requiresNoUserNavLinks: boolean;
};

const RAW_ISO_DATE_PATTERN = /\b20\d{2}-\d{2}-\d{2}\b/u;
const RAW_PROTOTYPE_ROUTE_SLUG_PATTERN = /\b(?:restart|prototype)\s*\/\s*[a-z0-9][a-z0-9-]*\b|\/restart\/[a-z0-9][a-z0-9-]*/iu;
const ENGLISH_WEEKDAY_PATTERN = /\b(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/u;
const PROTOTYPE_ENGLISH_UI_VERB_PATTERN = /\b(?:download|copy|sync|import)\b/iu;
const PROTOTYPE_ENGLISH_MONTH_TIME_PATTERN = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b|\b(?:AM|PM)\b/u;
const MIXED_EXPORT_LANGUAGE_PATTERN = /\bexport\b|export(?=[\p{Script=Hangul}\s.,!?])/iu;
const STRUCTURAL_DISPLAY_PATTERNS = [
  /\bFlow Map\b/iu,
  /\bsource\s*trace\b/iu,
  /일정\s*지도/u,
  /저장한\s*지도/u,
  /지도\s*일정/u,
  /지도\s*루틴/u,
  /(?:Flow\s*)?상태판/u,
  /Flow\s*보드/u,
  /Flow\s*패널/u,
  /채널\s*콘텐츠/u,
  /실행\s*큐/u,
  /(?:source|소스|내부)\s*트레이스/iu,
  /(?:위|아래)\s*카드에서/u,
  /카드에서\s*(?:엽니다|봅니다|확인합니다)/u,
  /(?:전체\s*)?탭에서\s*(?:엽니다|봅니다|확인합니다)/u,
];

const URL_FIRST_LEGACY_CANDIDATE_STATE_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: '기존 콘텐츠로 닫힌 상태', pattern: /(?:후보가\s*)?기존\s*콘텐츠로\s*(?:닫힌|연결된)\s*상태/u },
  { label: '실행 가능한 후보 상태문', pattern: /(?:이제\s*)?실행\s*가능한\s+.+\s*후보/u },
  { label: '후보 닫힌 상태', pattern: /(?:후보|요청)\s*(?:닫힌|연결된)\s*상태/u },
];

const INTERNAL_COPY_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: String.raw`\bP\d+\b`, pattern: /\bP\d+\b/iu },
  { label: String.raw`\bdemo\b`, pattern: /\bdemo\b/iu },
  { label: '데모', pattern: /데모/u },
  { label: String.raw`\breview\b`, pattern: /\breview\b/iu },
  { label: String.raw`\baudit\b`, pattern: /\baudit\b/iu },
  { label: String.raw`\bhandoff\b`, pattern: /\bhandoff\b/iu },
  { label: 'Canonical URL', pattern: /\bCanonical\s+URL\b/iu },
  { label: 'Original URL', pattern: /\bOriginal\s+URL\b/iu },
  { label: '제작용 정보', pattern: /제작용\s*정보/u },
  { label: '대기열', pattern: /대기열/u },
  { label: '파이프라인', pattern: /파이프라인/u },
  { label: 'source-backed', pattern: /source-backed/iu },
  { label: 'sourceTrace', pattern: /sourceTrace/u },
  { label: 'partial_draft', pattern: /partial_draft/u },
  { label: 'source_import_required', pattern: /source_import_required/u },
  { label: '검토 필요', pattern: /검토\s*필요/u },
  { label: '정리 필요', pattern: /정리\s*필요/u },
  { label: '후보 콘텐츠', pattern: /후보\s*콘텐츠/u },
  ...URL_FIRST_LEGACY_CANDIDATE_STATE_PATTERNS,
  { label: String.raw`\bFlow Map\b`, pattern: /\bFlow Map\b/iu },
  { label: String.raw`\bStep\b`, pattern: /\bStep\b/iu },
  { label: String.raw`\bItem\b`, pattern: /\bItem\b/iu },
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

const SOURCE_SLUG_PREFIX_SOURCE = String.raw`(^|[^\p{L}\p{N}_])`;
const SOURCE_SLUG_BOUNDARY_SOURCE = String.raw`(?=$|\s|\p{Script=Hangul}|D-|\.(?![\p{L}\p{N}_])|[^\p{L}\p{N}_\s.])`;

export const USER_SURFACE_GUARDRAIL_RUNTIME = {
  sourceSlugPrefixSource: SOURCE_SLUG_PREFIX_SOURCE,
  sourceSlugBoundarySource: SOURCE_SLUG_BOUNDARY_SOURCE,
} as const;

export function getPrototypeRouteTier(route: string): PrototypeRouteTier | null {
  const pathname = normalizeRoutePathname(route);
  if (pathname.startsWith('/restart/')) return 'release-preview';
  if (pathname.startsWith('/flow-lab/')) return 'internal-console';
  return null;
}

export function getPrototypeRouteTierPolicy(tier: PrototypeRouteTier): PrototypeRouteTierPolicy {
  if (tier === 'release-preview') {
    return {
      tier,
      label: '출시 전 미리보기',
      allowInternalDisplayGateHits: false,
      requiresNoindex: true,
      requiresNoUserNavLinks: true,
    };
  }

  return {
    tier,
    label: '내부 실험 콘솔',
    allowInternalDisplayGateHits: true,
    requiresNoindex: true,
    requiresNoUserNavLinks: true,
  };
}

export function normalizeGuardrailLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

export function isLegacyUrlFirstCandidateStateCopy(value: string): boolean {
  const normalized = normalizeGuardrailLine(value);
  if (!normalized) return false;
  return URL_FIRST_LEGACY_CANDIDATE_STATE_PATTERNS.some(({ pattern }) => pattern.test(normalized));
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
      const regex = createSourceSlugHitRegex(signal);
      if (regex.test(line)) {
        hits.push({ signal, line });
      }
    }
  }

  return hits;
}

export function createSourceSlugHitRegex(signal: string): RegExp {
  return new RegExp(`${SOURCE_SLUG_PREFIX_SOURCE}${escapeRegExp(signal)}${SOURCE_SLUG_BOUNDARY_SOURCE}`, 'iu');
}

export function findStructuralDisplayHits(primaryLines: string[]): string[] {
  return normalizeGuardrailLines(primaryLines).filter((line) =>
    STRUCTURAL_DISPLAY_PATTERNS.some((pattern) => pattern.test(line)),
  );
}

export function findInternalCopyHits(primaryLines: string[]): InternalCopyHit[] {
  return normalizeGuardrailLines(primaryLines).flatMap((line) =>
    INTERNAL_COPY_PATTERNS
      .filter(({ pattern }) => pattern.test(line))
      .map(({ label }) => ({ pattern: label, line })),
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

export function scanRawIsoInputValues(inputValues: UserSurfaceInputValue[]): RawIsoInputValueScanResult {
  const rawIsoInputValueHits: RawIsoInputValueHit[] = [];
  const rawIsoInputValueExemptions: RawIsoInputValueHit[] = [];

  for (const input of inputValues) {
    const value = normalizeGuardrailLine(input.value ?? '');
    if (!RAW_ISO_DATE_PATTERN.test(value)) continue;

    const inputType = normalizeGuardrailLine(input.inputType ?? '').toLowerCase();
    const hit: RawIsoInputValueHit = {
      label: normalizeGuardrailLine(input.label ?? ''),
      inputType,
      value,
      testId: input.testId,
      reason: inputType === 'date' && /^20\d{2}-\d{2}-\d{2}$/u.test(value)
        ? 'native-date-input-value'
        : 'user-visible-input-value',
    };

    if (hit.reason === 'native-date-input-value') {
      rawIsoInputValueExemptions.push(hit);
    } else {
      rawIsoInputValueHits.push(hit);
    }
  }

  return { rawIsoInputValueHits, rawIsoInputValueExemptions };
}

export function findPrototypeRawRouteSlugHits(primaryLines: string[]): string[] {
  return normalizeGuardrailLines(primaryLines).filter((line) => RAW_PROTOTYPE_ROUTE_SLUG_PATTERN.test(line));
}

export function findPrototypeEnglishWeekdayHits(primaryLines: string[]): string[] {
  return normalizeGuardrailLines(primaryLines).filter((line) => ENGLISH_WEEKDAY_PATTERN.test(line));
}

export function findPrototypeEnglishUiVerbHits(primaryLines: string[]): string[] {
  return normalizeGuardrailLines(primaryLines).filter((line) => PROTOTYPE_ENGLISH_UI_VERB_PATTERN.test(line));
}

export function findPrototypeEnglishMonthTimeHits(primaryLines: string[]): string[] {
  return normalizeGuardrailLines(primaryLines).filter((line) => PROTOTYPE_ENGLISH_MONTH_TIME_PATTERN.test(line));
}

export function findPrototypeMixedExportLanguageHits(primaryLines: string[]): string[] {
  return normalizeGuardrailLines(primaryLines).filter((line) => MIXED_EXPORT_LANGUAGE_PATTERN.test(line));
}

export function findDuplicatePrototypeExportEntryHits(
  primaryLines: string[],
  exportEntryLabels: string[] = [],
): DuplicatePrototypeExportEntryHit[] {
  const normalizedLines = normalizeGuardrailLines(primaryLines);
  const labels = Array.from(new Set(exportEntryLabels.map(normalizeGuardrailLine).filter(Boolean)));

  return labels.flatMap((label) => {
    const count = normalizedLines.filter((line) => line.includes(label)).length;
    return count > 1 ? [{ label, count }] : [];
  });
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
    internalCopyHits: findInternalCopyHits(primaryLines),
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

export function scanUserFacingOutputGuardrails(input: UserFacingOutputGuardrailInput): UserSurfaceGuardrailResult {
  return scanUserSurfaceGuardrails({
    primaryLines: input.text.split(/\r?\n/u).map(stripUrlValuesForOutputGuardrail),
    sourceSlugSignals: input.sourceSlugSignals,
  });
}

function stripUrlValuesForOutputGuardrail(line: string): string {
  return line.replace(/https?:\/\/\S+/giu, '<url>');
}

export function scanPrototypeRouteGuardrails(input: PrototypeRouteGuardrailInput): PrototypeRouteGuardrailResult {
  const primaryLines = normalizeGuardrailLines(input.primaryLines);

  return {
    rawRouteSlugHits: findPrototypeRawRouteSlugHits(primaryLines),
    englishWeekdayHits: findPrototypeEnglishWeekdayHits(primaryLines),
    englishUiVerbHits: findPrototypeEnglishUiVerbHits(primaryLines),
    englishMonthTimeHits: findPrototypeEnglishMonthTimeHits(primaryLines),
    mixedExportLanguageHits: findPrototypeMixedExportLanguageHits(primaryLines),
    duplicateExportEntryHits: findDuplicatePrototypeExportEntryHits(primaryLines, input.exportEntryLabels),
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

function normalizeRoutePathname(route: string): string {
  try {
    return new URL(route, 'https://flowme.local').pathname;
  } catch {
    return route.split(/[?#]/u)[0] ?? route;
  }
}
