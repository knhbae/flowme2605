import {
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocAuthoredFlow,
  type PersonalWorkspacePocAuthoringRecurrenceRuleV1,
  type PersonalWorkspacePocAuthoringSourceLineItemIdentityMap,
  type PersonalWorkspacePocAuthoringSubcheckSnapshot,
  type PersonalWorkspacePocAuthoringWeekday,
  type PersonalWorkspacePocFlowItem,
} from './personal-workspace-poc-contract';
import {
  analyzePersonalWorkspacePocAuthoringFidelity,
  type PersonalWorkspacePocAuthoringFidelityCode,
  type PersonalWorkspacePocAuthoringFidelityManifest,
} from './personal-workspace-poc-authoring-fidelity';

export type {
  PersonalWorkspacePocAuthoringFidelityAnalysis,
  PersonalWorkspacePocAuthoringFidelityCode,
  PersonalWorkspacePocAuthoringFidelityEntry,
  PersonalWorkspacePocAuthoringFidelityManifest,
  PersonalWorkspacePocAuthoringFidelityNextStep,
  PersonalWorkspacePocAuthoringSourceLine,
  PersonalWorkspacePocAuthoringSourceLineKind,
  PersonalWorkspacePocAuthoringSourceLineOwner,
  PersonalWorkspacePocAuthoringSourceLineSupport,
  PersonalWorkspacePocAuthoringSourceLocator,
} from './personal-workspace-poc-authoring-fidelity';

export const PERSONAL_WORKSPACE_POC_AUTHORING_VERSION = 1 as const;
export const PERSONAL_WORKSPACE_POC_EMPTY_SOURCE_FINGERPRINT =
  'raw-v1:0:0ztntfp';

const RECURRING_SCAFFOLD =
  '# \n- 기준일: \n\n## \n- [ ] \n  - 날짜: \n  - 반복: \n  - 반복 종료: ';
const MOVING_SCAFFOLD = '# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: ';
const WEDDING_SCAFFOLD = `${MOVING_SCAFFOLD}\n  - 자료: `;
const TRAVEL_SCAFFOLD =
  '# \n- 기준일: \n\n## \n- [ ] \n  - 상대 날짜: \n\n## \n- [ ] \n  - 날짜: \n  - 시간: \n  - 시간대: \n  - 장소: ';
const EXAM_SCAFFOLD =
  '# \n- 기준일: \n\n- [ ] \n  - 날짜: \n  - 반복: \n  - 반복 종료: \n  - 완료 기준: \n\n- [ ] \n  - 날짜: ';

export type PersonalWorkspacePocAuthoringTemplateId =
  | 'exercise-phased-4w-v1'
  | 'exercise-weekly-repeat-v1'
  | 'moving-dday-v1'
  | 'wedding-dday-v1'
  | 'travel-itinerary-prep-v1'
  | 'exam-dday-study-v1';

export type PersonalWorkspacePocAuthoringTemplate = Readonly<{
  templateId: PersonalWorkspacePocAuthoringTemplateId;
  label: string;
  description: string;
  exampleLabel: string;
  exampleSource: string;
  scaffold: string;
}>;

function freezeTemplate(
  template: PersonalWorkspacePocAuthoringTemplate,
): PersonalWorkspacePocAuthoringTemplate {
  return Object.freeze({ ...template });
}

/**
 * Versioned, PoC-local copy of the six approved unified-editor scaffolds.
 * Labels and source strings deliberately match the approved successor bytes.
 */
export const PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES = Object.freeze([
  freezeTemplate({
    templateId: 'exercise-phased-4w-v1',
    label: '단계별 반복',
    description: '단계마다 기간과 반복할 일이 달라요.',
    exampleLabel: '4주 운동 적응',
    exampleSource: '# 4주 운동 적응\n- 기준일: 2026-09-07\n\n## 1단계\n- [ ] 걷기 20분\n  - 날짜: 2026-09-07\n  - 반복: 매주 월, 수, 금\n  - 반복 종료: 2026-09-20',
    scaffold: RECURRING_SCAFFOLD,
  }),
  freezeTemplate({
    templateId: 'exercise-weekly-repeat-v1',
    label: '같은 일정 반복',
    description: '정한 기간 동안 같은 일정으로 반복해요.',
    exampleLabel: '주간 운동 루틴',
    exampleSource: '# 주간 운동 루틴\n- 기준일: 2026-09-07\n\n## 이번 주\n- [ ] 아침 스트레칭\n  - 날짜: 2026-09-07\n  - 반복: 매주 월, 수, 금\n  - 반복 종료: 2026-10-02',
    scaffold: RECURRING_SCAFFOLD,
  }),
  freezeTemplate({
    templateId: 'moving-dday-v1',
    label: '기준일 전후 준비',
    description: '한 날짜를 기준으로 앞뒤 할 일을 적어요.',
    exampleLabel: '이사 준비',
    exampleSource: '# 이사 준비\n- 기준일: 2026-10-10\n\n## 계약\n- [ ] 주소 변경 신청\n  - 상대 날짜: D-7',
    scaffold: MOVING_SCAFFOLD,
  }),
  freezeTemplate({
    templateId: 'wedding-dday-v1',
    label: '기준일 전후 준비 + 자료',
    description: '앞뒤 할 일과 참고 링크를 함께 적어요.',
    exampleLabel: '결혼 준비',
    exampleSource: '# 결혼 준비\n- 기준일: 2027-04-17\n\n## 예약\n- [ ] 식장 계약 확인\n  - 상대 날짜: D-180\n  - 자료: https://example.com/venue',
    scaffold: WEDDING_SCAFFOLD,
  }),
  freezeTemplate({
    templateId: 'travel-itinerary-prep-v1',
    label: '준비 + 날짜별 일정',
    description: '사전 준비와 날짜별 시간·장소를 함께 적어요.',
    exampleLabel: '여행 준비와 날짜별 일정',
    exampleSource: '# 제주 여행\n- 기준일: 2026-10-03\n\n## 출발 전\n- [ ] 온라인 체크인\n  - 상대 날짜: D-1\n\n## 첫째 날\n- [ ] 렌터카 받기\n  - 날짜: 2026-10-03\n  - 시간: 11:00\n  - 시간대: Asia/Seoul\n  - 장소: 제주공항',
    scaffold: TRAVEL_SCAFFOLD,
  }),
  freezeTemplate({
    templateId: 'exam-dday-study-v1',
    label: '반복 준비 + 목표일',
    description: '반복할 일과 마지막 일정을 함께 적어요.',
    exampleLabel: '시험 준비',
    exampleSource: '# 자격시험 준비\n- 기준일: 2026-11-14\n\n- [ ] 기출문제 풀기\n  - 날짜: 2026-10-13\n  - 반복: 매주 화, 목\n  - 반복 종료: 2026-11-12\n  - 완료 기준: 오답을 다시 설명할 수 있다\n\n- [ ] 시험 응시\n  - 날짜: 2026-11-14',
    scaffold: EXAM_SCAFFOLD,
  }),
] satisfies readonly PersonalWorkspacePocAuthoringTemplate[]);

const TEMPLATE_BY_ID = new Map(
  PERSONAL_WORKSPACE_POC_AUTHORING_TEMPLATES.map((template) => [
    template.templateId,
    template,
  ]),
);

export function getPersonalWorkspacePocAuthoringTemplate(
  templateId: string,
): PersonalWorkspacePocAuthoringTemplate | null {
  return TEMPLATE_BY_ID.get(
    templateId as PersonalWorkspacePocAuthoringTemplateId,
  ) ?? null;
}

type AuthoringProperty =
  | '기준일'
  | '설명'
  | '상대 날짜'
  | '날짜'
  | '시간'
  | '시간대'
  | '장소'
  | '소요 시간'
  | '자료'
  | '출처'
  | '반복'
  | '반복 종료'
  | '실행 조건'
  | '완료 기준'
  | '안내'
  | '주의';

export type PersonalWorkspacePocAuthoringIssueCode =
  | 'invalid-anchor-date'
  | 'invalid-relative-date'
  | 'relative-date-requires-anchor'
  | 'invalid-date'
  | 'invalid-time'
  | 'invalid-time-zone'
  | 'invalid-duration'
  | 'invalid-url'
  | 'invalid-recurrence'
  | 'invalid-recurrence-end'
  | 'missing-handoff-id'
  | 'missing-document-id'
  | 'missing-revision-id'
  | 'missing-flow-title'
  | 'missing-flow-items'
  | PersonalWorkspacePocAuthoringFidelityCode;

export type PersonalWorkspacePocAuthoringIssue = Readonly<{
  code: PersonalWorkspacePocAuthoringIssueCode;
  field: AuthoringProperty | 'handoffId' | 'documentId' | 'revisionId' | 'flow' | 'source';
  line: number;
  value: string;
  message: string;
  blocking: true;
}>;

export type PersonalWorkspacePocParsedAuthoringItem = Readonly<{
  sourceLine: number;
  sourceOrder: number;
  title: string;
  sectionTitle?: string;
  sourceChecked: boolean;
  description?: string;
  additionalDescriptions?: readonly string[];
  relativeDate?: string;
  date?: string;
  resolvedDate?: string;
  time?: string;
  timeZone?: string;
  place?: string;
  durationMinutes?: number;
  resourceUrl?: string;
  resourceLabel?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  recurrence?: string;
  recurrenceEnd?: string;
  recurrenceRule?: PersonalWorkspacePocAuthoringRecurrenceRuleV1;
  executionCondition?: string;
  completionCriteria?: string;
  guide?: string;
  caution?: string;
  subchecks?: readonly PersonalWorkspacePocAuthoringSubcheckSnapshot[];
}>;

export type PersonalWorkspacePocAuthoringParseResult = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_AUTHORING_VERSION;
  rawText: string;
  sourceFingerprint: string;
  parseResultId: string;
  title?: string;
  anchorDate?: string;
  items: readonly PersonalWorkspacePocParsedAuthoringItem[];
  blockingIssues: readonly PersonalWorkspacePocAuthoringIssue[];
  fidelityManifest: PersonalWorkspacePocAuthoringFidelityManifest;
}>;

type MutableParsedItem = {
  sourceLine: number;
  sourceOrder: number;
  title: string;
  sectionTitle?: string;
  sourceChecked: boolean;
  description?: string;
  additionalDescriptions: string[];
  relativeDate?: string;
  date?: string;
  resolvedDate?: string;
  time?: string;
  timeZone?: string;
  place?: string;
  durationMinutes?: number;
  resourceUrl?: string;
  resourceLabel?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  recurrence?: string;
  recurrenceEnd?: string;
  recurrenceRule?: PersonalWorkspacePocAuthoringRecurrenceRuleV1;
  executionCondition?: string;
  completionCriteria?: string;
  guide?: string;
  caution?: string;
  subchecks: PersonalWorkspacePocAuthoringSubcheckSnapshot[];
  recurrenceSourceLine?: number;
  recurrenceEndSourceLine?: number;
};

function stableAuthoringHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

function stableAuthoringId(
  prefix: string,
  ...identityParts: Array<string | number>
): string {
  return `${prefix}-${stableAuthoringHash(identityParts.join('\u001f'))}`;
}

/** Fingerprints the exact source string, including its line-ending shape. */
export function fingerprintPersonalWorkspacePocAuthoringSource(
  rawText: string,
): string {
  return `raw-v1:${rawText.length}:${stableAuthoringHash(rawText)}`;
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isValidTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(value);
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function isValidResourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:')
      && Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

function parseAuthoringLink(
  value: string,
): Readonly<{ url: string; label?: string }> | null {
  const markdown = /^\s*\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s*$/iu.exec(value);
  if (markdown) {
    const label = markdown[1].trim();
    const url = markdown[2].trim();
    if (!label || !isValidResourceUrl(url)) return null;
    return { url, label };
  }
  const url = value.trim();
  return isValidResourceUrl(url) ? { url } : null;
}

function parseDurationMinutes(value: string): number | null {
  const match = /^([1-9]\d*)\s*(분|시간)$/u.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isSafeInteger(amount)) return null;
  const minutes = match[2] === '시간' ? amount * 60 : amount;
  return Number.isSafeInteger(minutes) ? minutes : null;
}

const AUTHORING_WEEKDAY_CODES: Readonly<Record<string, PersonalWorkspacePocAuthoringWeekday>> = {
  월: 'MO',
  화: 'TU',
  수: 'WE',
  목: 'TH',
  금: 'FR',
  토: 'SA',
  일: 'SU',
};

const AUTHORING_WEEKDAY_ORDER: readonly PersonalWorkspacePocAuthoringWeekday[] = [
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
];

function parsePositiveInteger(value: string): number | null {
  if (!/^[1-9]\d*$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isValidRecurrenceEnd(value: string): boolean {
  const trimmed = value.trim();
  const count = /^([1-9]\d*)\s*회$/u.exec(trimmed);
  return Boolean(count && parsePositiveInteger(count[1])) || isValidIsoDate(trimmed);
}

function parseAuthoringWeekdays(
  value: string,
): PersonalWorkspacePocAuthoringWeekday[] | null {
  const tokens = value
    .replace(/요일/gu, '')
    .split(/[\s,/·]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return null;
  const weekdays = tokens.map((token) => AUTHORING_WEEKDAY_CODES[token]);
  if (weekdays.some((weekday) => !weekday)) return null;
  const unique = new Set(weekdays);
  return AUTHORING_WEEKDAY_ORDER.filter((weekday) => unique.has(weekday));
}

export type PersonalWorkspacePocAuthoringRecurrenceParseResult =
  | Readonly<{
      ok: true;
      rule: PersonalWorkspacePocAuthoringRecurrenceRuleV1;
    }>
  | Readonly<{
      ok: false;
      reason: 'unsupported-rule' | 'invalid-end';
    }>;

/** Parses only the bounded, source-backed D2-020 recurrence grammar. */
export function parsePersonalWorkspacePocAuthoringRecurrence(input: Readonly<{
  raw: string;
  recurrenceEnd?: string;
  executionCondition?: string;
}>): PersonalWorkspacePocAuthoringRecurrenceParseResult {
  const raw = input.raw.trim();
  const compact = raw.replace(/\s+/gu, '');
  let base:
    | Pick<
        PersonalWorkspacePocAuthoringRecurrenceRuleV1,
        'frequency' | 'interval' | 'weekdays' | 'dayOfMonth'
      >
    | undefined;

  if (compact === '매일') {
    base = { frequency: 'daily', interval: 1 };
  } else {
    const daily = /^(\d+)일마다$/u.exec(compact);
    const interval = daily ? parsePositiveInteger(daily[1]) : null;
    if (interval) base = { frequency: 'daily', interval };
  }

  if (!base) {
    const weekly = /^매주\s+(.+)$/u.exec(raw) ?? /^(\d+)\s*주마다\s+(.+)$/u.exec(raw);
    if (weekly) {
      const customInterval = weekly.length === 3;
      const interval = customInterval ? parsePositiveInteger(weekly[1]) : 1;
      const weekdays = parseAuthoringWeekdays(
        customInterval ? weekly[2] : weekly[1],
      );
      if (interval && weekdays) {
        base = { frequency: 'weekly', interval, weekdays };
      }
    }
  }

  if (!base) {
    const monthly =
      /^매월\s*(\d{1,2})일$/u.exec(raw)
      ?? /^(\d+)\s*개월마다\s*(\d{1,2})일$/u.exec(raw);
    if (monthly) {
      const customInterval = monthly.length === 3;
      const interval = customInterval ? parsePositiveInteger(monthly[1]) : 1;
      const dayOfMonth = Number(customInterval ? monthly[2] : monthly[1]);
      if (interval && dayOfMonth >= 1 && dayOfMonth <= 31) {
        base = { frequency: 'monthly', interval, dayOfMonth };
      }
    }
  }

  if (!base) return { ok: false, reason: 'unsupported-rule' };

  const rawEnd = input.recurrenceEnd?.trim();
  let end: PersonalWorkspacePocAuthoringRecurrenceRuleV1['end'];
  if (rawEnd) {
    const countMatch = /^([1-9]\d*)\s*회$/u.exec(rawEnd);
    const count = countMatch ? parsePositiveInteger(countMatch[1]) : null;
    if (count) {
      end = { mode: 'count', count, raw: rawEnd };
    } else if (isValidIsoDate(rawEnd)) {
      end = { mode: 'until', date: rawEnd, raw: rawEnd };
    } else {
      return { ok: false, reason: 'invalid-end' };
    }
  }

  const executionCondition = input.executionCondition?.trim();
  return {
    ok: true,
    rule: {
      version: 1,
      raw,
      ...base,
      ...(end ? { end } : {}),
      ...(executionCondition ? { executionCondition } : {}),
    },
  };
}

function mergeAuthoringText(existing: string | undefined, value: string): string {
  return existing ? `${existing}\n${value}` : value;
}

function parseRelativeDateOffset(value: string): number | null {
  if (/^D-Day$/iu.test(value) || /^D[+-]?0$/iu.test(value)) return 0;
  const match = /^D([+-]\d+)$/iu.exec(value);
  if (!match) return null;
  const offset = Number(match[1]);
  return Number.isSafeInteger(offset) ? offset : null;
}

function addUtcDays(isoDate: string, offset: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function issue(
  code: PersonalWorkspacePocAuthoringIssueCode,
  field: PersonalWorkspacePocAuthoringIssue['field'],
  line: number,
  value: string,
  message: string,
): PersonalWorkspacePocAuthoringIssue {
  return { code, field, line, value, message, blocking: true };
}

function setItemProperty(
  item: MutableParsedItem,
  property: Exclude<AuthoringProperty, '기준일'>,
  value: string,
  line: number,
  issues: PersonalWorkspacePocAuthoringIssue[],
): void {
  if (!value) return;
  switch (property) {
    case '설명':
      item.description = mergeAuthoringText(item.description, value);
      break;
    case '상대 날짜':
      item.relativeDate = value;
      if (parseRelativeDateOffset(value) === null) {
        issues.push(
          issue(
            'invalid-relative-date',
            property,
            line,
            value,
            '상대 날짜는 D-30, D-Day, D+1 형식으로 입력해야 합니다.',
          ),
        );
      }
      break;
    case '날짜':
      item.date = value;
      if (!isValidIsoDate(value)) {
        issues.push(
          issue(
            'invalid-date',
            property,
            line,
            value,
            '날짜는 실제 존재하는 YYYY-MM-DD 형식이어야 합니다.',
          ),
        );
      }
      break;
    case '시간':
      item.time = value;
      if (!isValidTime(value)) {
        issues.push(
          issue(
            'invalid-time',
            property,
            line,
            value,
            '시간은 24시간제 HH:mm 형식이어야 합니다.',
          ),
        );
      }
      break;
    case '시간대':
      item.timeZone = value;
      if (!isValidTimeZone(value)) {
        issues.push(
          issue(
            'invalid-time-zone',
            property,
            line,
            value,
            '시간대는 Asia/Seoul 같은 유효한 IANA 시간대여야 합니다.',
          ),
        );
      }
      break;
    case '장소':
      item.place = value;
      break;
    case '소요 시간': {
      const durationMinutes = parseDurationMinutes(value);
      if (durationMinutes === null) {
        issues.push(
          issue(
            'invalid-duration',
            property,
            line,
            value,
            '소요 시간은 30분, 2시간 같은 양의 정수 시간으로 입력해야 합니다.',
          ),
        );
      } else {
        item.durationMinutes = durationMinutes;
      }
      break;
    }
    case '자료':
    case '출처': {
      const link = parseAuthoringLink(value);
      if (!link) {
        issues.push(
          issue(
            'invalid-url',
            property,
            line,
            value,
            `${property}는 https://… 또는 [이름](https://…) 형식이어야 합니다.`,
          ),
        );
      } else if (property === '자료') {
        item.resourceUrl = link.url;
        if (link.label) item.resourceLabel = link.label;
      } else {
        item.sourceUrl = link.url;
        if (link.label) item.sourceLabel = link.label;
      }
      break;
    }
    case '반복':
      item.recurrence = value;
      item.recurrenceSourceLine = line;
      break;
    case '반복 종료':
      item.recurrenceEnd = value;
      item.recurrenceEndSourceLine = line;
      break;
    case '실행 조건':
      item.executionCondition = mergeAuthoringText(
        item.executionCondition,
        value,
      );
      break;
    case '완료 기준':
      item.completionCriteria = mergeAuthoringText(
        item.completionCriteria,
        value,
      );
      break;
    case '안내':
      item.guide = mergeAuthoringText(item.guide, value);
      break;
    case '주의':
      item.caution = mergeAuthoringText(item.caution, value);
      break;
  }
}

/**
 * Parses only the explicit TXT grammar used by the approved templates.
 * Ordinary prose and memo lines remain source-only. Unsupported material is
 * recorded by the fidelity manifest and blocks materialization.
 */
export function parsePersonalWorkspacePocAuthoring(
  rawText: string,
): PersonalWorkspacePocAuthoringParseResult {
  const sourceFingerprint = fingerprintPersonalWorkspacePocAuthoringSource(rawText);
  const fidelity = analyzePersonalWorkspacePocAuthoringFidelity({
    rawText,
    sourceFingerprint,
  });
  const protectedLineNumbers = new Set(fidelity.protectedLineNumbers);
  const normalized = rawText.replace(/\r\n?/gu, '\n');
  const lines = normalized.split('\n');
  const issues: PersonalWorkspacePocAuthoringIssue[] = [];
  const items: MutableParsedItem[] = [];
  let title: string | undefined;
  let anchorDate: string | undefined;
  let sectionTitle: string | undefined;
  let activeItem: MutableParsedItem | undefined;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (protectedLineNumbers.has(lineNumber)) return;
    const heading = /^# (.*)$/u.exec(line);
    if (heading) {
      const value = heading[1].trim();
      if (value && !title) title = value;
      activeItem = undefined;
      return;
    }

    const section = /^## (.*)$/u.exec(line);
    if (section) {
      sectionTitle = section[1].trim() || undefined;
      activeItem = undefined;
      return;
    }

    const checkbox = /^- \[([ xX])\](?: (.*))?$/u.exec(line);
    if (checkbox) {
      const itemTitle = checkbox[2]?.trim() ?? '';
      if (!itemTitle) {
        activeItem = undefined;
        return;
      }
      activeItem = {
        sourceLine: lineNumber,
        sourceOrder: items.length,
        title: itemTitle,
        sourceChecked: checkbox[1].toLowerCase() === 'x',
        additionalDescriptions: [],
        subchecks: [],
        ...(sectionTitle ? { sectionTitle } : {}),
      };
      items.push(activeItem);
      return;
    }

    const subcheck = /^ {2}- \[([ xX])\](?:[ \t]+(.*))?$/u.exec(line);
    if (subcheck && activeItem) {
      const subcheckTitle = subcheck[2]?.trim() ?? '';
      if (!subcheckTitle) return;
      activeItem.subchecks.push({
        subcheckId: stableAuthoringId(
          'authoring-subcheck',
          activeItem.sourceLine,
          lineNumber,
          activeItem.subchecks.length,
        ),
        sourceLine: lineNumber,
        sourceOrder: activeItem.subchecks.length,
        title: subcheckTitle,
        sourceChecked: subcheck[1].toLowerCase() === 'x',
      });
      return;
    }

    const anchor = /^\s*- 기준일:\s*(.*)$/u.exec(line);
    if (anchor) {
      const value = anchor[1].trim();
      if (!value) return;
      if (!isValidIsoDate(value)) {
        issues.push(
          issue(
            'invalid-anchor-date',
            '기준일',
            lineNumber,
            value,
            '기준일은 실제 존재하는 YYYY-MM-DD 형식이어야 합니다.',
          ),
        );
        anchorDate = undefined;
      } else {
        anchorDate = value;
      }
      return;
    }

    const property = /^(?: {2,}|\t+)- (설명|상대 날짜|날짜|시간|시간대|장소|소요 시간|자료|출처|반복|반복 종료|실행 조건|완료 기준|안내|주의):\s*(.*)$/u.exec(
      line,
    );
    if (property && activeItem) {
      setItemProperty(
        activeItem,
        property[1] as Exclude<AuthoringProperty, '기준일'>,
        property[2].trim(),
        lineNumber,
        issues,
      );
      return;
    }

    const additionalDescription = /^ {2}- ([^:\r\n]+):[ \t]*(.*)$/u.exec(line);
    if (!additionalDescription || !activeItem) return;
    const label = additionalDescription[1].trim();
    const value = additionalDescription[2].trim();
    if (label && value) {
      activeItem.additionalDescriptions.push(`${label}: ${value}`);
    }
  });

  items.forEach((item) => {
    if (item.date && isValidIsoDate(item.date)) {
      item.resolvedDate = item.date;
      return;
    }
    if (!item.relativeDate) return;
    const offset = parseRelativeDateOffset(item.relativeDate);
    if (offset === null) return;
    if (!anchorDate) {
      issues.push(
        issue(
          'relative-date-requires-anchor',
          '상대 날짜',
          item.sourceLine,
          item.relativeDate,
          '상대 날짜를 저장하려면 유효한 기준일이 필요합니다.',
        ),
      );
      return;
    }
    item.resolvedDate = addUtcDays(anchorDate, offset);
  });

  items.forEach((item) => {
    if (!item.recurrence) {
      if (item.recurrenceEnd) {
        issues.push(issue(
          isValidRecurrenceEnd(item.recurrenceEnd)
            ? 'invalid-recurrence'
            : 'invalid-recurrence-end',
          '반복 종료',
          item.recurrenceEndSourceLine ?? item.sourceLine,
          item.recurrenceEnd,
          isValidRecurrenceEnd(item.recurrenceEnd)
            ? '반복 종료를 저장하려면 유효한 반복 규칙이 필요합니다.'
            : '반복 종료는 12회 또는 실제 존재하는 YYYY-MM-DD 형식이어야 합니다.',
        ));
      }
      return;
    }
    const parsed = parsePersonalWorkspacePocAuthoringRecurrence({
      raw: item.recurrence,
      ...(item.recurrenceEnd ? { recurrenceEnd: item.recurrenceEnd } : {}),
      ...(item.executionCondition
        ? { executionCondition: item.executionCondition }
        : {}),
    });
    if (parsed.ok) {
      if (!item.resolvedDate) {
        issues.push(issue(
          'invalid-recurrence',
          '반복',
          item.recurrenceSourceLine ?? item.sourceLine,
          item.recurrence,
          '반복 회차를 만들려면 항목에 유효한 날짜 또는 상대 날짜가 필요합니다.',
        ));
        return;
      }
      if (
        parsed.rule.end?.mode === 'until'
        && parsed.rule.end.date < item.resolvedDate
      ) {
        issues.push(issue(
          'invalid-recurrence',
          '반복 종료',
          item.recurrenceEndSourceLine ?? item.sourceLine,
          parsed.rule.end.raw,
          '반복 종료일은 반복 시작일보다 빠를 수 없습니다.',
        ));
        return;
      }
      item.recurrenceRule = parsed.rule;
      return;
    }
    issues.push(issue(
      parsed.reason === 'invalid-end'
        ? 'invalid-recurrence-end'
        : 'invalid-recurrence',
      parsed.reason === 'invalid-end' ? '반복 종료' : '반복',
      parsed.reason === 'invalid-end'
        ? item.recurrenceEndSourceLine ?? item.sourceLine
        : item.recurrenceSourceLine ?? item.sourceLine,
      parsed.reason === 'invalid-end'
        ? item.recurrenceEnd ?? ''
        : item.recurrence,
      parsed.reason === 'invalid-end'
        ? '반복 종료는 12회 또는 실제 존재하는 YYYY-MM-DD 형식이어야 합니다.'
        : '반복은 매일, 2일마다, 매주 월·수·금, 2주마다 화·목, 매월 15일 중 하나의 형식이어야 합니다.',
    ));
  });

  for (const entry of fidelity.manifest.entries) {
    if (issues.some((candidate) => candidate.line === entry.source.startLine)) {
      continue;
    }
    issues.push(issue(
      entry.code,
      'source',
      entry.source.startLine,
      entry.source.rawText,
      entry.message,
    ));
  }

  return {
    version: PERSONAL_WORKSPACE_POC_AUTHORING_VERSION,
    rawText,
    sourceFingerprint,
    parseResultId: stableAuthoringId('parse', sourceFingerprint),
    ...(title ? { title } : {}),
    ...(anchorDate ? { anchorDate } : {}),
    items: items.map((item) => {
      const {
        recurrenceSourceLine: _recurrenceSourceLine,
        recurrenceEndSourceLine: _recurrenceEndSourceLine,
        additionalDescriptions,
        subchecks,
        ...snapshot
      } = item;
      return {
        ...snapshot,
        ...(additionalDescriptions.length > 0 ? { additionalDescriptions } : {}),
        ...(subchecks.length > 0 ? { subchecks } : {}),
      };
    }),
    blockingIssues: issues,
    fidelityManifest: fidelity.manifest,
  };
}

export type PersonalWorkspacePocAuthoringLineage = Readonly<{
  source: 'text-authoring-poc-v1';
  handoffId: string;
  documentId: string;
  revisionId: string;
  parseResultId: string;
  sourceSnapshotId: string;
  sourceFingerprint: string;
  rawText: string;
  committedAt: string;
  templateId?: PersonalWorkspacePocAuthoringTemplateId;
  parsedItems: readonly PersonalWorkspacePocParsedAuthoringItem[];
  sourceLineItemIdentityMap?: PersonalWorkspacePocAuthoringSourceLineItemIdentityMap;
  fidelityManifest: PersonalWorkspacePocAuthoringFidelityManifest;
}>;

export type PersonalWorkspacePocAuthoringHandoff = Readonly<{
  handoffId: string;
  documentId: string;
  revisionId: string;
  parseResultId: string;
  destination: 'personal_flow';
  sourceSnapshotId: string;
  status: 'blocked' | 'ready';
  blockingIssues: readonly string[];
  lossFields: readonly string[];
  identityMap: Readonly<Record<string, string>>;
  fidelityManifest: PersonalWorkspacePocAuthoringFidelityManifest;
}>;

export type MaterializePersonalWorkspacePocAuthoringInput = Readonly<{
  handoffId: string;
  documentId: string;
  revisionId: string;
  rawText: string;
  committedAt: string;
  templateId?: PersonalWorkspacePocAuthoringTemplateId;
}>;

type PersonalWorkspacePocAuthoringMaterializationBase = Readonly<{
  rawText: string;
  sourceFingerprint: string;
  parseResult: PersonalWorkspacePocAuthoringParseResult;
  lineage: PersonalWorkspacePocAuthoringLineage;
  handoff: PersonalWorkspacePocAuthoringHandoff;
}>;

export type PersonalWorkspacePocAuthoringMaterialization =
  | (PersonalWorkspacePocAuthoringMaterializationBase & Readonly<{ ok: false }>)
  | (PersonalWorkspacePocAuthoringMaterializationBase &
      Readonly<{
        ok: true;
        flow: PersonalWorkspacePocAuthoredFlow;
      }>);

function materializationIssue(
  code: PersonalWorkspacePocAuthoringIssueCode,
  field: PersonalWorkspacePocAuthoringIssue['field'],
  value: string,
  message: string,
): PersonalWorkspacePocAuthoringIssue {
  return issue(code, field, 0, value, message);
}

function buildItemDescription(
  item: PersonalWorkspacePocParsedAuthoringItem,
): string | undefined {
  const lines = [
    item.description,
    ...(item.additionalDescriptions ?? []),
  ].filter((value): value is string => Boolean(value));
  return lines.length > 0 ? lines.join('\n') : undefined;
}

function buildTimingLabel(
  item: PersonalWorkspacePocParsedAuthoringItem,
): string | undefined {
  const values = [item.relativeDate, item.time, item.timeZone].filter(
    (value): value is string => Boolean(value),
  );
  return values.length > 0 ? values.join(' · ') : undefined;
}

function collectLossFields(): string[] {
  return [];
}

/**
 * Creates a deterministic, write-free handoff payload. The caller owns the
 * atomic state transaction that changes the handoff from ready to committed.
 */
export function materializePersonalWorkspacePocAuthoring(
  input: MaterializePersonalWorkspacePocAuthoringInput,
): PersonalWorkspacePocAuthoringMaterialization {
  const parseResult = parsePersonalWorkspacePocAuthoring(input.rawText);
  const blockingIssues = [...parseResult.blockingIssues];
  if (!input.handoffId.trim()) {
    blockingIssues.push(
      materializationIssue(
        'missing-handoff-id',
        'handoffId',
        input.handoffId,
        '저장 인계 식별자가 필요합니다.',
      ),
    );
  }
  if (!input.documentId.trim()) {
    blockingIssues.push(
      materializationIssue(
        'missing-document-id',
        'documentId',
        input.documentId,
        '작성 문서 식별자가 필요합니다.',
      ),
    );
  }
  if (!input.revisionId.trim()) {
    blockingIssues.push(
      materializationIssue(
        'missing-revision-id',
        'revisionId',
        input.revisionId,
        '작성 문서 리비전 식별자가 필요합니다.',
      ),
    );
  }
  if (!parseResult.title) {
    blockingIssues.push(
      materializationIssue(
        'missing-flow-title',
        'flow',
        '',
        '# 뒤에 Flow 제목을 입력해야 합니다.',
      ),
    );
  }
  if (parseResult.items.length === 0) {
    blockingIssues.push(
      materializationIssue(
        'missing-flow-items',
        'flow',
        '',
        '- [ ] 뒤에 실행 항목을 하나 이상 입력해야 합니다.',
      ),
    );
  }

  const sourceSnapshotId = stableAuthoringId(
    'source-snapshot',
    input.documentId,
    input.revisionId,
    parseResult.sourceFingerprint,
  );
  const lineage: PersonalWorkspacePocAuthoringLineage = {
    source: 'text-authoring-poc-v1',
    handoffId: input.handoffId,
    documentId: input.documentId,
    revisionId: input.revisionId,
    parseResultId: parseResult.parseResultId,
    sourceSnapshotId,
    sourceFingerprint: parseResult.sourceFingerprint,
    rawText: input.rawText,
    committedAt: input.committedAt,
    ...(input.templateId ? { templateId: input.templateId } : {}),
    parsedItems: parseResult.items,
    fidelityManifest: parseResult.fidelityManifest,
  };

  if (blockingIssues.length > 0) {
    const handoff: PersonalWorkspacePocAuthoringHandoff = {
      handoffId: input.handoffId,
      documentId: input.documentId,
      revisionId: input.revisionId,
      parseResultId: parseResult.parseResultId,
      destination: 'personal_flow',
      sourceSnapshotId,
      status: 'blocked',
      blockingIssues: blockingIssues.map((entry) => entry.code),
      lossFields: [],
      identityMap: {},
      fidelityManifest: parseResult.fidelityManifest,
    };
    return {
      ok: false,
      rawText: input.rawText,
      sourceFingerprint: parseResult.sourceFingerprint,
      parseResult: { ...parseResult, blockingIssues },
      lineage,
      handoff,
    };
  }

  const savedCopyId = stableAuthoringId('authoring-copy', input.handoffId);
  const flowId = stableAuthoringId('authoring-flow', input.handoffId);
  const flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
  const materializedSections = parseResult.fidelityManifest.sourceLines
    .filter((line) => line.kind === 'section' && line.support === 'supported')
    .flatMap((line, sourceOrder) => {
      const match = /^## (.*)$/u.exec(line.rawLine);
      const title = match?.[1].trim();
      return title
        ? [{
            sourceLine: line.line,
            sectionId: stableAuthoringId(
              'authoring-section',
              input.handoffId,
              line.line,
              title,
            ),
            title,
            sourceOrder,
            titleOwner: 'authoring' as const,
            editCapability: 'poc-shadow' as const,
          }]
        : [];
    });
  const identityMap: Record<string, string> = { flow: flowRef };
  for (const section of materializedSections) {
    identityMap[`section:line:${section.sourceLine}`] = section.sectionId;
  }
  const sourceLineItemIdentityMap: Record<
    string,
    PersonalWorkspacePocAuthoringSourceLineItemIdentityMap[string]
  > = {};
  const items: PersonalWorkspacePocFlowItem[] = parseResult.items.map(
    (parsedItem) => {
      const itemId = stableAuthoringId(
        'authoring-item',
        input.handoffId,
        parsedItem.sourceLine,
        parsedItem.sourceOrder,
      );
      const ref = toPersonalWorkspacePocFlowItemRef(
        savedCopyId,
        flowId,
        itemId,
      );
      identityMap[`item:line:${parsedItem.sourceLine}`] = ref;
      sourceLineItemIdentityMap[String(parsedItem.sourceLine)] = {
        sourceLine: parsedItem.sourceLine,
        itemRef: ref,
        savedCopyId,
        flowId,
        itemId,
      };
      const description = buildItemDescription(parsedItem);
      const sourceTimingLabel = buildTimingLabel(parsedItem);
      const owningSection = [...materializedSections]
        .reverse()
        .find((section) => (
          section.sourceLine < parsedItem.sourceLine
          && section.title === parsedItem.sectionTitle
        ));
      return {
        ref,
        savedCopyId,
        flowId,
        itemId,
        title: parsedItem.title,
        ...(description ? { description } : {}),
        ...(owningSection
          ? { sectionId: owningSection.sectionId, sectionTitle: owningSection.title }
          : {}),
        sourceOrder: parsedItem.sourceOrder,
        ...(parsedItem.resolvedDate
          ? { sourceDate: parsedItem.resolvedDate }
          : {}),
        ...(sourceTimingLabel ? { sourceTimingLabel } : {}),
      };
    },
  );
  const committedLineage: PersonalWorkspacePocAuthoringLineage = {
    ...lineage,
    sourceLineItemIdentityMap,
  };
  const flow: PersonalWorkspacePocAuthoredFlow = {
    ref: flowRef,
    savedCopyId,
    flowId,
    sourceSlug: stableAuthoringId('authoring-source', input.handoffId),
    title: parseResult.title as string,
    origin: 'authoring-handoff',
    ...(parseResult.anchorDate ? { anchorDate: parseResult.anchorDate } : {}),
    sections: materializedSections.map((section) => ({
      sectionId: section.sectionId,
      title: section.title,
      sourceOrder: section.sourceOrder,
      titleOwner: section.titleOwner,
      editCapability: section.editCapability,
    })),
    items,
    authoring: {
      source: 'text-authoring-poc-v1',
      handoffId: input.handoffId,
      documentId: input.documentId,
      revisionId: input.revisionId,
      parseResultId: parseResult.parseResultId,
      sourceSnapshotId,
      rawText: input.rawText,
      sourceFingerprint: parseResult.sourceFingerprint,
      ...(input.templateId ? { templateId: input.templateId } : {}),
      parsedItems: parseResult.items,
      sourceLineItemIdentityMap,
      fidelityManifest: parseResult.fidelityManifest,
      committedAt: input.committedAt,
    },
  };
  const lossFields = collectLossFields();
  const handoff: PersonalWorkspacePocAuthoringHandoff = {
    handoffId: input.handoffId,
    documentId: input.documentId,
    revisionId: input.revisionId,
    parseResultId: parseResult.parseResultId,
    destination: 'personal_flow',
    sourceSnapshotId,
    status: 'ready',
    blockingIssues: [],
    lossFields,
    identityMap,
    fidelityManifest: parseResult.fidelityManifest,
  };
  return {
    ok: true,
    rawText: input.rawText,
    sourceFingerprint: parseResult.sourceFingerprint,
    parseResult,
    lineage: committedLineage,
    handoff,
    flow,
  };
}
